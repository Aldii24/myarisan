import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { arisanGroups, memberships, payments, periods } from "@/db/schema";
import {
  parsePaymentProofWithAI,
  type ParsedPaymentProof,
} from "@/lib/ai/payment-proof-parser";
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

export type CreatePaymentProofResult =
  | {
      adminUserId: string;
      arisanName: string;
      automaticReadFailed: boolean;
      detectedAmount: number | null;
      duplicateOfPaymentId: string | null;
      isDuplicate: boolean;
      memberDisplayName: string;
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

function paymentReadFailed(result: ParsedPaymentProof) {
  return (
    result.confidence === 0 &&
    !result.detectedAmount &&
    result.warnings.some((warning) => {
      const normalized = warning.toLocaleLowerCase("id-ID");

      return (
        warning.includes("DEEPSEEK_API_KEY") ||
        normalized.includes("ai") ||
        normalized.includes("ocr")
      );
    })
  );
}

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

  if (existingPayment?.status === "confirmed") {
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

  const [sameHashPayment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.arisanGroupId, input.arisanId),
        eq(payments.proofImageHash, storedFile.hash),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);

  if (sameHashPayment && sameHashPayment.id !== existingPayment?.id) {
    duplicateWarnings.push("Gambar bukti ini sama dengan bukti yang pernah diunggah.");
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
  const ocrText = await extractTextFromImage(
    Buffer.from(await input.file.arrayBuffer()),
  );
  const aiResult = await parsePaymentProofWithAI({
    activePeriodName: activePeriod.name,
    arisanAmountPerPeriod: group.amountPerPeriod,
    duplicateWarnings,
    memberDisplayName: membership.displayName,
    memberNames: memberRows.map((member) => member.displayName),
    note,
    ocrText,
    submittedAmount: amount,
  });

  // Authoritative duplicate check across the whole arisan, using both the image
  // hash and the AI-read reference number / sender name. Suspected duplicates
  // never auto-confirm — they go to a dedicated admin-review status.
  const duplicateMatch = await findDuplicatePayment({
    amount,
    arisanId: input.arisanId,
    detectedReferenceNo: aiResult.detectedReferenceNo,
    detectedSenderName: aiResult.detectedSenderName,
    excludePaymentId: existingPayment?.id ?? null,
    memberUserId: input.userId,
    periodId: activePeriod.id,
    proofImageHash: storedFile.hash,
  });
  const isDuplicate = Boolean(duplicateMatch);
  const duplicateOfPaymentId = duplicateMatch?.paymentId ?? null;

  if (duplicateMatch) {
    aiResult.warnings = Array.from(
      new Set([
        ...aiResult.warnings,
        duplicateNotice,
        ...duplicateMatch.reasons.map((reason) => duplicateReasonLabels[reason]),
      ]),
    );
  }

  const values = {
    aiResultJson: aiResult as unknown as Record<string, unknown>,
    amount,
    duplicateOfPaymentId,
    note,
    ocrText,
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

  revalidatePath(`/app/arisan/${input.arisanId}`);
  revalidatePath(`/app/arisan/${input.arisanId}/bayar`);
  revalidatePath(`/app/arisan/${input.arisanId}/payments`);

  return {
    adminUserId: group.adminUserId,
    arisanName: group.name,
    automaticReadFailed: paymentReadFailed(aiResult),
    detectedAmount: aiResult.detectedAmount,
    duplicateOfPaymentId,
    isDuplicate,
    memberDisplayName: membership.displayName,
    ok: true,
    paymentId,
    status: isDuplicate ? "duplicate_check" : "pending",
    warnings: paymentReadFailed(aiResult)
      ? Array.from(new Set([...aiResult.warnings, "Bukti perlu dicek manual."]))
      : aiResult.warnings,
  };
}
