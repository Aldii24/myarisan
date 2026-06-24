"use client";

import { CalendarPlus } from "lucide-react";
import { useState, useTransition } from "react";

import { buttonStyles } from "@/components/ui/app-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { startNextPeriodAction, type GiliranActionState } from "./actions";

export function PeriodControl({
  activePeriodName,
  arisanId,
  hasDrawWinner,
  paidCount,
  unpaidCount,
}: {
  activePeriodName: string | null;
  arisanId: string;
  hasDrawWinner: boolean;
  paidCount: number;
  unpaidCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<GiliranActionState>({});
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await startNextPeriodAction(arisanId);
      setState(result);

      if (result.success) {
        setOpen(false);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Periode aktif</p>
          <p className="text-lg font-semibold text-foreground">
            {activePeriodName ?? "Belum ada periode aktif"}
          </p>
        </div>
        <button
          className={buttonStyles.primary}
          onClick={() => {
            setState({});
            setOpen(true);
          }}
          type="button"
        >
          <CalendarPlus className="mr-2 size-4" />
          Mulai Periode Berikutnya
        </button>
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

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mulai periode berikutnya?</DialogTitle>
            <DialogDescription>
              {activePeriodName
                ? `Periode "${activePeriodName}" akan ditutup dan periode baru dimulai.`
                : "Periode baru akan dibuka."}{" "}
              Status pembayaran anggota kembali ke belum bayar untuk periode baru.
            </DialogDescription>
          </DialogHeader>

          {activePeriodName && !hasDrawWinner ? (
            <p className="rounded-lg border border-warning-border bg-warning-surface px-3 py-2 text-sm text-warning-foreground">
              Giliran bulan ini belum diatur. Jika diteruskan, periode ini tidak
              punya catatan pemenang.
            </p>
          ) : null}

          <p className="text-sm text-muted-foreground">
            Periode aktif: sudah bayar {paidCount} · belum bayar {unpaidCount}.
          </p>

          {state.error ? (
            <p className="rounded-lg border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger-foreground">
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
              className={buttonStyles.primary}
              disabled={pending}
              onClick={confirm}
              type="button"
            >
              {pending ? "Memproses..." : "Ya, mulai periode baru"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
