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
        <label className="text-sm font-medium text-zinc-800" htmlFor="proofImage">
          Bukti transfer
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

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-800" htmlFor="amount">
          Nominal
        </label>
        <input
          className="h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          defaultValue={defaultAmount}
          id="amount"
          inputMode="numeric"
          name="amount"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-800" htmlFor="note">
          Catatan opsional
        </label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          id="note"
          name="note"
          placeholder="Contoh: transfer dari BCA atas nama Sinta"
        />
      </div>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
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
