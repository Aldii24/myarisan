import "server-only";

import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { payments } from "@/db/schema";

export type DuplicateReason = "image" | "reference" | "sender_amount";

export type DuplicateMatch = {
  paymentId: string;
  reasons: DuplicateReason[];
};

export type DuplicateProbe = {
  arisanId: string;
  periodId: string;
  memberUserId: string;
  // When resubmitting, the payment record being updated must not match itself.
  excludePaymentId?: string | null;
  proofImageHash: string | null;
  amount: number | null;
  detectedReferenceNo: string | null;
  detectedSenderName: string | null;
};

// Reasons in descending strength. Image reuse and a shared transaction
// reference are near-certain; the period+amount+sender heuristic is softer.
const reasonStrength: Record<DuplicateReason, number> = {
  image: 3,
  reference: 2,
  sender_amount: 1,
};

function normalizeReference(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^a-z0-9]/gi, "").toUpperCase();

  // Very short tokens (e.g. "1") cause false positives; require some length.
  return normalized.length >= 6 ? normalized : null;
}

function normalizeName(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("id-ID");

  return normalized.length >= 3 ? normalized : null;
}

function readString(json: Record<string, unknown> | null, key: string) {
  const value = json?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Looks for an existing payment in the same arisan that this proof likely
// duplicates. Rejected proofs are ignored — a resubmission after rejection is
// expected, not a duplicate. Returns the strongest single match, or null.
export async function findDuplicatePayment(
  probe: DuplicateProbe,
): Promise<DuplicateMatch | null> {
  const candidates = await db
    .select({
      id: payments.id,
      memberUserId: payments.memberUserId,
      periodId: payments.periodId,
      amount: payments.amount,
      proofImageHash: payments.proofImageHash,
      aiResultJson: payments.aiResultJson,
      status: payments.status,
    })
    .from(payments)
    .where(
      and(
        eq(payments.arisanGroupId, probe.arisanId),
        ne(payments.status, "rejected"),
      ),
    );

  const probeReference = normalizeReference(probe.detectedReferenceNo);
  const probeSender = normalizeName(probe.detectedSenderName);

  let best: DuplicateMatch | null = null;

  for (const candidate of candidates) {
    if (candidate.id === probe.excludePaymentId) {
      continue;
    }

    const reasons: DuplicateReason[] = [];

    if (
      probe.proofImageHash &&
      candidate.proofImageHash &&
      candidate.proofImageHash === probe.proofImageHash
    ) {
      reasons.push("image");
    }

    const candidateReference = normalizeReference(
      readString(candidate.aiResultJson, "detectedReferenceNo"),
    );

    if (probeReference && candidateReference && candidateReference === probeReference) {
      reasons.push("reference");
    }

    const candidateSender = normalizeName(
      readString(candidate.aiResultJson, "detectedSenderName"),
    );

    if (
      candidate.periodId === probe.periodId &&
      candidate.memberUserId !== probe.memberUserId &&
      probe.amount !== null &&
      candidate.amount === probe.amount &&
      probeSender &&
      candidateSender &&
      candidateSender === probeSender
    ) {
      reasons.push("sender_amount");
    }

    if (reasons.length === 0) {
      continue;
    }

    const topStrength = Math.max(...reasons.map((reason) => reasonStrength[reason]));
    const bestStrength = best
      ? Math.max(...best.reasons.map((reason) => reasonStrength[reason]))
      : 0;

    if (!best || topStrength > bestStrength) {
      best = { paymentId: candidate.id, reasons };
    }
  }

  return best;
}
