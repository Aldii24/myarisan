import { BrandLogo, ButtonLink, GlassPanel, PageShell } from "@/components/ui/app-ui";
import { requireUser } from "@/lib/auth/user";

import { CreateArisanForm } from "./create-arisan-form";

export default async function NewArisanPage() {
  await requireUser();

  return (
    <PageShell>
      <div className="grid min-h-[calc(100vh-4rem)] items-center gap-6 py-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <BrandLogo />
          <GlassPanel className="p-6 lg:p-8" variant="elevated">
            <p className="text-sm font-semibold tracking-wide text-emerald-700">
              Mulai Arisan
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-zinc-950">
              Buat halaman arisan yang rapi sejak awal.
            </h1>
            <p className="mt-4 text-sm leading-6 text-zinc-600">
              Isi data dasar, lalu tambah anggota dan bagikan kode join ke grup
              WhatsApp. Semua setoran masuk ke rekening admin.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/50 bg-white/45 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Setoran
                </p>
                <p className="mt-2 text-lg font-semibold text-zinc-950">
                  Tercatat per periode
                </p>
              </div>
              <div className="rounded-3xl border border-white/50 bg-white/45 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Kode Join
                </p>
                <p className="mt-2 text-lg font-semibold text-zinc-950">
                  Dibuat otomatis
                </p>
              </div>
            </div>
          </GlassPanel>
          <ButtonLink className="w-full sm:w-auto" href="/app" variant="secondary">
            Kembali
          </ButtonLink>
        </div>

        <GlassPanel className="p-5 lg:p-7" variant="elevated">
          <div className="mb-6">
            <p className="text-sm font-semibold tracking-wide text-emerald-700">
              Data Arisan
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
              Atur info utama
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Semua bisa dikembangkan nanti. Untuk MVP, cukup isi data yang
              dibutuhkan anggota untuk setor.
            </p>
          </div>
          <CreateArisanForm />
        </GlassPanel>
      </div>
    </PageShell>
  );
}
