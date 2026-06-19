import { redirect } from "next/navigation";

import {
  BrandLogo,
  ButtonLink,
  GlassPanel,
  PageShell,
  buttonStyles,
} from "@/components/ui/app-ui";
import { getUserMemberships, requireUser } from "@/lib/auth/user";

import { logoutAction } from "../actions";
import { ArisanList } from "./arisan-list";

export default async function SelectArisanPage() {
  const user = await requireUser();
  const memberships = await getUserMemberships(user.id);

  if (memberships.length === 0) {
    redirect("/app");
  }

  const items = memberships.map((membership) => ({
    arisanGroupId: membership.arisanGroupId,
    arisanName: membership.arisanName,
    id: membership.id,
    role: membership.role,
  }));

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

        <ArisanList items={items} />
      </div>
    </PageShell>
  );
}
