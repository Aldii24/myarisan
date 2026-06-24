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
        <label className="text-sm font-medium text-foreground" htmlFor="memberNames">
          Tambah nama anggota
        </label>
        <textarea
          className="min-h-36 w-full rounded-lg border border-border bg-card px-4 py-3 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          id="memberNames"
          name="memberNames"
          placeholder={"Sinta\nRina\nDewi\nFitri"}
          required
        />
        <p className="text-xs leading-5 text-muted-foreground">Satu nama per baris.</p>
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
        {pending ? "Menambahkan..." : "Tambah Anggota"}
      </button>
    </form>
  );
}
