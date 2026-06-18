"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { invoices } from "@/db/schema";
import { createAuditLog } from "@/lib/audit";
import { requireArisanAdmin } from "@/lib/auth/user";
import { saveInvoiceProofFile, validatePaymentProofFile } from "@/lib/storage";
import { getPlanById } from "@/lib/subscription";

export type UploadInvoiceProofState = {
  error?: string;
  success?: string;
};

export async function choosePackageAction(arisanId: string, planId: string) {
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    redirect(`/app/arisan/${arisanId}`);
  }

  const plan = await getPlanById(planId);

  if (!plan || plan.id === "free" || plan.price <= 0) {
    redirect(`/app/arisan/${arisanId}/paket`);
  }

  const [invoice] = await db
    .insert(invoices)
    .values({
      adminUserId: context.user.id,
      amount: plan.price,
      arisanGroupId: arisanId,
      paymentMethod: "manual_qris",
      planId: plan.id,
      status: "pending",
    })
    .returning();

  await createAuditLog({
    action: "invoice.create",
    actorUserId: context.user.id,
    afterJson: {
      amount: invoice.amount,
      planId: invoice.planId,
      status: invoice.status,
    },
    arisanGroupId: arisanId,
    entityId: invoice.id,
    entityType: "invoice",
  });

  revalidatePath(`/app/arisan/${arisanId}/paket`);
  redirect(`/app/arisan/${arisanId}/paket/invoices/${invoice.id}`);
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

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.arisanGroupId, arisanId)))
    .limit(1);

  if (!invoice) {
    return { error: "Tagihan paket tidak ditemukan." };
  }

  if (invoice.status === "paid") {
    return { error: "Tagihan paket ini sudah dibayar." };
  }

  const proofFile = formData.get("proofImage");

  if (!(proofFile instanceof File)) {
    return { error: "Upload bukti pembayaran paket dulu." };
  }

  const validationError = validatePaymentProofFile(proofFile);

  if (validationError) {
    return { error: validationError };
  }

  const storedFile = await saveInvoiceProofFile(proofFile);

  const [updatedInvoice] = await db
    .update(invoices)
    .set({
      proofImageUrl: storedFile.publicPath,
      rejectionReason: null,
      status: "pending_verification",
    })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.arisanGroupId, arisanId)))
    .returning();

  await createAuditLog({
    action: "invoice.proof_upload",
    actorUserId: context.user.id,
    afterJson: {
      proofImageUrl: updatedInvoice.proofImageUrl,
      status: updatedInvoice.status,
    },
    arisanGroupId: arisanId,
    beforeJson: {
      proofImageUrl: invoice.proofImageUrl,
      status: invoice.status,
    },
    entityId: invoiceId,
    entityType: "invoice",
  });

  revalidatePath(`/app/arisan/${arisanId}/paket`);
  revalidatePath(`/app/arisan/${arisanId}/paket/invoices/${invoiceId}`);
  revalidatePath("/owner");

  return {
    success:
      "Bukti pembayaran paket berhasil dikirim. Paket akan aktif setelah dicek admin MyArisan.",
  };
}
