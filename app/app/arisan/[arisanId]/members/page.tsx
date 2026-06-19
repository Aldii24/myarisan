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
import { MembersList } from "./members-list";

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

          <MembersList
            arisanId={arisanId}
            members={memberRows.map((member) => ({
              displayName: member.displayName,
              id: member.id,
              joinStatus: member.joinStatus,
            }))}
          />
        </GlassPanel>
      </div>
    </>
  );
}
