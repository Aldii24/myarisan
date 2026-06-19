import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { memberships, payments, periods } from "@/db/schema";
import { isPaidStatus } from "@/lib/arisan";
import { createAuditLog } from "@/lib/audit";
import { isSubscriptionExpired } from "@/lib/subscription";

export type RecordManualPaymentResult =
  | {
      ok: true;
      paymentId: string;
      memberDisplayName: string;
      amount: number;
      periodName: string;
    }
  | {
      ok: false;
      code:
        | "already_paid"
        | "expired"
        | "invalid_amount"
        | "no_active_period"
        | "not_member";
      error: string;
    };

// Admin-recorded payment with no proof image — the PRD §7.3 fallback for when
// the automatic-proof quota is exhausted. Never runs OCR/AI and never consumes
// proof quota. The member must have a claimed account (the payment model keys
// on memberUserId), so unjoined members must claim their name first.
export async function recordManualPayment(input: {
  arisanId: string;
  memberUserId: string;
  amount: number;
  note?: string | null;
  actorUserId: string;
}): Promise<RecordManualPaymentResult> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return {
      code: "invalid_amount",
      error: "Nominal pembayaran harus diisi dengan angka.",
      ok: false,
    };
  }

  // PRD §8.3: recording a payment is a confirmation, locked while expired.
  if (await isSubscriptionExpired(input.arisanId)) {
    return {
      code: "expired",
      error:
        "Paket arisan sudah habis. Perpanjang paket dulu untuk mencatat pembayaran.",
      ok: false,
    };
  }

  const [member] = await db
    .select({ displayName: memberships.displayName })
    .from(memberships)
    .where(
      and(
        eq(memberships.arisanGroupId, input.arisanId),
        eq(memberships.userId, input.memberUserId),
        eq(memberships.role, "member"),
        ne(memberships.joinStatus, "removed"),
      ),
    )
    .limit(1);

  if (!member) {
    return {
      code: "not_member",
      error: "Anggota tidak ditemukan di arisan ini.",
      ok: false,
    };
  }

  const [activePeriod] = await db
    .select({ id: periods.id, name: periods.name })
    .from(periods)
    .where(and(eq(periods.arisanGroupId, input.arisanId), eq(periods.status, "active")))
    .limit(1);

  if (!activePeriod) {
    return {
      code: "no_active_period",
      error: "Periode aktif belum dibuat.",
      ok: false,
    };
  }

  const [existingPayment] = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      status: payments.status,
    })
    .from(payments)
    .where(
      and(
        eq(payments.arisanGroupId, input.arisanId),
        eq(payments.periodId, activePeriod.id),
        eq(payments.memberUserId, input.memberUserId),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);

  if (existingPayment && isPaidStatus(existingPayment.status)) {
    return {
      code: "already_paid",
      error: `Pembayaran ${member.displayName} untuk ${activePeriod.name} sudah tercatat.`,
      ok: false,
    };
  }

  const note = input.note?.trim() || "Dicatat manual oleh admin.";
  const now = new Date();
  let paymentId: string;

  if (existingPayment) {
    const [updated] = await db
      .update(payments)
      .set({
        amount: input.amount,
        confirmedAt: now,
        confirmedByUserId: input.actorUserId,
        note,
        status: "manual",
      })
      .where(eq(payments.id, existingPayment.id))
      .returning({ id: payments.id });

    paymentId = updated.id;
  } else {
    const [created] = await db
      .insert(payments)
      .values({
        amount: input.amount,
        arisanGroupId: input.arisanId,
        confirmedAt: now,
        confirmedByUserId: input.actorUserId,
        memberUserId: input.memberUserId,
        note,
        periodId: activePeriod.id,
        status: "manual",
      })
      .returning({ id: payments.id });

    paymentId = created.id;
  }

  await createAuditLog({
    action: "payment.manual_entry",
    actorUserId: input.actorUserId,
    afterJson: { amount: input.amount, status: "manual" },
    arisanGroupId: input.arisanId,
    beforeJson: existingPayment
      ? { amount: existingPayment.amount, status: existingPayment.status }
      : undefined,
    entityId: paymentId,
    entityType: "payment",
  });

  return {
    amount: input.amount,
    memberDisplayName: member.displayName,
    ok: true,
    paymentId,
    periodName: activePeriod.name,
  };
}

// Claimed members eligible for manual entry, plus whether they already have a
// payment recorded for the active period.
export async function getManualPaymentMembers(arisanId: string) {
  const [activePeriod] = await db
    .select({ id: periods.id })
    .from(periods)
    .where(and(eq(periods.arisanGroupId, arisanId), eq(periods.status, "active")))
    .limit(1);

  const memberRows = await db
    .select({
      displayName: memberships.displayName,
      userId: memberships.userId,
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.arisanGroupId, arisanId),
        eq(memberships.role, "member"),
        eq(memberships.joinStatus, "claimed"),
        ne(memberships.joinStatus, "removed"),
      ),
    )
    .orderBy(memberships.displayName);

  const paidUserIds = new Set<string>();

  if (activePeriod) {
    const periodPayments = await db
      .select({ memberUserId: payments.memberUserId, status: payments.status })
      .from(payments)
      .where(
        and(
          eq(payments.arisanGroupId, arisanId),
          eq(payments.periodId, activePeriod.id),
        ),
      );

    for (const payment of periodPayments) {
      if (payment.memberUserId && isPaidStatus(payment.status)) {
        paidUserIds.add(payment.memberUserId);
      }
    }
  }

  return memberRows
    .filter((member): member is { displayName: string; userId: string } =>
      Boolean(member.userId),
    )
    .map((member) => ({
      displayName: member.displayName,
      userId: member.userId,
      alreadyPaid: paidUserIds.has(member.userId),
    }));
}
