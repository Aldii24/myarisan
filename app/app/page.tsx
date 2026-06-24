import { redirect } from "next/navigation";

import {
  BrandLogo,
  ButtonLink,
  EmptyState,
  GlassPanel,
  PageShell,
  buttonStyles,
} from "@/components/ui/app-ui";
import { getUserMemberships, requireUser } from "@/lib/auth/user";

import { logoutAction } from "./actions";

export default async function AppPage() {
  const user = await requireUser();
  const memberships = await getUserMemberships(user.id);

  if (memberships.length === 1) {
    redirect(`/app/arisan/${memberships[0].arisanGroupId}`);
  }

  if (memberships.length > 1) {
    redirect("/app/select-arisan");
  }

  return (
    <PageShell>
      <div className="grid min-h-[calc(100vh-4rem)] items-center gap-6 py-8 lg:grid-cols-[1fr_1fr]">
        <GlassPanel className="p-7 lg:p-9" variant="elevated">
          <BrandLogo />
          <h1 className="mt-10 text-4xl font-semibold leading-tight tracking-tight text-foreground">
            Belum ada arisan yang terhubung.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Akun {user.name ?? user.phone} belum masuk ke arisan mana pun. Buat
            arisan baru untuk mulai mencatat anggota, setoran, bukti bayar, dan
            rekap.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/app/arisan/new" variant="primary">
              Buat Arisan Baru
            </ButtonLink>
            <ButtonLink href="/owner" variant="secondary">
              Buka Owner
            </ButtonLink>
            <form action={logoutAction}>
              <button className={`${buttonStyles.ghost} w-full sm:w-auto`} type="submit">
                Keluar
              </button>
            </form>
          </div>
        </GlassPanel>

        <EmptyState
          action={
            <ButtonLink href="/app/arisan/new" variant="primary">
              Mulai sekarang
            </ButtonLink>
          }
          title="Mulai dari satu arisan"
        >
          Setelah arisan dibuat, kamu bisa tambah anggota, bagikan kode join, dan
          cek bukti pembayaran dari satu halaman.
        </EmptyState>
      </div>
    </PageShell>
  );
}
