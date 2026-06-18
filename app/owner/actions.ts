"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { invoices, subscriptions, usageCounters } from "@/db/schema";
import { createAuditLog } from "@/lib/audit";
import { requireOwnerUser } from "@/lib/owner";
import { addDays, getCurrentUsageMonth } from "@/lib/subscription";

async function requireOwnerForAction() {
  const owner = await requireOwnerUser();

  if (owner.error || !owner.user) {
    redirect("/owner");
  }

  return owner.user;
}

export async function approveInvoiceAction(invoiceId: string) {
  const owner = await requireOwnerForAction();

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoice || invoice.status === "paid") {
    redirect("/owner");
  }

  const [existingSubscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.arisanGroupId, invoice.arisanGroupId))
    .limit(1);

  const now = new Date();
  const currentEnd = existingSubscription?.currentPeriodEnd;
  const extendFrom =
    existingSubscription?.status === "active" && currentEnd && currentEnd > now
      ? currentEnd
      : now;
  const nextPeriodEnd = addDays(extendFrom, 30);
  const nextPeriodStart =
    existingSubscription?.status === "active" && currentEnd && currentEnd > now
      ? existingSubscription.currentPeriodStart ?? now
      : now;

  const [updatedInvoice] = await db
    .update(invoices)
    .set({
      paidAt: now,
      status: "paid",
      verifiedByUserId: owner.id,
    })
    .where(and(eq(invoices.id, invoiceId), ne(invoices.status, "paid")))
    .returning();

  if (!updatedInvoice) {
    redirect("/owner");
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

  const [planRow] = await db.query.plans.findMany({
    columns: {
      monthlyProofLimit: true,
    },
    where: (plans, { eq }) => eq(plans.id, invoice.planId),
    limit: 1,
  });

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
    actorUserId: owner.id,
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
    actorUserId: owner.id,
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

  revalidatePath("/owner");
  revalidatePath(`/app/arisan/${invoice.arisanGroupId}`);
  revalidatePath(`/app/arisan/${invoice.arisanGroupId}/paket`);
  redirect("/owner");
}

export async function rejectInvoiceAction(invoiceId: string) {
  const owner = await requireOwnerForAction();

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoice || invoice.status === "paid") {
    redirect("/owner");
  }

  const [updatedInvoice] = await db
    .update(invoices)
    .set({
      rejectionReason: "Ditolak owner MyArisan.",
      status: "rejected",
      verifiedByUserId: owner.id,
    })
    .where(and(eq(invoices.id, invoiceId), ne(invoices.status, "paid")))
    .returning();

  if (updatedInvoice) {
    await createAuditLog({
      action: "invoice.reject",
      actorUserId: owner.id,
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
  }

  revalidatePath("/owner");
  revalidatePath(`/app/arisan/${invoice.arisanGroupId}/paket`);
  redirect("/owner");
}
