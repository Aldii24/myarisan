import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { invoices } from "@/db/schema";
import { createAuditLog } from "@/lib/audit";
import { saveInvoiceProofFile, validatePaymentProofFile } from "@/lib/storage";
import { getPlanById } from "@/lib/subscription";

// Shared manual-QRIS package invoice core, used by both the dashboard Paket
// actions and the WhatsApp `paket` flow. Keeps invoice creation and proof
// attachment identical across surfaces (see WhatsApp-first parity principle).

export type CreatePackageInvoiceResult =
  | {
      ok: true;
      invoiceId: string;
      planId: string;
      planName: string;
      amount: number;
    }
  | {
      ok: false;
      code: "invalid_plan";
      error: string;
    };

export type AttachInvoiceProofResult =
  | {
      ok: true;
      invoiceId: string;
      status: "pending_verification";
    }
  | {
      ok: false;
      code: "not_found" | "already_paid" | "invalid_file";
      error: string;
    };

// Creates a fresh manual-QRIS invoice for a paid plan. Free plan and zero-price
// plans are rejected — they never need payment.
export async function createPackageInvoice(input: {
  arisanId: string;
  planId: string;
  actorUserId: string;
}): Promise<CreatePackageInvoiceResult> {
  const plan = await getPlanById(input.planId);

  if (!plan || plan.id === "free" || plan.price <= 0) {
    return {
      code: "invalid_plan",
      error: "Paket tidak ditemukan atau tidak butuh pembayaran.",
      ok: false,
    };
  }

  const [invoice] = await db
    .insert(invoices)
    .values({
      adminUserId: input.actorUserId,
      amount: plan.price,
      arisanGroupId: input.arisanId,
      paymentMethod: "manual_qris",
      planId: plan.id,
      status: "pending",
    })
    .returning();

  await createAuditLog({
    action: "invoice.create",
    actorUserId: input.actorUserId,
    afterJson: {
      amount: invoice.amount,
      planId: invoice.planId,
      status: invoice.status,
    },
    arisanGroupId: input.arisanId,
    entityId: invoice.id,
    entityType: "invoice",
  });

  return {
    amount: invoice.amount,
    invoiceId: invoice.id,
    ok: true,
    planId: plan.id,
    planName: plan.name,
  };
}

// Attaches a QRIS proof image to an invoice and moves it to
// pending_verification. Clears any prior rejection reason so a re-upload after
// rejection works (PRD §12.5).
export async function attachInvoiceProof(input: {
  arisanId: string;
  invoiceId: string;
  file: File;
  actorUserId: string;
}): Promise<AttachInvoiceProofResult> {
  const validationError = validatePaymentProofFile(input.file);

  if (validationError) {
    return { code: "invalid_file", error: validationError, ok: false };
  }

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, input.invoiceId),
        eq(invoices.arisanGroupId, input.arisanId),
      ),
    )
    .limit(1);

  if (!invoice) {
    return {
      code: "not_found",
      error: "Tagihan paket tidak ditemukan.",
      ok: false,
    };
  }

  if (invoice.status === "paid") {
    return {
      code: "already_paid",
      error: "Tagihan paket ini sudah dibayar.",
      ok: false,
    };
  }

  const storedFile = await saveInvoiceProofFile(input.file);

  const [updatedInvoice] = await db
    .update(invoices)
    .set({
      proofImageUrl: storedFile.publicPath,
      rejectionReason: null,
      status: "pending_verification",
    })
    .where(
      and(
        eq(invoices.id, input.invoiceId),
        eq(invoices.arisanGroupId, input.arisanId),
      ),
    )
    .returning();

  await createAuditLog({
    action: "invoice.proof_upload",
    actorUserId: input.actorUserId,
    afterJson: {
      proofImageUrl: updatedInvoice.proofImageUrl,
      status: updatedInvoice.status,
    },
    arisanGroupId: input.arisanId,
    beforeJson: {
      proofImageUrl: invoice.proofImageUrl,
      status: invoice.status,
    },
    entityId: input.invoiceId,
    entityType: "invoice",
  });

  return {
    invoiceId: input.invoiceId,
    ok: true,
    status: "pending_verification",
  };
}

// The most recent invoice still awaiting payment/proof for an arisan, if any.
// Used by the WhatsApp flow so a re-sent photo lands on the open invoice instead
// of silently creating duplicates.
export async function getOpenPackageInvoice(arisanId: string) {
  const [invoice] = await db
    .select({
      id: invoices.id,
      amount: invoices.amount,
      planId: invoices.planId,
      status: invoices.status,
    })
    .from(invoices)
    .where(eq(invoices.arisanGroupId, arisanId))
    .orderBy(desc(invoices.createdAt))
    .limit(1);

  if (!invoice) {
    return null;
  }

  if (invoice.status === "pending" || invoice.status === "rejected") {
    return invoice;
  }

  return null;
}
