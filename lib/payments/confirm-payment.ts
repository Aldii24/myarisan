import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { memberships, payments, periods, type Payment } from "@/db/schema";
import { createAuditLog } from "@/lib/audit";
import { isSubscriptionExpired } from "@/lib/subscription";

export type ConfirmPaymentResult =
  | { ok: true; payment: Payment }
  | { ok: false; reason: "expired" | "not_found" };

// PRD §8.3: confirming a new payment is locked while the group's paid plan is
// expired. Surfaced to the admin so they renew before confirming.
export const expiredConfirmationMessage =
  "Paket arisan sudah habis. Perpanjang paket dulu untuk konfirmasi pembayaran baru.";

export type PendingPayment = {
  id: string;
  amount: number | null;
  memberName: string | null;
  periodName: string;
  createdAt: Date;
};

// Proofs awaiting an admin decision. duplicate_check is included because the
// PRD routes suspected duplicates to the same admin-review queue.
export async function getPendingPaymentsForArisan(
  arisanId: string,
): Promise<PendingPayment[]> {
  const rows = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      memberName: memberships.displayName,
      periodName: periods.name,
      createdAt: payments.createdAt,
      status: payments.status,
    })
    .from(payments)
    .innerJoin(periods, eq(periods.id, payments.periodId))
    .leftJoin(
      memberships,
      and(
        eq(memberships.arisanGroupId, payments.arisanGroupId),
        eq(memberships.userId, payments.memberUserId),
      ),
    )
    .where(eq(payments.arisanGroupId, arisanId))
    .orderBy(desc(payments.createdAt));

  return rows
    .filter(
      (row) => row.status === "pending" || row.status === "duplicate_check",
    )
    .map((row) => ({
      id: row.id,
      amount: row.amount,
      memberName: row.memberName,
      periodName: row.periodName,
      createdAt: row.createdAt,
    }));
}

async function loadPayment(arisanId: string, paymentId: string) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.arisanGroupId, arisanId)))
    .limit(1);

  return payment ?? null;
}

export async function confirmPaymentById(input: {
  arisanId: string;
  paymentId: string;
  amount: number;
  actorUserId: string;
}): Promise<ConfirmPaymentResult> {
  const existing = await loadPayment(input.arisanId, input.paymentId);

  if (!existing) {
    return { ok: false, reason: "not_found" };
  }

  if (await isSubscriptionExpired(input.arisanId)) {
    return { ok: false, reason: "expired" };
  }

  const [updated] = await db
    .update(payments)
    .set({
      amount: input.amount,
      confirmedAt: new Date(),
      confirmedByUserId: input.actorUserId,
      status: "confirmed",
    })
    .where(
      and(
        eq(payments.id, input.paymentId),
        eq(payments.arisanGroupId, input.arisanId),
      ),
    )
    .returning();

  await createAuditLog({
    action:
      existing.amount !== input.amount
        ? "payment.edit_amount_and_confirm"
        : "payment.confirm",
    actorUserId: input.actorUserId,
    afterJson: { amount: updated.amount, status: updated.status },
    arisanGroupId: input.arisanId,
    beforeJson: { amount: existing.amount, status: existing.status },
    entityId: input.paymentId,
    entityType: "payment",
  });

  return { ok: true, payment: updated };
}

export async function rejectPaymentById(input: {
  arisanId: string;
  paymentId: string;
  actorUserId: string;
}) {
  const existing = await loadPayment(input.arisanId, input.paymentId);

  if (!existing) {
    return null;
  }

  const [updated] = await db
    .update(payments)
    .set({
      confirmedAt: null,
      confirmedByUserId: null,
      status: "rejected",
    })
    .where(
      and(
        eq(payments.id, input.paymentId),
        eq(payments.arisanGroupId, input.arisanId),
      ),
    )
    .returning();

  await createAuditLog({
    action: "payment.reject",
    actorUserId: input.actorUserId,
    afterJson: { status: updated.status },
    arisanGroupId: input.arisanId,
    beforeJson: { status: existing.status },
    entityId: input.paymentId,
    entityType: "payment",
  });

  return updated;
}
