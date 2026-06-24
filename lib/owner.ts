import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import {
  arisanGroups,
  invoices,
  plans,
  subscriptions,
  usageCounters,
  users,
} from "@/db/schema";
import { createAuditLog } from "@/lib/audit";
import {
  getPhoneLookupValues,
  requireUser,
} from "@/lib/auth/user";
import { addDays, getCurrentUsageMonth } from "@/lib/subscription";
import { notifyAdminInvoiceDecision } from "@/lib/whatsapp/notify-admin";

export function getOwnerPhones() {
  const ownerPhone = process.env.OWNER_PHONE?.trim();

  if (!ownerPhone) {
    return null;
  }

  return new Set(getPhoneLookupValues(ownerPhone));
}

export async function requireOwnerUser() {
  const user = await requireUser();
  const allowedPhones = getOwnerPhones();

  if (!allowedPhones) {
    return {
      error: "OWNER_PHONE belum diatur.",
      user: null,
    };
  }

  if (!allowedPhones.has(user.phone)) {
    redirect("/app");
  }

  return {
    error: null,
    user,
  };
}

// Owner check by userId, for surfaces without a web session (the WhatsApp bot).
// Returns false when OWNER_PHONE is unset so the bot never grants owner access
// by accident.
export async function isOwnerUserId(userId: string) {
  const allowedPhones = getOwnerPhones();

  if (!allowedPhones) {
    return false;
  }

  const [user] = await db
    .select({ phone: users.phone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return Boolean(user && allowedPhones.has(user.phone));
}

export type ApproveInvoiceResult =
  | {
      ok: true;
      arisanGroupId: string;
      arisanName: string;
      adminUserId: string;
      planName: string;
      amount: number;
      currentPeriodEnd: Date;
      extended: boolean;
    }
  | {
      ok: false;
      code: "not_found" | "already_paid";
      error: string;
    };

export type RejectInvoiceResult =
  | {
      ok: true;
      arisanGroupId: string;
      arisanName: string;
      adminUserId: string;
      planName: string;
      amount: number;
    }
  | {
      ok: false;
      code: "not_found" | "already_paid";
      error: string;
    };

async function getInvoiceWithContext(invoiceId: string) {
  const [row] = await db
    .select({
      invoice: invoices,
      arisanName: arisanGroups.name,
      planName: plans.name,
    })
    .from(invoices)
    .innerJoin(arisanGroups, eq(arisanGroups.id, invoices.arisanGroupId))
    .innerJoin(plans, eq(plans.id, invoices.planId))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  return row ?? null;
}

// Owner accepts a manual-QRIS invoice: mark it paid, then activate or extend the
// arisan subscription for 30 days and reset the month's proof counter. Shared by
// the owner dashboard action and the WhatsApp owner flow. Uses plain selects (no
// db.query) so it stays unit-testable against the fake db.
export async function approvePackageInvoice(input: {
  invoiceId: string;
  ownerUserId: string;
}): Promise<ApproveInvoiceResult> {
  const row = await getInvoiceWithContext(input.invoiceId);

  if (!row) {
    return { code: "not_found", error: "Tagihan paket tidak ditemukan.", ok: false };
  }

  const { invoice } = row;

  if (invoice.status === "paid") {
    return {
      code: "already_paid",
      error: "Tagihan paket ini sudah dibayar.",
      ok: false,
    };
  }

  const [existingSubscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.arisanGroupId, invoice.arisanGroupId))
    .limit(1);

  const now = new Date();
  const currentEnd = existingSubscription?.currentPeriodEnd;
  const isActiveOngoing =
    existingSubscription?.status === "active" && currentEnd && currentEnd > now;
  const extendFrom = isActiveOngoing ? currentEnd : now;
  const nextPeriodEnd = addDays(extendFrom, 30);
  const nextPeriodStart = isActiveOngoing
    ? existingSubscription.currentPeriodStart ?? now
    : now;

  const [updatedInvoice] = await db
    .update(invoices)
    .set({
      paidAt: now,
      status: "paid",
      verifiedByUserId: input.ownerUserId,
    })
    .where(and(eq(invoices.id, input.invoiceId), ne(invoices.status, "paid")))
    .returning();

  if (!updatedInvoice) {
    // Lost a race with another approval — treat as already paid.
    return {
      code: "already_paid",
      error: "Tagihan paket ini sudah dibayar.",
      ok: false,
    };
  }

  await db
    .insert(subscriptions)
    .values({
      adminUserId: invoice.adminUserId,
      arisanGroupId: invoice.arisanGroupId,
      currentPeriodEnd: nextPeriodEnd,
      currentPeriodStart: nextPeriodStart,
      planId: invoice.planId,
      status: "active",
    })
    .onConflictDoUpdate({
      target: subscriptions.arisanGroupId,
      set: {
        adminUserId: invoice.adminUserId,
        currentPeriodEnd: nextPeriodEnd,
        currentPeriodStart: nextPeriodStart,
        planId: invoice.planId,
        status: "active",
        updatedAt: now,
      },
    });

  const [planRow] = await db
    .select({ monthlyProofLimit: plans.monthlyProofLimit })
    .from(plans)
    .where(eq(plans.id, invoice.planId))
    .limit(1);

  const month = getCurrentUsageMonth(now);

  await db
    .insert(usageCounters)
    .values({
      arisanGroupId: invoice.arisanGroupId,
      month,
      proofLimit: planRow?.monthlyProofLimit ?? 0,
      proofUsed: 0,
    })
    .onConflictDoUpdate({
      target: [usageCounters.arisanGroupId, usageCounters.month],
      set: {
        proofLimit: planRow?.monthlyProofLimit ?? 0,
        updatedAt: now,
      },
    });

  await createAuditLog({
    action: "invoice.approve",
    actorUserId: input.ownerUserId,
    afterJson: {
      paidAt: updatedInvoice.paidAt,
      status: updatedInvoice.status,
    },
    arisanGroupId: invoice.arisanGroupId,
    beforeJson: {
      status: invoice.status,
    },
    entityId: invoice.id,
    entityType: "invoice",
  });

  await createAuditLog({
    action: existingSubscription ? "subscription.extend" : "subscription.activate",
    actorUserId: input.ownerUserId,
    afterJson: {
      currentPeriodEnd: nextPeriodEnd.toISOString(),
      currentPeriodStart: nextPeriodStart?.toISOString(),
      planId: invoice.planId,
      status: "active",
    },
    arisanGroupId: invoice.arisanGroupId,
    beforeJson: existingSubscription
      ? {
          currentPeriodEnd: existingSubscription.currentPeriodEnd?.toISOString(),
          planId: existingSubscription.planId,
          status: existingSubscription.status,
        }
      : undefined,
    entityId: invoice.arisanGroupId,
    entityType: "subscription",
  });

  // Let the buyer know their package is active. Best-effort — a notify failure
  // must not undo a completed approval.
  try {
    await notifyAdminInvoiceDecision({
      activeUntil: nextPeriodEnd,
      adminUserId: invoice.adminUserId,
      approved: true,
      arisanName: row.arisanName,
      planName: row.planName,
    });
  } catch (error) {
    console.error("Failed to notify admin of invoice approval", error);
  }

  return {
    adminUserId: invoice.adminUserId,
    amount: invoice.amount,
    arisanGroupId: invoice.arisanGroupId,
    arisanName: row.arisanName,
    currentPeriodEnd: nextPeriodEnd,
    extended: Boolean(existingSubscription),
    ok: true,
    planName: row.planName,
  };
}

export async function rejectPackageInvoice(input: {
  invoiceId: string;
  ownerUserId: string;
  reason?: string | null;
}): Promise<RejectInvoiceResult> {
  const row = await getInvoiceWithContext(input.invoiceId);

  if (!row) {
    return { code: "not_found", error: "Tagihan paket tidak ditemukan.", ok: false };
  }

  const { invoice } = row;

  if (invoice.status === "paid") {
    return {
      code: "already_paid",
      error: "Tagihan paket ini sudah dibayar.",
      ok: false,
    };
  }

  const [updatedInvoice] = await db
    .update(invoices)
    .set({
      rejectionReason: input.reason?.trim() || "Ditolak owner MyArisan.",
      status: "rejected",
      verifiedByUserId: input.ownerUserId,
    })
    .where(and(eq(invoices.id, input.invoiceId), ne(invoices.status, "paid")))
    .returning();

  if (!updatedInvoice) {
    return {
      code: "already_paid",
      error: "Tagihan paket ini sudah dibayar.",
      ok: false,
    };
  }

  await createAuditLog({
    action: "invoice.reject",
    actorUserId: input.ownerUserId,
    afterJson: {
      status: updatedInvoice.status,
    },
    arisanGroupId: invoice.arisanGroupId,
    beforeJson: {
      status: invoice.status,
    },
    entityId: invoice.id,
    entityType: "invoice",
  });

  // Tell the buyer their proof was rejected so they can re-upload.
  try {
    await notifyAdminInvoiceDecision({
      adminUserId: invoice.adminUserId,
      approved: false,
      arisanName: row.arisanName,
      planName: row.planName,
      reason: input.reason,
    });
  } catch (error) {
    console.error("Failed to notify admin of invoice rejection", error);
  }

  return {
    adminUserId: invoice.adminUserId,
    amount: invoice.amount,
    arisanGroupId: invoice.arisanGroupId,
    arisanName: row.arisanName,
    ok: true,
    planName: row.planName,
  };
}

// Invoices awaiting an owner decision (proof uploaded, not yet verified). Used by
// the WhatsApp owner flow; the dashboard builds its own richer query.
export async function getInvoicesAwaitingReview() {
  return db
    .select({
      adminName: users.name,
      adminPhone: users.phone,
      amount: invoices.amount,
      arisanName: arisanGroups.name,
      id: invoices.id,
      planName: plans.name,
    })
    .from(invoices)
    .innerJoin(users, eq(users.id, invoices.adminUserId))
    .innerJoin(arisanGroups, eq(arisanGroups.id, invoices.arisanGroupId))
    .innerJoin(plans, eq(plans.id, invoices.planId))
    .where(eq(invoices.status, "pending_verification"))
    .orderBy(desc(invoices.createdAt));
}
