import {
  AppBackground,
  BrandLogo,
  EmptyState,
  GlassPanel,
  MetricCard,
} from "@/components/ui/app-ui";
import { formatRupiah, getPublicJoinData } from "@/lib/arisan";

import { JoinForm } from "./join-form";

function periodLabel(periodType: string) {
  return periodType === "weekly" ? "Mingguan" : "Bulanan";
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ joinCode: string }>;
}) {
  const { joinCode } = await params;
  const joinData = await getPublicJoinData(joinCode);

  if (!joinData) {
    return (
      <AppBackground>
        <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-md items-center">
          <GlassPanel className="p-6 text-center" variant="elevated">
            <div className="mx-auto w-fit">
              <BrandLogo />
            </div>
            <h1 className="mt-8 text-3xl font-semibold text-zinc-950">
              Kode arisan tidak ditemukan.
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Cek lagi kode dari admin arisan, lalu buka ulang link daftar.
            </p>
          </GlassPanel>
        </section>
      </AppBackground>
    );
  }

  const { group, unclaimedMembers } = joinData;

  return (
    <AppBackground>
      <section className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl items-center gap-6 py-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <BrandLogo />
          <GlassPanel className="p-6 lg:p-8" variant="elevated">
            <p className="text-sm font-semibold tracking-wide text-emerald-700">
              Daftar MyArisan
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-zinc-950">
              Masuk ke {group.name}
            </h1>
            <p className="mt-4 text-sm leading-6 text-zinc-600">
              Pilih nama kamu, isi nomor WhatsApp, lalu buat PIN 4 angka. Data
              pembayaran tetap dicek admin arisan.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <MetricCard
                accent="emerald"
                label="Setoran"
                value={formatRupiah(group.amountPerPeriod)}
              />
              <MetricCard accent="neutral" label="Periode" value={periodLabel(group.periodType)} />
            </div>
            {group.bankAccountText ? (
              <div className="mt-4 rounded-3xl border border-white/50 bg-white/45 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Rekening admin
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
                  {group.bankAccountText}
                </p>
              </div>
            ) : null}
          </GlassPanel>
        </div>

        <GlassPanel className="p-5 lg:p-7" variant="elevated">
          {unclaimedMembers.length === 0 ? (
            <EmptyState title="Semua nama sudah terdaftar">
              Semua nama anggota sudah terdaftar. Hubungi admin arisan jika ada
              kesalahan.
            </EmptyState>
          ) : (
            <JoinForm joinCode={group.joinCode} members={unclaimedMembers} />
          )}
        </GlassPanel>
      </section>
    </AppBackground>
  );
}
