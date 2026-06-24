"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { StatusBadge, buttonStyles } from "@/components/ui/app-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import {
  removeMemberAction,
  renameMemberAction,
  type MemberRowState,
} from "./actions";

type MemberItem = {
  displayName: string;
  id: string;
  joinStatus: string;
};

function joinStatusLabel(status: string) {
  return status === "claimed" ? "sudah daftar" : "belum daftar";
}

export function MembersList({
  arisanId,
  members,
}: {
  arisanId: string;
  members: MemberItem[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [removing, setRemoving] = useState<MemberItem | null>(null);
  const [feedback, setFeedback] = useState<MemberRowState>({});
  const [pending, startTransition] = useTransition();

  function startEdit(member: MemberItem) {
    setFeedback({});
    setEditingId(member.id);
    setEditingName(member.displayName);
  }

  function saveRename(membershipId: string) {
    const formData = new FormData();
    formData.set("membershipId", membershipId);
    formData.set("newName", editingName);

    startTransition(async () => {
      const result = await renameMemberAction(arisanId, {}, formData);
      setFeedback(result);

      if (result.success) {
        setEditingId(null);
      }
    });
  }

  function confirmRemove() {
    if (!removing) {
      return;
    }

    const target = removing;

    startTransition(async () => {
      const result = await removeMemberAction(arisanId, target.id);
      setFeedback(result);
      setRemoving(null);
    });
  }

  if (members.length === 0) {
    return (
      <p className="mt-4 rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Belum ada anggota. Tambahkan nama anggota dulu.
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {feedback.error ? (
        <p className="rounded-lg border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger-foreground">
          {feedback.error}
        </p>
      ) : null}
      {feedback.success ? (
        <p className="rounded-lg border border-success-border bg-success-surface px-3 py-2 text-sm text-success-foreground">
          {feedback.success}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {members.map((member) => (
          <div
            className="rounded-3xl border border-border bg-card p-4 shadow-sm"
            key={member.id}
          >
            {editingId === member.id ? (
              <div className="space-y-3">
                <input
                  aria-label="Nama anggota"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => setEditingName(event.target.value)}
                  value={editingName}
                />
                <div className="flex items-center gap-2">
                  <button
                    className={cn(buttonStyles.primary, "min-h-9 px-3 text-xs")}
                    disabled={pending}
                    onClick={() => saveRename(member.id)}
                    type="button"
                  >
                    <Check className="mr-1 size-4" />
                    Simpan
                  </button>
                  <button
                    className={cn(buttonStyles.ghost, "min-h-9 px-3 text-xs")}
                    disabled={pending}
                    onClick={() => setEditingId(null)}
                    type="button"
                  >
                    <X className="mr-1 size-4" />
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {member.displayName}
                  </p>
                  <p className="mt-1">
                    <StatusBadge status={joinStatusLabel(member.joinStatus)} />
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    aria-label={`Ubah nama ${member.displayName}`}
                    className={cn(buttonStyles.ghost, "min-h-9 px-2")}
                    disabled={pending}
                    onClick={() => startEdit(member)}
                    type="button"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    aria-label={`Hapus ${member.displayName}`}
                    className={cn(buttonStyles.danger, "min-h-9 px-2")}
                    disabled={pending}
                    onClick={() => {
                      setFeedback({});
                      setRemoving(member);
                    }}
                    type="button"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog onOpenChange={(open) => (!open ? setRemoving(null) : null)} open={Boolean(removing)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus anggota?</DialogTitle>
            <DialogDescription>
              {removing
                ? `${removing.displayName} akan dihapus dari arisan ini. Riwayat pembayaran lama tetap tersimpan.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              className={buttonStyles.secondary}
              disabled={pending}
              onClick={() => setRemoving(null)}
              type="button"
            >
              Batal
            </button>
            <button
              className={buttonStyles.danger}
              disabled={pending}
              onClick={confirmRemove}
              type="button"
            >
              {pending ? "Menghapus..." : "Ya, hapus"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
