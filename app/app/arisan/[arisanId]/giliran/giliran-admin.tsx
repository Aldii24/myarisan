"use client";

import { ArrowDown, ArrowUp, Crown, Shuffle } from "lucide-react";
import { useState, useTransition } from "react";

import { buttonStyles } from "@/components/ui/app-ui";
import { cn } from "@/lib/utils";

import {
  moveMemberOrderAction,
  randomizeOrderAction,
  setDrawMemberAction,
  type GiliranActionState,
} from "./actions";

type AdminMember = {
  id: string;
  displayName: string;
  isCurrentDraw: boolean;
};

export function GiliranAdmin({
  arisanId,
  hasActivePeriod,
  members,
}: {
  arisanId: string;
  hasActivePeriod: boolean;
  members: AdminMember[];
}) {
  const [state, setState] = useState<GiliranActionState>({});
  const [pending, startTransition] = useTransition();

  function runAction(action: () => Promise<GiliranActionState>) {
    startTransition(async () => {
      setState(await action());
    });
  }

  function move(membershipId: string, direction: "down" | "up") {
    runAction(() => moveMemberOrderAction(arisanId, membershipId, direction));
  }

  function randomize() {
    runAction(() => randomizeOrderAction(arisanId));
  }

  function setDraw(membershipId: string) {
    const formData = new FormData();
    formData.set("membershipId", membershipId);
    runAction(() => setDrawMemberAction(arisanId, {}, formData));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          Atur urutan giliran, acak, dan tentukan pemenang bulan ini.
        </p>
        <button
          className={buttonStyles.secondary}
          disabled={pending || members.length < 2}
          onClick={randomize}
          type="button"
        >
          <Shuffle className="mr-2 size-4" />
          Acak Giliran
        </button>
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

      <ol className="space-y-2">
        {members.map((member, index) => (
          <li
            className={cn(
              "flex items-center gap-3 rounded-3xl border border-white/55 bg-white/45 p-3 shadow-sm",
              member.isCurrentDraw && "border-emerald-300 bg-emerald-50/80",
            )}
            key={member.id}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-zinc-950">
                {member.displayName}
              </p>
              {member.isCurrentDraw ? (
                <p className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <Crown className="size-3" />
                  Giliran bulan ini
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <button
                aria-label="Naikkan urutan"
                className={cn(buttonStyles.ghost, "min-h-9 px-2")}
                disabled={pending || index === 0}
                onClick={() => move(member.id, "up")}
                type="button"
              >
                <ArrowUp className="size-4" />
              </button>
              <button
                aria-label="Turunkan urutan"
                className={cn(buttonStyles.ghost, "min-h-9 px-2")}
                disabled={pending || index === members.length - 1}
                onClick={() => move(member.id, "down")}
                type="button"
              >
                <ArrowDown className="size-4" />
              </button>
              <button
                className={cn(
                  member.isCurrentDraw
                    ? buttonStyles.primary
                    : buttonStyles.secondary,
                  "min-h-9 px-3 text-xs",
                )}
                disabled={pending || !hasActivePeriod}
                onClick={() => setDraw(member.isCurrentDraw ? "" : member.id)}
                type="button"
              >
                {member.isCurrentDraw ? "Pemenang" : "Set Giliran"}
              </button>
            </div>
          </li>
        ))}
      </ol>

      {!hasActivePeriod ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Belum ada periode aktif. Giliran bulan ini bisa diatur setelah periode
          aktif tersedia.
        </p>
      ) : null}
    </div>
  );
}
