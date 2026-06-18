import Link from "next/link";
import { redirect } from "next/navigation";

import {
  BrandLogo,
  ButtonLink,
  GlassPanel,
  PageShell,
  StatusBadge,
  buttonStyles,
} from "@/components/ui/app-ui";
import { getUserMemberships, requireUser } from "@/lib/auth/user";

import { logoutAction } from "../actions";

export default async function SelectArisanPage() {
  const user = await requireUser();
  const memberships = await getUserMemberships(user.id);

  if (memberships.length === 0) {
    redirect("/app");
  }

  if (memberships.length === 1) {
    redirect(`/app/arisan/${memberships[0].arisanGroupId}`);
  }

  return (
    <PageShell>
      <div className="space-y-6 py-4">
        <GlassPanel className="p-6" variant="elevated">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <BrandLogo />
              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-950">
                Pilih arisan
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Halo, {user.name ?? user.phone}. Buka arisan yang ingin kamu cek
                hari ini.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href="/app/arisan/new" variant="primary">
                Buat Arisan Baru
              </ButtonLink>
              <form action={logoutAction}>
                <button className={`${buttonStyles.secondary} w-full`} type="submit">
                  Keluar
                </button>
              </form>
            </div>
          </div>
        </GlassPanel>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {memberships.map((membership) => (
            <Link
              className="group rounded-[1.5rem] border border-white/55 bg-white/50 p-5 shadow-[0_18px_60px_rgba(67,48,35,0.1)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/68"
              href={`/app/arisan/${membership.arisanGroupId}`}
              key={membership.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-zinc-950">
                    {membership.arisanName}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600">
                    Lihat ringkasan, anggota, dan pembayaran.
                  </p>
                </div>
                <StatusBadge status={membership.role === "admin" ? "Admin" : "Anggota"} />
              </div>
              <p className="mt-6 text-sm font-semibold text-emerald-700 transition group-hover:translate-x-1">
                Buka arisan
              </p>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
