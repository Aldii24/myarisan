"use client";

import { useActionState } from "react";

import { buttonStyles } from "@/components/ui/app-ui";

import { uploadPaymentProofAction, type UploadPaymentState } from "./actions";

const initialState: UploadPaymentState = {};

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

export function UploadPaymentForm({
  arisanId,
  defaultAmount,
}: {
  arisanId: string;
  defaultAmount: number;
}) {
  const [state, formAction, pending] = useActionState(
    uploadPaymentProofAction.bind(null, arisanId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5" encType="multipart/form-data">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="proofImage">
          Bukti transfer
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

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="amount">
          Nominal
        </label>
        <input
          className="h-12 w-full rounded-lg border border-border bg-card px-4 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={defaultAmount}
          id="amount"
          inputMode="numeric"
          name="amount"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="note">
          Catatan opsional
        </label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-border bg-card px-4 py-3 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          id="note"
          name="note"
          placeholder="Contoh: transfer dari BCA atas nama Sinta"
        />
      </div>

      {state.error ? (
        <p className="rounded-lg border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger-foreground">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <div className="rounded-lg border border-success-border bg-success-surface px-3 py-2 text-sm text-success-foreground">
          <p className="font-semibold">{state.success}</p>
          <p className="mt-1">Status: {state.status ?? "Menunggu Dicek Admin"}.</p>
          {state.detectedAmount ? (
            <p className="mt-1">Nominal terbaca: {formatRupiah(state.detectedAmount)}</p>
          ) : null}
          {state.hasAiWarning ? (
            <p className="mt-1">Ada data yang perlu dicek admin.</p>
          ) : null}
        </div>
      ) : null}

      <button
        className={`${buttonStyles.primary} h-12 w-full text-base`}
        disabled={pending}
        type="submit"
      >
        {pending ? "Mengirim..." : "Kirim Bukti Bayar"}
      </button>
    </form>
  );
}
