"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArisanAdmin } from "@/lib/auth/user";
import {
  attachInvoiceProof,
  createPackageInvoice,
} from "@/lib/payments/package-invoice";

export type UploadInvoiceProofState = {
  error?: string;
  success?: string;
};

export async function choosePackageAction(arisanId: string, planId: string) {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    redirect(`/app/arisan/${arisanId}`);
  }

  const result = await createPackageInvoice({
    actorUserId: context.user.id,
    arisanId,
    planId,
  });

  if (!result.ok) {
    redirect(`/app/arisan/${arisanId}/paket`);
  }

  revalidatePath(`/app/arisan/${arisanId}/paket`);
  redirect(`/app/arisan/${arisanId}/paket/invoices/${result.invoiceId}`);
}

export async function uploadInvoiceProofAction(
  arisanId: string,
  invoiceId: string,
  _state: UploadInvoiceProofState,
  formData: FormData,
): Promise<UploadInvoiceProofState> {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return { error: "Hanya admin arisan yang bisa mengirim bukti paket." };
  }

  const proofFile = formData.get("proofImage");

  if (!(proofFile instanceof File)) {
    return { error: "Upload bukti pembayaran paket dulu." };
  }

  const result = await attachInvoiceProof({
    actorUserId: context.user.id,
    arisanId,
    file: proofFile,
    invoiceId,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/app/arisan/${arisanId}/paket`);
  revalidatePath(`/app/arisan/${arisanId}/paket/invoices/${invoiceId}`);
  revalidatePath("/owner");

  return {
    success:
      "Bukti pembayaran paket berhasil dikirim. Paket akan aktif setelah dicek admin MyArisan.",
  };
}
