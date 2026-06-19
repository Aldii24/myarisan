"use client";

import { useActionState } from "react";

import { buttonStyles } from "@/components/ui/app-ui";

import { recordManualPaymentAction, type ManualPaymentState } from "./actions";

const initialState: ManualPaymentState = {};

type ManualMember = {
  userId: string;
  displayName: string;
  alreadyPaid: boolean;
};

export function ManualPaymentForm({
  arisanId,
  defaultAmount,
  members,
}: {
  arisanId: string;
  defaultAmount: number;
  members: ManualMember[];
}) {
  const [state, formAction, pending] = useActionState(
    recordManualPaymentAction.bind(null, arisanId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-800" htmlFor="memberUserId">
          Anggota
        </label>
        <select
          className="h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          defaultValue=""
          id="memberUserId"
          name="memberUserId"
          required
        >
          <option disabled value="">
            Pilih anggota
          </option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.displayName}
              {member.alreadyPaid ? " (sudah bayar)" : ""}
            </option>
          ))}
        </select>
        <p className="text-xs leading-5 text-zinc-500">
          Hanya anggota yang sudah bergabung yang bisa dicatat manual.
        </p>
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
          placeholder="Contoh: bayar tunai ke admin"
        />
      </div>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {state.success}
        </p>
      ) : null}

      <button
        className={`${buttonStyles.primary} h-12 w-full text-base`}
        disabled={pending || members.length === 0}
        type="submit"
      >
        {pending ? "Menyimpan..." : "Catat Pembayaran"}
      </button>
    </form>
  );
}
