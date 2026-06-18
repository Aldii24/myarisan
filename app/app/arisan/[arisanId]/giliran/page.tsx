import { Crown } from "lucide-react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState, GlassPanel, StatusBadge } from "@/components/ui/app-ui";
import { formatDateLabel } from "@/lib/arisan";
import { requireArisanMembership } from "@/lib/auth/user";
import { getGiliranData, getGiliranWinnerHistory } from "@/lib/giliran";
import { cn } from "@/lib/utils";

import { GiliranAdmin } from "./giliran-admin";

function periodStatusLabel(status: string) {
  if (status === "active") {
    return "Aktif";
  }

  if (status === "closed") {
    return "Selesai";
  }

  return "Draft";
}

export default async function GiliranPage({
  params,
}: {
  params: Promise<{ arisanId: string }>;
}) {
  const { arisanId } = await params;
  const { membership } = await requireArisanMembership(arisanId);

  const [data, winners] = await Promise.all([
    getGiliranData(arisanId),
    getGiliranWinnerHistory(arisanId),
  ]);

  if (!data) {
    return (
      <>
        <DashboardHeader eyebrow="Giliran" title="Arisan tidak ditemukan" />
        <EmptyState title="Tidak ada data">
          Buka kembali daftar arisan untuk memilih halaman yang tersedia.
        </EmptyState>
      </>
    );
  }

  const isAdmin = membership.role === "admin";

  return (
    <>
      <DashboardHeader
        eyebrow="Giliran"
        subtitle={
          data.activePeriod
            ? `Periode aktif: ${data.activePeriod.name}`
            : "Belum ada periode aktif."
        }
        title={`Giliran ${data.group.name}`}
      />

      <GlassPanel className="p-5" variant="elevated">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-700 text-white">
            <Crown className="size-5" />
          </div>
          <div>
            <p className="text-sm text-zinc-600">Giliran bulan ini</p>
            <p className="text-xl font-semibold text-zinc-950">
              {data.currentDrawName ?? "Belum diatur"}
            </p>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-5">
        <h2 className="text-xl font-semibold text-zinc-950">Urutan giliran</h2>
        {data.members.length === 0 ? (
          <EmptyState title="Belum ada anggota">
            Tambahkan anggota dulu untuk mengatur giliran.
          </EmptyState>
        ) : isAdmin ? (
          <div className="mt-4">
            <GiliranAdmin
              arisanId={arisanId}
              hasActivePeriod={Boolean(data.activePeriod)}
              members={data.members.map((member) => ({
                id: member.id,
                displayName: member.displayName,
                isCurrentDraw: member.isCurrentDraw,
              }))}
            />
          </div>
        ) : (
          <ol className="mt-4 space-y-2">
            {data.members.map((member, index) => (
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
                <p className="min-w-0 flex-1 truncate font-semibold text-zinc-950">
                  {member.displayName}
                </p>
                {member.isCurrentDraw ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <Crown className="size-3" />
                    Bulan ini
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </GlassPanel>

      <GlassPanel className="p-5">
        <h2 className="text-xl font-semibold text-zinc-950">Riwayat pemenang</h2>
        {winners.length === 0 ? (
          <EmptyState title="Belum ada pemenang">
            Pemenang akan muncul setelah giliran tiap periode ditentukan.
          </EmptyState>
        ) : (
          <div className="mt-4 space-y-2">
            {winners.map((winner) => (
              <div
                className="flex items-center justify-between gap-3 rounded-3xl border border-white/55 bg-white/45 p-3 shadow-sm"
                key={winner.periodId}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-950">
                    {winner.memberName}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {winner.periodName} · {formatDateLabel(winner.dueDate)}
                  </p>
                </div>
                <StatusBadge status={periodStatusLabel(winner.status)} />
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </>
  );
}
