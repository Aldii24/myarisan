"use client";

import { useActionState } from "react";

import { buttonStyles } from "@/components/ui/app-ui";

import { addMembersAction, type AddMembersState } from "./actions";

const initialState: AddMembersState = {};

export function AddMembersForm({ arisanId }: { arisanId: string }) {
  const [state, formAction, pending] = useActionState(
    addMembersAction.bind(null, arisanId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-800" htmlFor="memberNames">
          Tambah nama anggota
        </label>
        <textarea
          className="min-h-36 w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          id="memberNames"
          name="memberNames"
          placeholder={"Sinta\nRina\nDewi\nFitri"}
          required
        />
        <p className="text-xs leading-5 text-zinc-500">Satu nama per baris.</p>
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
        {pending ? "Menambahkan..." : "Tambah Anggota"}
      </button>
    </form>
  );
}
