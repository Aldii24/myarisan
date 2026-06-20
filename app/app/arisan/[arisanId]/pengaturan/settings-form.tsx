"use client";

import { useActionState } from "react";

import { FormFieldHint, buttonStyles } from "@/components/ui/app-ui";

import { updateArisanSettingsAction, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};
const inputClass =
  "h-12 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";
const textareaClass =
  "min-h-28 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";

export function SettingsForm({
  arisanId,
  initialValues,
  periodLabel,
}: {
  arisanId: string;
  initialValues: {
    amountPerPeriod: number;
    bankAccountText: string;
    dueDay: number;
    name: string;
  };
  periodLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateArisanSettingsAction.bind(null, arisanId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-800" htmlFor="name">
          Nama arisan
        </label>
        <input
          className={inputClass}
          defaultValue={initialValues.name}
          id="name"
          name="name"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-800" htmlFor="amount">
          Nominal setoran per orang
        </label>
        <input
          className={inputClass}
          defaultValue={initialValues.amountPerPeriod}
          id="amount"
          inputMode="numeric"
          name="amount"
          required
        />
        <FormFieldHint>Isi angka saja. Contoh: 100000 untuk Rp100.000.</FormFieldHint>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-800" htmlFor="dueDay">
          Batas setor tanggal berapa?
        </label>
        <input
          className={inputClass}
          defaultValue={initialValues.dueDay}
          id="dueDay"
          inputMode="numeric"
          max={28}
          min={1}
          name="dueDay"
          required
          type="number"
        />
        <FormFieldHint>Isi angka 1-28.</FormFieldHint>
      </div>

      <div className="space-y-2">
        <label
          className="text-sm font-semibold text-zinc-800"
          htmlFor="bankAccountText"
        >
          Rekening admin / e-wallet admin
        </label>
        <textarea
          className={textareaClass}
          defaultValue={initialValues.bankAccountText}
          id="bankAccountText"
          name="bankAccountText"
          required
        />
        <FormFieldHint>
          Tulis nama bank/e-wallet, nama pemilik, dan nomor rekening.
        </FormFieldHint>
      </div>

      <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        Periode arisan ({periodLabel}) tidak bisa diubah agar riwayat periode
        tetap konsisten.
      </p>

      {state.error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {state.success}
        </p>
      ) : null}

      <button
        className={`${buttonStyles.primary} h-12 w-full text-base`}
        disabled={pending}
        type="submit"
      >
        {pending ? "Menyimpan..." : "Simpan Pengaturan"}
      </button>
    </form>
  );
}
