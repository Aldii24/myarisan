"use client";

import { useActionState } from "react";

import { FormFieldHint, buttonStyles } from "@/components/ui/app-ui";

import { createArisanAction, type CreateArisanState } from "./actions";

const initialState: CreateArisanState = {};
const inputClass =
  "h-12 w-full rounded-2xl border border-border bg-card px-4 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-ring";
const textareaClass =
  "min-h-28 w-full rounded-2xl border border-border bg-card px-4 py-3 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

export function CreateArisanForm() {
  const [state, formAction, pending] = useActionState(createArisanAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-primary">Info Arisan</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Nama dan setoran</h2>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="name">
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
          <label className="text-sm font-semibold text-foreground" htmlFor="amount">
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
          <p className="text-sm font-semibold text-primary">Aturan Setoran</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Periode dan batas</h2>
        </div>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Periode</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex min-h-12 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                className="mr-2 accent-primary"
                defaultChecked
                name="periodType"
                type="radio"
                value="monthly"
              />
              Bulanan
            </label>
            <label className="flex min-h-12 items-center rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                className="mr-2 accent-primary"
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
          <label className="text-sm font-semibold text-foreground" htmlFor="dueDay">
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
          <p className="text-sm font-semibold text-primary">Rekening Admin</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Tujuan setoran</h2>
        </div>
        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-foreground"
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
        <p className="rounded-2xl border border-danger-border bg-danger-surface px-4 py-3 text-sm font-semibold text-danger-foreground">
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
