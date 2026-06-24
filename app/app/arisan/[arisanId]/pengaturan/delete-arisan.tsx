"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { buttonStyles } from "@/components/ui/app-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { deleteArisanAction, type DeleteArisanState } from "./actions";

const initialState: DeleteArisanState = {};
const inputClass =
  "h-12 w-full rounded-2xl border border-border bg-card px-4 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

export function DeleteArisan({
  arisanId,
  arisanName,
}: {
  arisanId: string;
  arisanName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [state, formAction, pending] = useActionState(
    deleteArisanAction.bind(null, arisanId),
    initialState,
  );

  const nameMatches =
    confirmName.trim().toLocaleLowerCase("id-ID") ===
    arisanName.trim().toLocaleLowerCase("id-ID");

  return (
    <div className="mt-6 rounded-3xl border border-danger-border bg-danger-surface p-5">
      <h2 className="text-base font-semibold text-danger-foreground">Zona Berbahaya</h2>
      <p className="mt-1 text-sm text-danger-foreground">
        Menghapus arisan bersifat permanen. Semua anggota, periode, dan riwayat
        pembayaran akan hilang dan tidak bisa dikembalikan.
      </p>
      <button
        className={`${buttonStyles.danger} mt-4`}
        onClick={() => setOpen(true)}
        type="button"
      >
        <Trash2 className="mr-2 size-4" />
        Hapus Arisan
      </button>

      <Dialog
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setConfirmName("");
          }
        }}
        open={open}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus arisan {arisanName}?</DialogTitle>
            <DialogDescription>
              Tindakan ini permanen. Untuk konfirmasi, ketik nama arisan persis:{" "}
              <span className="font-semibold text-foreground">{arisanName}</span>
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-4">
            <input
              autoComplete="off"
              className={inputClass}
              name="confirmName"
              onChange={(event) => setConfirmName(event.target.value)}
              placeholder={arisanName}
              value={confirmName}
            />

            {state.error ? (
              <p className="rounded-2xl border border-danger-border bg-danger-surface px-4 py-3 text-sm font-semibold text-danger-foreground">
                {state.error}
              </p>
            ) : null}

            <DialogFooter>
              <button
                className={buttonStyles.secondary}
                disabled={pending}
                onClick={() => setOpen(false)}
                type="button"
              >
                Batal
              </button>
              <button
                className={buttonStyles.danger}
                disabled={pending || !nameMatches}
                type="submit"
              >
                {pending ? "Menghapus..." : "Hapus permanen"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
