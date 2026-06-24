import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { db } from "@/db";
import {
  arisanGroups,
  dashboardNotifications,
  memberships,
  payments,
  periods,
} from "@/db/schema";
import { parsePaymentProofWithAI } from "@/lib/ai/payment-proof-parser";
import { isPaidStatus } from "@/lib/arisan";
import { extractTextFromImage } from "@/lib/ocr";
import {
  findDuplicatePayment,
  type DuplicateReason,
} from "@/lib/payments/detect-duplicate";
import { savePaymentProofFile, validatePaymentProofFile } from "@/lib/storage";
import { canUseAutomaticProof, incrementProofUsage } from "@/lib/subscription";

// PRD §14.5 duplicate message, surfaced to admin review.
const duplicateNotice = "Bukti ini mirip dengan pembayaran yang sudah pernah dikirim.";

const duplicateReasonLabels: Record<DuplicateReason, string> = {
  image: "Gambar bukti sama dengan bukti yang pernah diunggah.",
  reference: "Nomor referensi transaksi sama dengan bukti lain.",
  sender_amount:
    "Nominal dan nama pengirim sama dengan bukti anggota lain di periode ini.",
};

// Notify the arisan admin in their dashboard whenever a member submits a proof,
// regardless of source (web upload or WhatsApp). The WhatsApp handler still adds
// its own in-window WhatsApp message on top of this; this insert is the
// dashboard fallback every path shares (PRD §10.3 / §12.4).
async function notifyAdminOfProof(input: {
  adminUserId: string;
  arisanId: string;
  arisanName: string;
  isDuplicate: boolean;
  memberDisplayName: string;
}) {
  const duplicateHint = input.isDuplicate
    ? " Bukti ini mirip dengan pembayaran yang sudah pernah dikirim."
    : "";

  try {
    await db.insert(dashboardNotifications).values({
      arisanGroupId: input.arisanId,
      message: `${input.memberDisplayName} mengirim bukti pembayaran. Status: Menunggu Dicek.${duplicateHint}`,
      title: `Bukti baru · ${input.arisanName}`,
      type: "payment_proof",
      userId: input.adminUserId,
    });
  } catch (error) {
    console.error("Failed to create admin payment notification", error);
  }
}

export type CreatePaymentProofResult =
  | {
      adminUserId: string;
      arisanName: string;
      automaticReadFailed: boolean;
      detectedAmount: number | null;
      duplicateOfPaymentId: string | null;
      isDuplicate: boolean;
      memberDisplayName: string;
      notifyAdmin: boolean;
      ok: true;
      paymentId: string;
      status: "duplicate_check" | "pending";
      warnings: string[];
    }
  | {
      code:
        | "already_confirmed"
        | "expired"
        | "invalid_amount"
        | "invalid_file"
        | "no_active_period"
        | "not_member"
        | "quota"
        | "storage_failed";
      error: string;
      ok: false;
    };

export async function createPaymentProofFromUpload(input: {
  amount?: number | null;
  arisanId: string;
  file: File;
  note?: string | null;
  userId: string;
}): Promise<CreatePaymentProofResult> {
  const [membership] = await db
    .select({
      displayName: memberships.displayName,
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.arisanGroupId, input.arisanId),
        eq(memberships.userId, input.userId),
        eq(memberships.role, "member"),
        eq(memberships.joinStatus, "claimed"),
      ),
    )
    .limit(1);

  if (!membership) {
    return {
      code: "not_member",
      error: "Hanya anggota yang sudah bergabung yang bisa mengirim bukti.",
      ok: false,
    };
  }

  const validationError = validatePaymentProofFile(input.file);

  if (validationError) {
    return { code: "invalid_file", error: validationError, ok: false };
  }

  const [[group], [activePeriod]] = await Promise.all([
    db
      .select({
        adminUserId: arisanGroups.adminUserId,
        amountPerPeriod: arisanGroups.amountPerPeriod,
        name: arisanGroups.name,
      })
      .from(arisanGroups)
      .where(eq(arisanGroups.id, input.arisanId))
      .limit(1),
    db
      .select()
      .from(periods)
      .where(
        and(
          eq(periods.arisanGroupId, input.arisanId),
          eq(periods.status, "active"),
        ),
      )
      .limit(1),
  ]);

  if (!group || !activePeriod) {
    return {
      code: "no_active_period",
      error: "Periode aktif belum dibuat. Hubungi admin arisan.",
      ok: false,
    };
  }

  const amount = input.amount ?? group.amountPerPeriod;

  if (!Number.isInteger(amount) || amount <= 0) {
    return {
      code: "invalid_amount",
      error: "Nominal pembayaran harus diisi dengan angka.",
      ok: false,
    };
  }

  const [existingPayment] = await db
    .select({
      amount: payments.amount,
      id: payments.id,
      status: payments.status,
    })
    .from(payments)
    .where(
      and(
        eq(payments.arisanGroupId, input.arisanId),
        eq(payments.periodId, activePeriod.id),
        eq(payments.memberUserId, input.userId),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);

  if (isPaidStatus(existingPayment?.status)) {
    return {
      code: "already_confirmed",
      error: "Pembayaran periode ini sudah diterima admin.",
      ok: false,
    };
  }

  const proofGate = await canUseAutomaticProof(input.arisanId);

  if (!proofGate.allowed) {
    if (proofGate.reason === "expired") {
      return {
        code: "expired",
        error:
          "Paket arisan ini belum aktif. Hubungi admin arisan agar bukti bisa diproses.",
        ok: false,
      };
    }

    return {
      code: "quota",
      error:
        "Kuota baca bukti otomatis bulan ini habis. Hubungi admin arisan untuk mencatat pembayaran secara manual.",
      ok: false,
    };
  }

  let storedFile;

  try {
    storedFile = await savePaymentProofFile(input.file);
  } catch (error) {
    console.error("Failed to store payment proof", error);

    return {
      code: "storage_failed",
      error: "Bukti belum bisa disimpan. Coba kirim ulang beberapa saat lagi.",
      ok: false,
    };
  }

  const duplicateWarnings: string[] = [];

  if (existingPayment?.status === "pending") {
    duplicateWarnings.push(
      "Ada bukti sebelumnya untuk anggota dan periode ini; unggahan terbaru menggantikan bukti lama.",
    );
  }

  if (existingPayment?.status === "rejected") {
    duplicateWarnings.push("Bukti sebelumnya ditolak; anggota mengirim ulang bukti.");
  }

  if (existingPayment?.amount === amount) {
    duplicateWarnings.push("Nominal sama dengan bukti sebelumnya.");
  }

  const memberRows = await db
    .select({ displayName: memberships.displayName })
    .from(memberships)
    .where(
      and(
        eq(memberships.arisanGroupId, input.arisanId),
        eq(memberships.role, "member"),
      ),
    );
  const note = input.note?.trim() || null;
  const proofBytes = Buffer.from(await input.file.arrayBuffer());

  // Synchronous duplicate check by image hash only — a cheap DB query that gives
  // an immediate signal when the exact same screenshot was already uploaded. The
  // AI-driven reference/sender checks run later in enrichPaymentProof.
  const hashDuplicate = await findDuplicatePayment({
    amount,
    arisanId: input.arisanId,
    detectedReferenceNo: null,
    detectedSenderName: null,
    excludePaymentId: existingPayment?.id ?? null,
    memberUserId: input.userId,
    periodId: activePeriod.id,
    proofImageHash: storedFile.hash,
  });
  const isDuplicate = Boolean(hashDuplicate);
  const duplicateOfPaymentId = hashDuplicate?.paymentId ?? null;
  const syncWarnings = hashDuplicate
    ? Array.from(
        new Set([
          ...duplicateWarnings,
          duplicateNotice,
          ...hashDuplicate.reasons.map((reason) => duplicateReasonLabels[reason]),
        ]),
      )
    : duplicateWarnings;

  // Persist the payment NOW, before any OCR/AI. The heavy reading runs in the
  // background (see enrichPaymentProof). This is what makes the request return
  // in ~1-2s instead of timing out (504) during OCR on serverless hosts, while
  // still guaranteeing the proof is recorded and the admin is notified.
  const values = {
    aiResultJson: null,
    amount,
    duplicateOfPaymentId,
    note,
    ocrText: null,
    proofImageHash: storedFile.hash,
    proofImageUrl: storedFile.publicPath,
    status: isDuplicate ? ("duplicate_check" as const) : ("pending" as const),
  };
  let paymentId: string;

  if (
    existingPayment?.status === "rejected" ||
    existingPayment?.status === "pending" ||
    existingPayment?.status === "duplicate_check"
  ) {
    const [updatedPayment] = await db
      .update(payments)
      .set({
        ...values,
        confirmedAt: null,
        confirmedByUserId: null,
      })
      .where(eq(payments.id, existingPayment.id))
      .returning({ id: payments.id });

    paymentId = updatedPayment.id;
  } else {
    const [createdPayment] = await db
      .insert(payments)
      .values({
        ...values,
        arisanGroupId: input.arisanId,
        memberUserId: input.userId,
        periodId: activePeriod.id,
      })
      .returning({ id: payments.id });

    paymentId = createdPayment.id;
  }

  await incrementProofUsage(input.arisanId);

  // Notify the admin for a new submission or a resubmission after a rejection,
  // but stay quiet when the member re-uploads a proof that is still awaiting
  // review (pending / duplicate_check) — that proof already produced an unread
  // notification, so re-pinging both channels would just be noise.
  const shouldNotifyAdmin =
    existingPayment?.status !== "pending" &&
    existingPayment?.status !== "duplicate_check";

  if (shouldNotifyAdmin) {
    await notifyAdminOfProof({
      adminUserId: group.adminUserId,
      arisanId: input.arisanId,
      arisanName: group.name,
      isDuplicate,
      memberDisplayName: membership.displayName,
    });
  }

  revalidatePath(`/app/arisan/${input.arisanId}`);
  revalidatePath(`/app/arisan/${input.arisanId}/bayar`);
  revalidatePath(`/app/arisan/${input.arisanId}/payments`);

  // Read the proof image (OCR) and parse it (AI) AFTER the response is sent.
  // On Vercel `after` extends the invocation via waitUntil up to the route's
  // maxDuration; failures here are logged and never affect the recorded payment.
  after(() =>
    enrichPaymentProof({
      activePeriodName: activePeriod.name,
      arisanAmountPerPeriod: group.amountPerPeriod,
      arisanId: input.arisanId,
      baseDuplicateWarnings: duplicateWarnings,
      memberDisplayName: membership.displayName,
      memberNames: memberRows.map((member) => member.displayName),
      memberUserId: input.userId,
      note,
      paymentId,
      periodId: activePeriod.id,
      proofBytes,
      submittedAmount: amount,
    }),
  );

  return {
    adminUserId: group.adminUserId,
    arisanName: group.name,
    automaticReadFailed: false,
    detectedAmount: null,
    duplicateOfPaymentId,
    isDuplicate,
    memberDisplayName: membership.displayName,
    notifyAdmin: shouldNotifyAdmin,
    ok: true,
    paymentId,
    status: isDuplicate ? "duplicate_check" : "pending",
    warnings: syncWarnings,
  };
}

// Best-effort OCR + AI enrichment of a stored payment proof. Runs in the
// background (via `after`) so it never blocks or fails the user's submission.
// Re-reads the payment and only writes back if it is still awaiting review, so a
// concurrent admin confirm/reject is never overwritten.
export async function enrichPaymentProof(input: {
  activePeriodName: string | null;
  arisanAmountPerPeriod: number;
  arisanId: string;
  baseDuplicateWarnings: string[];
  memberDisplayName: string;
  memberNames: string[];
  memberUserId: string;
  note: string | null;
  paymentId: string;
  periodId: string;
  proofBytes: Buffer;
  submittedAmount: number;
}) {
  try {
    const [current] = await db
      .select({
        proofImageHash: payments.proofImageHash,
        status: payments.status,
      })
      .from(payments)
      .where(eq(payments.id, input.paymentId))
      .limit(1);

    if (
      !current ||
      (current.status !== "pending" && current.status !== "duplicate_check")
    ) {
      return;
    }

    const ocrText = await extractTextFromImage(input.proofBytes);
    const aiResult = await parsePaymentProofWithAI({
      activePeriodName: input.activePeriodName,
      arisanAmountPerPeriod: input.arisanAmountPerPeriod,
      duplicateWarnings: input.baseDuplicateWarnings,
      memberDisplayName: input.memberDisplayName,
      memberNames: input.memberNames,
      note: input.note,
      ocrText,
      submittedAmount: input.submittedAmount,
    });

    // Authoritative duplicate check across the whole arisan, now using the
    // AI-read reference number / sender name on top of the image hash.
    const duplicateMatch = await findDuplicatePayment({
      amount: input.submittedAmount,
      arisanId: input.arisanId,
      detectedReferenceNo: aiResult.detectedReferenceNo,
      detectedSenderName: aiResult.detectedSenderName,
      excludePaymentId: input.paymentId,
      memberUserId: input.memberUserId,
      periodId: input.periodId,
      proofImageHash: current.proofImageHash,
    });
    const isDuplicate = Boolean(duplicateMatch);

    if (duplicateMatch) {
      aiResult.warnings = Array.from(
        new Set([
          ...aiResult.warnings,
          duplicateNotice,
          ...duplicateMatch.reasons.map((reason) => duplicateReasonLabels[reason]),
        ]),
      );
    }

    await db
      .update(payments)
      .set({
        aiResultJson: aiResult as unknown as Record<string, unknown>,
        duplicateOfPaymentId: duplicateMatch?.paymentId ?? null,
        ocrText,
        status: isDuplicate ? "duplicate_check" : "pending",
      })
      .where(
        and(
          eq(payments.id, input.paymentId),
          inArray(payments.status, ["pending", "duplicate_check"]),
        ),
      );
  } catch (error) {
    console.error("Failed to enrich payment proof", input.paymentId, error);
  }
}
