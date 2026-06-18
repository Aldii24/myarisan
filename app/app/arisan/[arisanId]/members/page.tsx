import {
  ButtonLink,
  EmptyState,
  GlassPanel,
  StatusBadge,
} from "@/components/ui/app-ui";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getArisanDashboardData, getArisanMembers } from "@/lib/arisan";
import { requireArisanAdmin } from "@/lib/auth/user";
import { getPlanLimits } from "@/lib/subscription";

import { AddMembersForm } from "./add-members-form";

function joinStatusLabel(status: string) {
  if (status === "claimed") {
    return "sudah daftar";
  }

  return "belum daftar";
}

export default async function MembersPage({
  params,
}: {
  params: Promise<{ arisanId: string }>;
}) {
  const { arisanId } = await params;
  const context = await requireArisanAdmin(arisanId);

  if (!context) {
    return (
      <>
        <DashboardHeader eyebrow="Tidak Bisa Akses" title="Hanya admin arisan" />
        <EmptyState
          action={
            <ButtonLink href={`/app/arisan/${arisanId}`} variant="primary">
              Kembali
            </ButtonLink>
          }
          title="Hanya admin"
        >
          Hanya admin arisan yang bisa menambah dan mengatur anggota.
        </EmptyState>
      </>
    );
  }

  const [members, arisan, planLimits] = await Promise.all([
    getArisanMembers(arisanId),
    getArisanDashboardData(arisanId),
    getPlanLimits(arisanId),
  ]);
  const memberRows = members.filter((member) => member.role === "member");

  return (
    <>
      <DashboardHeader
        eyebrow="Anggota"
        subtitle={`Paket ${planLimits.planName} maksimal ${planLimits.maxMembers} anggota.`}
        title={arisan?.group.name ?? "Anggota"}
      />
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <GlassPanel className="p-5" variant="elevated">
          <h2 className="text-xl font-semibold text-zinc-950">Tambah anggota</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Tulis nama anggota satu per baris. Mereka bisa daftar sendiri lewat
            kode join.
          </p>
          <div className="mt-5">
            <AddMembersForm arisanId={arisanId} />
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-950">Daftar anggota</h2>
              <p className="mt-1 text-sm text-zinc-600">
                {memberRows.length} anggota terdata
              </p>
            </div>
            <StatusBadge status={planLimits.planName} />
          </div>

          {memberRows.length === 0 ? (
            <EmptyState title="Belum ada anggota">
              Belum ada anggota. Tambahkan nama anggota dulu.
            </EmptyState>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {memberRows.map((member) => (
                <div
                  className="rounded-3xl border border-white/55 bg-white/45 p-4 shadow-sm"
                  key={member.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-950">{member.displayName}</p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {member.role === "admin" ? "Admin" : "Anggota"}
                      </p>
                    </div>
                    <StatusBadge status={joinStatusLabel(member.joinStatus)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    </>
  );
}
