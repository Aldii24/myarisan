import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Copy,
  FileCheck2,
  ImageIcon,
  LayoutDashboard,
  LockKeyhole,
  MessageCircleMore,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";
import { HeroBackdrop } from "@/components/landing/hero-backdrop";
import { LandingNav } from "@/components/landing/landing-nav";
import {
  Eyebrow,
  GradientText,
  SectionHeading,
} from "@/components/landing/primitives";
import { Reveal } from "@/components/landing/reveal";
import {
  FloatingWhatsAppCta,
  WhatsAppIcon,
} from "@/components/landing/whatsapp-cta";
import { WorkflowSection } from "@/components/landing/workflow-section";

const siteUrl = "https://myarisan.vercel.app";
const whatsappUrl =
  "https://wa.me/6285148360457?text=Halo%20MyArisan%2C%20saya%20ingin%20tanya%20tentang%20MyArisan.";

export const metadata: Metadata = {
  title: "MyArisan — Rekap arisan lebih tenang",
  description:
    "Catat bukti setoran, cek siapa sudah atau belum bayar, dan buat rekap arisan siap kirim ke grup WhatsApp.",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "MyArisan — Rekap arisan lebih tenang",
    description:
      "Catat bukti setoran, cek siapa sudah atau belum bayar, dan buat rekap arisan siap kirim ke grup WhatsApp.",
    url: siteUrl,
    siteName: "MyArisan",
    locale: "id_ID",
    type: "website",
  },
};

const heroHighlights = [
  "Mulai dari Rp0",
  "Tanpa bot di grup",
  "Dana tetap di admin",
];

const useCases = ["Arisan RT & komplek", "Kantor", "Komunitas", "Keluarga", "Alumni"];

const problems = [
  {
    icon: MessageCircleMore,
    title: "Bukti transfer tenggelam di chat",
    tone: "bg-[#e7f7f0] text-[#13795b]",
  },
  {
    icon: UsersRound,
    title: "Admin lupa siapa yang sudah setor",
    tone: "bg-[#eeeafd] text-[#6750a4]",
  },
  {
    icon: Clock3,
    title: "Anggota sering tanya status bayar",
    tone: "bg-[#e7f2ff] text-[#316ca5]",
  },
  {
    icon: ReceiptText,
    title: "Rekap manual bikin capek",
    tone: "bg-[#fff0e5] text-[#ad5d2d]",
  },
  {
    icon: ShieldCheck,
    title: "Salah catat bisa bikin ribut",
    tone: "bg-[#f8e8eb] text-[#a54052]",
  },
];

const features = [
  {
    icon: ScanLine,
    title: "Baca bukti transfer otomatis",
    description:
      "Bantu membaca nominal dan informasi penting dari foto bukti setoran.",
    className: "md:col-span-2 bg-[#e7f7f0]",
  },
  {
    icon: UserRoundCheck,
    title: "Status sudah/belum bayar",
    description: "Semua anggota langsung terlihat dalam satu rekap yang rapi.",
    className: "bg-[#eeeafd]",
  },
  {
    icon: ClipboardCheck,
    title: "Konfirmasi bukti oleh admin",
    description:
      "Bukti selalu masuk ke Menunggu Dicek sebelum diterima atau ditolak.",
    className: "bg-[#fff0e5]",
  },
  {
    icon: Copy,
    title: "Teks tagihan siap salin",
    description: "Buat pesan tagihan yang jelas tanpa mengetik ulang.",
    className: "bg-[#e7f2ff]",
  },
  {
    icon: FileCheck2,
    title: "Rekap siap kirim ke grup",
    description: "Salin daftar pembayaran dan total terkumpul dalam sekali tap.",
    className: "md:col-span-2 bg-[#173f35] text-white",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard admin dan anggota",
    description: "Masing-masing melihat informasi yang sesuai dengan perannya.",
    className: "bg-white",
  },
  {
    icon: LockKeyhole,
    title: "Login nomor WhatsApp + PIN",
    description: "Masuk dengan nomor WhatsApp dan PIN pribadi 4 angka.",
    className: "bg-white",
  },
  {
    icon: Bot,
    title: "Tanpa bot masuk grup",
    description:
      "Bot bekerja lewat chat pribadi. Grup arisan tetap dipakai seperti biasa.",
    className: "md:col-span-2 bg-[#f7edda]",
  },
];

const safetyPoints = [
  "Bukti transfer tersimpan rapi dan mudah dicek.",
  "Admin tetap yang menentukan pembayaran diterima atau ditolak.",
  "Anggota bisa cek status setoran sendiri.",
  "Rekap siap disalin ke grup WhatsApp kapan saja.",
  "Dana arisan tetap langsung ke rekening admin.",
];

const corePlans = [
  {
    name: "Free",
    price: "Rp0",
    description: "Untuk mencoba arisan kecil.",
    cta: "Coba Gratis",
    href: "/login",
    features: [
      "5 anggota",
      "50 bukti/bulan",
      "Unlimited chat ke bot",
      "Unlimited cek status bayar",
      "Unlimited lihat rekap",
      "Support standar",
    ],
  },
  {
    name: "Basic",
    price: "Rp25.000",
    description: "Untuk arisan rutin yang ringkas.",
    cta: "Pilih Basic",
    href: "/login",
    features: [
      "15 anggota",
      "Bukti transfer unlimited",
      "Unlimited chat ke bot",
      "Unlimited cek status bayar",
      "Unlimited lihat rekap",
      "Teks rekap siap salin",
      "Support standar",
    ],
  },
  {
    name: "Pro",
    price: "Rp50.000",
    description: "Ruang yang pas untuk arisan aktif.",
    cta: "Pilih Pro",
    href: "/login",
    recommended: true,
    features: [
      "30 anggota",
      "Bukti transfer unlimited",
      "Unlimited chat ke bot",
      "Unlimited cek status bayar",
      "Unlimited lihat rekap",
      "Teks rekap siap salin",
      "Prioritas support",
    ],
  },
  {
    name: "Premium",
    price: "Rp100.000",
    description: "Untuk kelompok yang lebih besar.",
    cta: "Pilih Premium",
    href: "/login",
    features: [
      "75 anggota",
      "Bukti transfer unlimited",
      "Unlimited chat ke bot",
      "Unlimited cek status bayar",
      "Unlimited lihat rekap",
      "Teks rekap siap salin",
      "Prioritas support",
    ],
  },
];

const customPlanFeatures = [
  "Jumlah anggota lebih banyak",
  "Bukti transfer unlimited",
  "Penyesuaian kebutuhan grup",
  "Support prioritas",
];

const faqs = [
  {
    question: "Apakah MyArisan memegang uang arisan?",
    answer:
      "Tidak. Uang tetap ditransfer ke rekening atau e-wallet admin. MyArisan hanya membantu mencatat bukti dan rekap.",
  },
  {
    question: "Apakah bot masuk ke grup WhatsApp?",
    answer:
      "Tidak untuk MVP. Admin tetap memakai grup seperti biasa, lalu rekap dari MyArisan bisa disalin ke grup.",
  },
  {
    question: "Apakah pembayaran otomatis langsung diterima?",
    answer:
      "Tidak. Bukti masuk sebagai Menunggu Dicek dan admin tetap yang menerima atau menolak.",
  },
  {
    question: "Apakah perlu OTP WhatsApp untuk login?",
    answer:
      "Tidak. Pengguna login memakai nomor WhatsApp dan PIN pribadi 4 angka.",
  },
  {
    question: "Berapa batas baca bukti otomatis tiap bulan?",
    answer:
      "Paket Free bisa membaca 50 bukti otomatis per bulan. Semua paket berbayar mendapat baca bukti unlimited. Kalau kuota Free habis, admin tetap bisa mencatat pembayaran manual dari dashboard.",
  },
];

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[590px] lg:mr-0">
      <div className="absolute -inset-6 rounded-[3rem] bg-[radial-gradient(circle_at_50%_40%,rgba(100,203,159,0.28),transparent_65%)] blur-2xl" />
      <div className="relative grid items-end gap-4 sm:grid-cols-[1fr_0.78fr]">
        <div className="relative mx-auto w-full max-w-[330px] rounded-[2.5rem] border-[7px] border-[#17352e] bg-[#eef4f1] p-2 shadow-[0_35px_90px_-30px_rgba(23,63,53,0.45)]">
          <div className="overflow-hidden rounded-[1.9rem] bg-[#f6f4ef]">
            <div className="flex items-center gap-3 bg-[#174d3f] px-4 py-4 text-white">
              <div className="grid size-9 place-items-center rounded-full bg-white/15">
                <BrandMark className="size-7" />
              </div>
              <div>
                <p className="text-sm font-bold">MyArisan</p>
                <p className="text-[10px] text-white/65">asisten arisan</p>
              </div>
            </div>
            <div className="space-y-3 bg-[linear-gradient(rgba(246,244,239,.9),rgba(246,244,239,.9)),radial-gradient(#c9d9d2_1px,transparent_1px)] bg-[size:auto,14px_14px] p-4 text-[11px] leading-relaxed">
              <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-tr-sm bg-[#dff4e7] px-3 py-2 shadow-sm">
                bayar
                <span className="ml-2 text-[9px] text-[#74837d]">09.12</span>
              </div>
              <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 shadow-sm">
                <p className="font-bold text-[#18352e]">Setoran Arisan Ceria</p>
                <p className="mt-1 text-[#65736e]">
                  Nominal: <b className="text-[#18352e]">Rp500.000</b>
                  <br />
                  BCA • 1234567890
                  <br />
                  a.n. Siti Rahma
                </p>
              </div>
              <div className="ml-auto w-[72%] rounded-2xl rounded-tr-sm bg-[#dff4e7] p-2 shadow-sm">
                <div className="grid h-24 place-items-center rounded-xl border border-[#b8d9c7] bg-[linear-gradient(135deg,#eff7f2,#d7ece0)]">
                  <div className="text-center text-[#5e7a6e]">
                    <ImageIcon className="mx-auto mb-1 size-5" />
                    <span className="text-[9px] font-semibold">Bukti transfer</span>
                  </div>
                </div>
              </div>
              <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 shadow-sm">
                Bukti bayar diterima ✅
                <br />
                <span className="font-bold text-[#b66b24]">
                  Status: menunggu dicek admin.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mb-6 rounded-[1.75rem] border border-white/80 bg-white/85 p-4 shadow-[0_25px_70px_-32px_rgba(23,63,53,0.55)] backdrop-blur-xl sm:-ml-14">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-[#7a8983] uppercase">
                Periode Juni
              </p>
              <p className="mt-1 text-sm font-extrabold text-[#18352e]">
                Rekap setoran
              </p>
            </div>
            <span className="rounded-full bg-[#e7f7f0] px-2 py-1 text-[9px] font-bold text-[#13795b]">
              12 anggota
            </span>
          </div>
          <div className="space-y-2">
            {[
              ["Sudah Bayar", "8", "bg-[#dff4e7]", "text-[#13795b]"],
              ["Belum Bayar", "3", "bg-[#f8e8eb]", "text-[#a54052]"],
              ["Menunggu Dicek", "1", "bg-[#fff0e5]", "text-[#ad5d2d]"],
            ].map(([label, value, bg, text]) => (
              <div
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5",
                  bg,
                )}
                key={label}
              >
                <span className={cn("text-[10px] font-bold", text)}>{label}</span>
                <span className={cn("text-base font-extrabold", text)}>{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-[#b9cfc6] px-3 py-2 text-[10px] font-bold text-[#44655a]">
            <Copy className="size-3.5" />
            Rekap siap disalin
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
}: {
  plan: (typeof corePlans)[number];
}) {
  const recommended = Boolean(plan.recommended);

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-[1.75rem] border p-6 transition-transform duration-300 hover:-translate-y-1",
        recommended
          ? "border-[#2f9470] bg-[#173f35] text-white shadow-[0_30px_75px_-35px_#173f35] xl:-translate-y-4 xl:hover:-translate-y-5"
          : "border-[#e0ddd6] bg-[#fbfaf7] shadow-[0_14px_40px_-32px_rgba(23,63,53,0.5)]",
      )}
    >
      {recommended ? (
        <div className="absolute -top-3 left-6 rounded-full bg-[#c9f0df] px-3 py-1.5 text-[10px] font-extrabold tracking-[0.12em] text-[#155b45] uppercase shadow-sm">
          Paling pas
        </div>
      ) : null}
      <p
        className={cn(
          "text-sm font-extrabold",
          recommended ? "text-[#c9f0df]" : "text-[#13795b]",
        )}
      >
        {plan.name}
      </p>
      <div className="mt-5 flex items-end gap-1">
        <span className="text-3xl font-extrabold tracking-[-0.04em]">
          {plan.price}
        </span>
        {plan.price !== "Rp0" ? (
          <span
            className={cn(
              "pb-1 text-xs",
              recommended ? "text-white/55" : "text-[#7d8985]",
            )}
          >
            /bulan
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-3 min-h-12 text-sm leading-6",
          recommended ? "text-white/65" : "text-[#65736e]",
        )}
      >
        {plan.description}
      </p>
      <div
        className={cn("my-6 h-px", recommended ? "bg-white/15" : "bg-[#e3e0da]")}
      />
      <ul className="space-y-3">
        {plan.features.map((feature) => (
          <li
            className="flex items-start gap-2.5 text-[13px] font-semibold leading-5"
            key={feature}
          >
            <CheckCircle2
              className={cn(
                "mt-0.5 size-4 shrink-0",
                recommended ? "text-[#92dbbc]" : "text-[#39906f]",
              )}
            />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        className={cn(
          buttonVariants({ size: "lg", variant: recommended ? "secondary" : "outline" }),
          "mt-8 h-11 rounded-xl font-bold",
          recommended
            ? "border-0 bg-white text-[#173f35] hover:bg-[#edf7f2]"
            : "border-[#cbd9d3]",
        )}
        href={plan.href}
      >
        {plan.cta}
      </Link>
    </article>
  );
}

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#f8f5ef] text-[#18352e]">
      <LandingNav />

      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#fbfaf7_0%,#f4efe6_100%)] pt-28 pb-16 lg:pt-32 lg:pb-24">
        <HeroBackdrop />
        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-10">
          <Reveal>
            <div className="max-w-2xl">
              <Eyebrow>
                <Sparkles className="size-3.5" />
                Dari bukti transfer sampai rekap grup
              </Eyebrow>
              <h1 className="mt-6 text-[2.65rem] font-extrabold leading-[1.04] tracking-[-0.055em] text-balance text-[#17352e] sm:text-6xl lg:text-[4.3rem]">
                Rekap arisan jadi rapi{" "}
                <span className="relative inline-block">
                  <GradientText>tanpa scroll</GradientText>
                  <svg
                    aria-hidden="true"
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 300 14"
                  >
                    <path
                      d="M3 9C75 2 217 2 297 7"
                      fill="none"
                      stroke="#b5ddcb"
                      strokeLinecap="round"
                      strokeWidth="7"
                    />
                  </svg>
                </span>{" "}
                bukti transfer satu-satu.
              </h1>
              <p className="mt-7 max-w-xl text-base leading-8 text-pretty text-[#5d6d67] sm:text-lg">
                MyArisan membantu admin arisan mencatat bukti setoran, melihat
                siapa yang sudah atau belum bayar, dan membuat rekap siap kirim
                ke grup WhatsApp.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 rounded-xl bg-[#13795b] px-6 text-sm font-bold shadow-[0_14px_35px_-14px_#13795b] hover:bg-[#0f654c]",
                  )}
                  href="/login"
                >
                  Coba Gratis <ArrowRight className="size-4" />
                </Link>
                <a
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-12 rounded-xl border-[#cbd9d3] bg-white/70 px-6 text-sm font-bold backdrop-blur",
                  )}
                  href="#cara-kerja"
                >
                  Lihat Cara Kerja
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#64736e]">
                {heroHighlights.map((item) => (
                  <span className="flex items-center gap-1.5" key={item}>
                    <CheckCircle2 className="size-4 text-[#39906f]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <HeroVisual />
          </Reveal>
        </div>
      </section>

      <section className="border-y border-[#e8e3d9] bg-[#fbfaf7]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 py-6 text-xs font-bold text-[#6c7b76] sm:px-8">
          <span className="text-[#9aa6a1]">Cocok untuk</span>
          {useCases.map((useCase) => (
            <span className="flex items-center gap-2" key={useCase}>
              <span className="size-1.5 rounded-full bg-[#bcd5cb]" />
              {useCase}
            </span>
          ))}
        </div>
      </section>

      <section className="bg-[#183f35] px-5 py-20 text-white sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeading
              eyebrow="Yang sering terjadi"
              title="Masalah arisan biasanya bukan di uangnya, tapi di catatannya."
              description="Satu transfer mungkin sederhana. Tapi ketika belasan bukti datang di jam berbeda, catatan kecil cepat berubah jadi pekerjaan besar."
              inverse
            />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {problems.map((problem, index) => (
              <Reveal delay={index * 0.06} key={problem.title}>
                <div className="group flex min-h-48 flex-col justify-between rounded-[1.6rem] border border-white/10 bg-white/[0.07] p-5 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/[0.1]">
                  <div
                    className={cn(
                      "grid size-11 place-items-center rounded-xl",
                      problem.tone,
                    )}
                  >
                    <problem.icon className="size-5" />
                  </div>
                  <div>
                    <span className="mb-3 block text-[10px] font-bold tracking-[0.16em] text-white/40">
                      0{index + 1}
                    </span>
                    <h3 className="text-base font-bold leading-6">{problem.title}</h3>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <WorkflowSection />

      <section className="px-5 py-20 sm:px-8 lg:py-28" id="fitur">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeading
              eyebrow="Fitur yang tepat guna"
              title="Yang dibutuhkan admin arisan, tanpa fitur ribet."
              description="MyArisan merapikan pekerjaan yang berulang tanpa mengambil alih keputusan penting dari admin."
            />
          </Reveal>
          <div className="mt-12 grid auto-rows-[minmax(190px,auto)] gap-4 md:grid-cols-4">
            {features.map((feature, index) => (
              <Reveal
                className={feature.className.includes("md:col-span-2") ? "md:col-span-2" : ""}
                delay={(index % 4) * 0.05}
                key={feature.title}
              >
                <article
                  className={cn(
                    "group flex h-full flex-col justify-between rounded-[1.75rem] border border-black/[0.06] p-6 shadow-[0_12px_35px_-28px_rgba(23,63,53,0.4)] transition-transform duration-300 hover:-translate-y-1",
                    feature.className.replace("md:col-span-2", ""),
                  )}
                >
                  <feature.icon className="size-6" />
                  <div className="mt-10">
                    <h3 className="text-lg font-extrabold tracking-[-0.02em]">
                      {feature.title}
                    </h3>
                    <p
                      className={cn(
                        "mt-2 text-sm leading-6",
                        feature.className.includes("text-white")
                          ? "text-white/70"
                          : "text-[#65736e]",
                      )}
                    >
                      {feature.description}
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="mt-6 flex flex-col gap-4 rounded-[1.75rem] border border-[#cfe1d9] bg-white p-6 sm:flex-row sm:items-center sm:justify-between lg:p-8">
              <div className="flex items-start gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e7f7f0] text-[#13795b]">
                  <Banknote className="size-6" />
                </div>
                <div>
                  <h3 className="font-extrabold">Dana tidak pernah mampir ke MyArisan.</h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-[#65736e]">
                    Anggota tetap transfer langsung ke rekening bank atau e-wallet
                    milik admin. MyArisan hanya membantu pencatatan.
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-full bg-[#173f35] px-4 py-2 text-xs font-bold text-white">
                Admin tetap pegang kendali
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:pb-28">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2.25rem] bg-[#e8e3fa] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative min-h-80 overflow-hidden p-8 lg:min-h-full lg:p-12">
            <div className="absolute -left-24 -top-24 size-72 rounded-full bg-[#c9f0df] blur-2xl" />
            <div className="absolute -bottom-28 right-0 size-80 rounded-full bg-[#ffdcca] blur-3xl" />
            <Reveal className="relative z-10">
              <div className="grid size-14 place-items-center rounded-2xl bg-[#173f35] text-white shadow-lg">
                <ShieldCheck className="size-7" />
              </div>
              <h2 className="mt-8 max-w-md text-3xl font-extrabold tracking-[-0.04em] text-[#18352e] sm:text-4xl">
                Dibuat untuk arisan yang rapi, transparan, dan tetap gampang
                dipakai.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-[#5f6d68]">
                MyArisan membantu admin mengelola setoran tanpa mengubah
                kebiasaan grup WhatsApp yang sudah berjalan.
              </p>
            </Reveal>
          </div>
          <div className="bg-white/75 p-6 backdrop-blur sm:p-8 lg:p-12">
            <div className="space-y-3">
              {safetyPoints.map((point, index) => (
                <Reveal delay={index * 0.06} key={point}>
                  <div className="flex items-center gap-4 rounded-2xl border border-[#ded9ec] bg-white p-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e7f7f0] text-[#13795b]">
                      <Check className="size-4" />
                    </span>
                    <p className="text-sm font-bold leading-6 text-[#29453d]">{point}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:py-28" id="harga">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionHeading
              centered
              eyebrow="Harga sederhana"
              title="Mulai gratis, naik saat arisan bertumbuh."
              description="Paket berbayar memberi baca bukti unlimited dan kapasitas anggota lebih besar. Tidak ada potongan dari dana arisan."
            />
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {corePlans.map((plan, index) => (
              <Reveal delay={index * 0.06} key={plan.name}>
                <PlanCard plan={plan} />
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="mt-4 flex flex-col gap-5 rounded-[1.75rem] border border-[#e0ddd6] bg-[#fbfaf7] p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
              <div className="max-w-xl">
                <p className="text-sm font-extrabold text-[#13795b]">Custom</p>
                <h3 className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-[#18352e]">
                  Arisan besar atau kebutuhan khusus?
                </h3>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  {customPlanFeatures.map((feature) => (
                    <span
                      className="flex items-center gap-2 text-[13px] font-semibold text-[#4a5a54]"
                      key={feature}
                    >
                      <CheckCircle2 className="size-4 text-[#39906f]" />
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              <a
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 shrink-0 rounded-xl bg-[#173f35] px-6 font-bold hover:bg-[#0f2e26]",
                )}
                href={whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                <WhatsAppIcon className="size-4" />
                Hubungi via WhatsApp
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-28" id="faq">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <Reveal>
            <div>
              <SectionHeading
                eyebrow="Pertanyaan umum"
                title="Yang perlu jelas sebelum mulai."
              />
              <p className="mt-6 text-sm leading-7 text-[#65736e]">
                Masih ada pertanyaan? Chat admin di pojok kanan bawah.
              </p>
            </div>
          </Reveal>
          <div className="divide-y divide-[#dcd9d2] border-y border-[#dcd9d2]">
            {faqs.map((faq, index) => (
              <Reveal delay={index * 0.04} key={faq.question}>
                <details className="group py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-left font-extrabold text-[#263f38] marker:content-none">
                    {faq.question}
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[#13795b] transition-transform group-open:rotate-180">
                      <ChevronDown className="size-4" />
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-[#65736e]">
                    {faq.answer}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-8 sm:px-8">
        <Reveal>
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#173f35] px-6 py-16 text-center text-white sm:px-10 lg:py-24">
            <div className="absolute left-[10%] top-0 size-56 rounded-full bg-[#25765c] blur-3xl" />
            <div className="absolute bottom-0 right-[8%] size-64 rounded-full bg-[#6750a4]/40 blur-3xl" />
            <div className="relative z-10 mx-auto max-w-3xl">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/10">
                <WalletCards className="size-7 text-[#c9f0df]" />
              </div>
              <h2 className="mt-7 text-3xl font-extrabold tracking-[-0.045em] sm:text-5xl">
                Siap bikin rekap arisan lebih tenang?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
                Mulai dari arisan yang sedang berjalan. Rapikan bukti, status,
                dan rekap tanpa mengubah kebiasaan grup.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 rounded-xl bg-white px-6 font-bold text-[#173f35] hover:bg-[#edf7f2]",
                  )}
                  href="/login"
                >
                  Coba Gratis <ArrowRight className="size-4" />
                </Link>
                <Link
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-12 rounded-xl border-white/20 bg-white/5 px-6 font-bold text-white hover:bg-white/10 hover:text-white",
                  )}
                  href="/app"
                >
                  Masuk Dashboard
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 border-t border-[#dcd9d2] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Link className="flex items-center gap-2.5 font-extrabold" href="/">
            <BrandMark className="size-9" />
            MyArisan
          </Link>
          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-[#65736e]">
            <Link className="hover:text-[#13795b]" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="hover:text-[#13795b]" href="/terms">
              Terms
            </Link>
            <Link className="hover:text-[#13795b]" href="/data-deletion">
              Data Deletion
            </Link>
            <a
              className="inline-flex items-center gap-1.5 hover:text-[#13795b]"
              href={whatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              <WhatsAppIcon className="size-4 text-[#13795b]" />
              WhatsApp: 085148360457
            </a>
          </nav>
          <p className="text-xs text-[#87918d]">© 2026 MyArisan</p>
        </div>
      </footer>

      <FloatingWhatsAppCta href={whatsappUrl} />
    </main>
  );
}
