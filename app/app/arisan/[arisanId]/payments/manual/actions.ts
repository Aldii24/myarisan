"use server";

import { revalidatePath } from "next/cache";

import { requireArisanAdmin } from "@/lib/auth/user";
import { recordManualPayment } from "@/lib/payments/manual-payment";

export type ManualPaymentState = {
  error?: string;
  success?: string;
};

function parsePositiveAmount(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isInteger(amount) && amount > 0 ? amount : null;
}

export async function recordManualPaymentAction(
  arisanId: string,
  _state: ManualPaymentState,
  formData: FormData,
): Promise<ManualPaymentState> {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return { error: "Hanya admin arisan yang bisa mencatat pembayaran manual." };
  }

  const memberUserId = String(formData.get("memberUserId") ?? "").trim();
  const amount = parsePositiveAmount(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!memberUserId) {
    return { error: "Pilih anggota yang mau dicatat pembayarannya." };
  }

  if (!amount) {
    return { error: "Nominal pembayaran harus diisi dengan angka." };
  }

  const result = await recordManualPayment({
    actorUserId: context.user.id,
    amount,
    arisanId,
    memberUserId,
    note,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/app/arisan/${arisanId}`);
  revalidatePath(`/app/arisan/${arisanId}/payments`);
  revalidatePath(`/app/arisan/${arisanId}/payments/manual`);

  return {
    success: `Pembayaran ${result.memberDisplayName} untuk ${result.periodName} dicatat sebagai Sudah Bayar.`,
  };
}
