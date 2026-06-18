"use client";

import { useActionState } from "react";

import { FormFieldHint, buttonStyles } from "@/components/ui/app-ui";

import { createArisanAction, type CreateArisanState } from "./actions";

const initialState: CreateArisanState = {};
const inputClass =
  "h-12 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";
const textareaClass =
  "min-h-28 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";

export function CreateArisanForm() {
  const [state, formAction, pending] = useActionState(createArisanAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Info Arisan</p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-950">Nama dan setoran</h2>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-800" htmlFor="name">
            Nama arisan
          </label>
          <input
            className={inputClass}
            id="name"
            name="name"
            placeholder="Arisan Ibu-Ibu RT 03"
            required
          />
          <FormFieldHint>Contoh: Arisan RT 03 atau Arisan Keluarga Besar.</FormFieldHint>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-800" htmlFor="amount">
            Nominal setoran per orang
          </label>
          <input
            className={inputClass}
            id="amount"
            inputMode="numeric"
            name="amount"
            placeholder="100000"
            required
          />
          <FormFieldHint>Isi angka saja. Contoh: 100000 untuk Rp100.000.</FormFieldHint>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Aturan Setoran</p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-950">Periode dan batas</h2>
        </div>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-zinc-800">Periode</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex min-h-12 items-center rounded-2xl border border-zinc-300 bg-white/55 px-4 text-sm font-semibold text-zinc-800 shadow-sm transition has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
              <input
                className="mr-2 accent-emerald-700"
                defaultChecked
                name="periodType"
                type="radio"
                value="monthly"
              />
              Bulanan
            </label>
            <label className="flex min-h-12 items-center rounded-2xl border border-zinc-300 bg-white/55 px-4 text-sm font-semibold text-zinc-800 shadow-sm transition has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
              <input
                className="mr-2 accent-emerald-700"
                name="periodType"
                type="radio"
                value="weekly"
              />
              Mingguan
            </label>
          </div>
          <FormFieldHint>
            Untuk MVP, batas setor memakai angka tanggal. Mode mingguan akan
            mengikuti periode yang dibuat sistem.
          </FormFieldHint>
        </fieldset>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-800" htmlFor="dueDay">
            Batas setor tanggal berapa?
          </label>
          <input
            className={inputClass}
            id="dueDay"
            inputMode="numeric"
            max={28}
            min={1}
            name="dueDay"
            placeholder="10"
            required
            type="number"
          />
          <FormFieldHint>
            Isi angka 1-28. Contoh: 10 berarti anggota setor paling lambat tanggal
            10 setiap bulan.
          </FormFieldHint>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Rekening Admin</p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-950">Tujuan setoran</h2>
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
            id="bankAccountText"
            name="bankAccountText"
            placeholder="BCA - Siti Aminah - 1234567890"
            required
          />
          <FormFieldHint>
            Tulis nama bank/e-wallet, nama pemilik, dan nomor rekening.
          </FormFieldHint>
        </div>
      </section>

      {state.error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        className={`${buttonStyles.primary} h-12 w-full text-base`}
        disabled={pending}
        type="submit"
      >
        {pending ? "Membuat..." : "Buat Arisan Baru"}
      </button>
    </form>
  );
}
