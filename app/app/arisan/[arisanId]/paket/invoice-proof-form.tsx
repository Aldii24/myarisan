"use client";

import { useActionState } from "react";

import { buttonStyles } from "@/components/ui/app-ui";

import { uploadInvoiceProofAction, type UploadInvoiceProofState } from "./actions";

const initialState: UploadInvoiceProofState = {};

export function InvoiceProofForm({
  arisanId,
  invoiceId,
}: {
  arisanId: string;
  invoiceId: string;
}) {
  const [state, formAction, pending] = useActionState(
    uploadInvoiceProofAction.bind(null, arisanId, invoiceId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5" encType="multipart/form-data">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="proofImage">
          Bukti pembayaran paket
        </label>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="block w-full rounded-lg border border-border bg-card px-4 py-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          id="proofImage"
          name="proofImage"
          required
          type="file"
        />
        <p className="text-xs leading-5 text-muted-foreground">JPG, PNG, atau WebP. Maksimal 3MB.</p>
      </div>

      {state.error ? (
        <p className="rounded-lg border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger-foreground">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-lg border border-success-border bg-success-surface px-3 py-2 text-sm text-success-foreground">
          {state.success}
        </p>
      ) : null}

      <button
        className={`${buttonStyles.primary} h-12 w-full text-base`}
        disabled={pending}
        type="submit"
      >
        {pending ? "Mengirim..." : "Kirim Bukti Paket"}
      </button>
    </form>
  );
}
