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
        <label className="text-sm font-medium text-zinc-800" htmlFor="proofImage">
          Bukti pembayaran paket
        </label>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          id="proofImage"
          name="proofImage"
          required
          type="file"
        />
        <p className="text-xs leading-5 text-zinc-500">JPG, PNG, atau WebP. Maksimal 3MB.</p>
      </div>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
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
