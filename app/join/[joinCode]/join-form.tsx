"use client";

import { useActionState } from "react";

import { buttonStyles } from "@/components/ui/app-ui";

import { joinArisanAction, type JoinFormState } from "./actions";

type JoinMember = {
  displayName: string;
  id: string;
};

const initialState: JoinFormState = {};

export function JoinForm({
  joinCode,
  members,
}: {
  joinCode: string;
  members: JoinMember[];
}) {
  const [state, formAction, pending] = useActionState(
    joinArisanAction.bind(null, joinCode),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-zinc-800">Pilih nama kamu</legend>
        <p className="ui-help">Pilih nama sesuai daftar dari admin arisan.</p>
        <div className="space-y-2">
          {members.map((member) => (
            <label
              className="flex min-h-12 items-center rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-800 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50"
              key={member.id}
            >
              <input
                className="mr-3"
                name="memberId"
                required
                type="radio"
                value={member.id}
              />
              {member.displayName}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-800" htmlFor="phone">
          Nomor WhatsApp
        </label>
        <input
          className="h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          id="phone"
          inputMode="tel"
          name="phone"
          placeholder="081234567890"
          required
        />
        <p className="ui-help">Nomor ini dipakai untuk masuk ke Halaman Arisan.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-800" htmlFor="pin">
            Buat PIN 4 angka
          </label>
          <input
            autoComplete="new-password"
            className="h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-base tracking-[0.4em] outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            id="pin"
            inputMode="numeric"
            maxLength={4}
            minLength={4}
            name="pin"
            pattern="[0-9]{4}"
            required
            type="password"
          />
          <p className="ui-help">Buat PIN pribadi yang mudah kamu ingat.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-800" htmlFor="confirmPin">
            Ulangi PIN
          </label>
          <input
            autoComplete="new-password"
            className="h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-base tracking-[0.4em] outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            id="confirmPin"
            inputMode="numeric"
            maxLength={4}
            minLength={4}
            name="confirmPin"
            pattern="[0-9]{4}"
            required
            type="password"
          />
          <p className="ui-help">Ulangi PIN yang sama.</p>
        </div>
      </div>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        className={`${buttonStyles.primary} h-12 w-full text-base`}
        disabled={pending}
        type="submit"
      >
        {pending ? "Mendaftarkan..." : "Daftar"}
      </button>
    </form>
  );
}
