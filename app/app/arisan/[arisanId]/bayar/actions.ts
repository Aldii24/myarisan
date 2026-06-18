"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { arisanGroups, memberships, payments, periods } from "@/db/schema";
import { parsePaymentProofWithAI } from "@/lib/ai/payment-proof-parser";
import { requireArisanMembership } from "@/lib/auth/user";
import { extractTextFromImage } from "@/lib/ocr";
import { savePaymentProofFile, validatePaymentProofFile } from "@/lib/storage";
import { canUseAutomaticProof, incrementProofUsage } from "@/lib/subscription";

export type UploadPaymentState = {
  detectedAmount?: number | null;
  error?: string;
  hasAiWarning?: boolean;
  status?: string;
  success?: string;
};

function parsePositiveAmount(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isInteger(amount) && amount > 0 ? amount : null;
}

export async function uploadPaymentProofAction(
  arisanId: string,
  _state: UploadPaymentState,
  formData: FormData,
): Promise<UploadPaymentState> {
  const { user, membership } = await requireArisanMembership(arisanId);

  if (membership.role !== "member") {
    return {
      error: "Admin bisa mengecek bukti dari halaman Konfirmasi Bukti.",
    };
  }

  const amount = parsePositiveAmount(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const proofFile = formData.get("proofImage");

  if (!amount) {
    return { error: "Nominal pembayaran harus diisi dengan angka." };
  }

  if (!(proofFile instanceof File)) {
    return { error: "Upload bukti pembayaran dulu." };
  }

  const validationError = validatePaymentProofFile(proofFile);

  if (validationError) {
    return { error: validationError };
  }

  const [activePeriod] = await db
    .select()
    .from(periods)
    .where(and(eq(periods.arisanGroupId, arisanId), eq(periods.status, "active")))
    .limit(1);

  if (!activePeriod) {
    return { error: "Periode aktif belum dibuat. Hubungi admin arisan." };
  }

  const [existingPayment] = await db
    .select({
      amount: payments.amount,
      proofImageHash: payments.proofImageHash,
      id: payments.id,
      status: payments.status,
    })
    .from(payments)
    .where(
      and(
        eq(payments.arisanGroupId, arisanId),
        eq(payments.periodId, activePeriod.id),
        eq(payments.memberUserId, user.id),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);

  if (existingPayment?.status === "confirmed") {
    return { error: "Pembayaran periode ini sudah diterima admin." };
  }

  const proofGate = await canUseAutomaticProof(arisanId);

  if (!proofGate.allowed) {
    if (proofGate.reason === "expired") {
      return {
        error:
          "Paket arisan ini belum aktif. Hubungi admin arisan agar bukti bisa diproses.",
      };
    }

    return {
      error:
        "Kuota baca bukti otomatis bulan ini habis. Pembayaran masih bisa dicatat manual oleh admin dari dashboard.",
    };
  }

  const storedFile = await savePaymentProofFile(proofFile);
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
    .select({
      amount: payments.amount,
      id: payments.id,
      memberUserId: payments.memberUserId,
      status: payments.status,
    })
    .from(payments)
    .where(
      and(
        eq(payments.arisanGroupId, arisanId),
        eq(payments.proofImageHash, storedFile.hash),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);

  if (sameHashPayment && sameHashPayment.id !== existingPayment?.id) {
    duplicateWarnings.push("Gambar bukti ini sama dengan bukti yang pernah diunggah.");
  }

  const [[group], memberRows] = await Promise.all([
    db
      .select({
        amountPerPeriod: arisanGroups.amountPerPeriod,
      })
      .from(arisanGroups)
      .where(eq(arisanGroups.id, arisanId))
      .limit(1),
    db
      .select({
        displayName: memberships.displayName,
      })
      .from(memberships)
      .where(
        and(eq(memberships.arisanGroupId, arisanId), eq(memberships.role, "member")),
      ),
  ]);
  const expectedAmount = group?.amountPerPeriod ?? amount;
  const ocrText = await extractTextFromImage(storedFile.publicPath);
  const aiResult = await parsePaymentProofWithAI({
    activePeriodName: activePeriod.name,
    arisanAmountPerPeriod: expectedAmount,
    duplicateWarnings,
    memberDisplayName: membership.displayName,
    memberNames: memberRows.map((member) => member.displayName),
    note,
    ocrText,
    submittedAmount: amount,
  });
  const aiResultJson = aiResult as unknown as Record<string, unknown>;
  const duplicateOfPaymentId =
    sameHashPayment && sameHashPayment.id !== existingPayment?.id
      ? sameHashPayment.id
      : null;

  if (existingPayment?.status === "rejected" || existingPayment?.status === "pending") {
    await db
      .update(payments)
      .set({
        amount,
        aiResultJson,
        confirmedAt: null,
        confirmedByUserId: null,
        duplicateOfPaymentId,
        note,
        ocrText,
        proofImageHash: storedFile.hash,
        proofImageUrl: storedFile.publicPath,
        status: "pending",
      })
      .where(eq(payments.id, existingPayment.id));
  } else {
    await db.insert(payments).values({
      aiResultJson,
      amount,
      arisanGroupId: arisanId,
      duplicateOfPaymentId,
      memberUserId: user.id,
      note,
      ocrText,
      periodId: activePeriod.id,
      proofImageHash: storedFile.hash,
      proofImageUrl: storedFile.publicPath,
      status: "pending",
    });
  }

  await incrementProofUsage(arisanId);

  revalidatePath(`/app/arisan/${arisanId}`);
  revalidatePath(`/app/arisan/${arisanId}/bayar`);
  revalidatePath(`/app/arisan/${arisanId}/payments`);

  const automaticReadFailed =
    aiResult.confidence === 0 &&
    !aiResult.detectedAmount &&
    aiResult.warnings.some(
      (warning) =>
        warning.includes("DEEPSEEK_API_KEY") ||
        warning.toLocaleLowerCase("id-ID").includes("ai") ||
        warning.toLocaleLowerCase("id-ID").includes("ocr"),
    );

  return {
    detectedAmount: aiResult.detectedAmount,
    hasAiWarning: aiResult.warnings.length > 0,
    status: "Menunggu Dicek Admin",
    success: automaticReadFailed
      ? "Bukti berhasil dikirim, tapi sistem belum bisa membaca otomatis. Admin tetap bisa mengecek manual."
      : "Bukti berhasil dikirim.",
  };
}
