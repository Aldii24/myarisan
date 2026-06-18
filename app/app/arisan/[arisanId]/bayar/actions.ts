"use server";

import { requireArisanMembership } from "@/lib/auth/user";
import { createPaymentProofFromUpload } from "@/lib/payments/create-payment-proof";

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

  const result = await createPaymentProofFromUpload({
    amount,
    arisanId,
    file: proofFile,
    note,
    userId: user.id,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return {
    detectedAmount: result.detectedAmount,
    hasAiWarning: result.warnings.length > 0,
    status: "Menunggu Dicek Admin",
    success: result.automaticReadFailed
      ? "Bukti berhasil dikirim, tapi sistem belum bisa membaca otomatis. Admin tetap bisa mengecek manual."
      : "Bukti berhasil dikirim.",
  };
}
