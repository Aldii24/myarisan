"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BadgeCheck,
  Check,
  Copy,
  ImageIcon,
  MessageSquareText,
  PlusCircle,
  Send,
} from "lucide-react";

import { cn } from "@/lib/utils";

const steps = [
  {
    title: "Admin buat arisan",
    description:
      "Isi nama arisan, nominal setoran, batas setor, dan rekening admin.",
    icon: PlusCircle,
    visual: "create",
  },
  {
    title: "Bagikan kode JOIN",
    description: "Admin kirim kode join ke grup WhatsApp arisan.",
    icon: Send,
    visual: "join",
  },
  {
    title: "Anggota kirim bukti",
    description:
      "Anggota transfer ke rekening admin lalu kirim bukti ke MyArisan.",
    icon: ImageIcon,
    visual: "proof",
  },
  {
    title: "Admin konfirmasi",
    description:
      "Bukti masuk ke dashboard sebagai Menunggu Dicek. Admin tetap yang menerima atau menolak.",
    icon: BadgeCheck,
    visual: "confirm",
  },
  {
    title: "Rekap siap disalin",
    description:
      "MyArisan membuat rekap siapa sudah bayar, belum bayar, dan total terkumpul.",
    icon: Copy,
    visual: "recap",
  },
];

function WorkflowMockup({ active }: { active: number }) {
  const step = steps[active];

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute -inset-8 rounded-full bg-[#a9dbc6]/25 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[#f8f5ef] p-3 shadow-[0_40px_100px_-45px_rgba(12,47,38,0.55)] sm:p-5">
        <div className="flex items-center justify-between rounded-2xl bg-[#173f35] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-white/10">
              <step.icon className="size-4 text-[#c9f0df]" />
            </div>
            <div>
              <p className="text-[9px] font-bold tracking-[0.12em] text-white/45 uppercase">
                Langkah {active + 1} dari 5
              </p>
              <p className="text-xs font-bold">{step.title}</p>
            </div>
          </div>
          <div className="flex gap-1">
            {steps.map((item, index) => (
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === active ? "w-5 bg-[#91d9ba]" : "w-1.5 bg-white/20",
                )}
                key={item.title}
              />
            ))}
          </div>
        </div>

        <div className="relative mt-3 min-h-[350px] overflow-hidden rounded-2xl border border-[#e0ddd6] bg-white p-4 sm:min-h-[390px] sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute inset-0 p-4 sm:p-6"
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              key={step.visual}
              transition={{ duration: 0.28 }}
            >
              {step.visual === "create" ? <CreateVisual /> : null}
              {step.visual === "join" ? <JoinVisual /> : null}
              {step.visual === "proof" ? <ProofVisual /> : null}
              {step.visual === "confirm" ? <ConfirmVisual /> : null}
              {step.visual === "recap" ? <RecapVisual /> : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function CreateVisual() {
  return (
    <div>
      <p className="text-xs font-bold text-[#718079]">Arisan baru</p>
      <h3 className="mt-1 text-xl font-extrabold text-[#18352e]">Atur sekali, pakai tiap periode.</h3>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          ["Nama arisan", "Arisan Ceria"],
          ["Setoran", "Rp500.000"],
          ["Batas setor", "Tanggal 10"],
          ["Rekening admin", "BCA •••• 7890"],
        ].map(([label, value]) => (
          <div className="rounded-2xl border border-[#e2dfd8] bg-[#fbfaf7] p-4" key={label}>
            <p className="text-[9px] font-bold tracking-[0.1em] text-[#8a9691] uppercase">{label}</p>
            <p className="mt-2 text-sm font-extrabold text-[#29483f]">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#e7f7f0] p-3 text-xs font-bold text-[#17694f]">
        <Check className="size-4" /> Siap menerima anggota
      </div>
    </div>
  );
}

function JoinVisual() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-[#eeeafd] text-[#6750a4]">
        <MessageSquareText className="size-7" />
      </div>
      <p className="mt-5 text-xs font-bold text-[#718079]">Kode anggota</p>
      <div className="mt-2 rounded-2xl border-2 border-dashed border-[#97cbb5] bg-[#f0faf5] px-8 py-4 text-3xl font-black tracking-[0.18em] text-[#13795b]">
        CERIA28
      </div>
      <div className="mt-6 w-full max-w-sm rounded-2xl bg-[#f3f5f4] p-4 text-left text-xs leading-6 text-[#536761]">
        Hai teman-teman 👋 Gabung ke Arisan Ceria lewat MyArisan dengan kode{" "}
        <b className="text-[#18352e]">CERIA28</b>.
      </div>
    </div>
  );
}

function ProofVisual() {
  return (
    <div className="grid h-full items-center gap-4 sm:grid-cols-[0.82fr_1.18fr]">
      <div className="rounded-[1.5rem] border-[5px] border-[#26483f] bg-[#eef4f1] p-2">
        <div className="rounded-[1.05rem] bg-[#f5f2ec] p-3">
          <p className="text-[9px] font-bold text-[#718079]">Chat MyArisan</p>
          <div className="mt-4 ml-auto rounded-xl rounded-tr-sm bg-[#dff4e7] px-3 py-2 text-[10px]">
            bayar
          </div>
          <div className="mt-2 rounded-xl rounded-tl-sm bg-white p-3 text-[9px] leading-5 shadow-sm">
            Transfer Rp500.000 ke BCA •••• 7890
          </div>
          <div className="mt-2 ml-auto grid h-20 w-3/4 place-items-center rounded-xl rounded-tr-sm bg-[#dff4e7] text-[#5e7a6e]">
            <ImageIcon className="size-5" />
          </div>
        </div>
      </div>
      <div>
        <span className="rounded-full bg-[#fff0e5] px-3 py-1.5 text-[9px] font-bold text-[#ad5d2d]">
          Dibaca otomatis
        </span>
        <h3 className="mt-4 text-xl font-extrabold tracking-[-0.03em] text-[#18352e]">
          Foto masuk, detail setoran ikut tercatat.
        </h3>
        <div className="mt-5 space-y-2">
          {["Nominal Rp500.000", "Tanggal 8 Juni", "Pengirim Nabila"].map((item) => (
            <div className="flex items-center gap-2 rounded-xl bg-[#f3f5f4] p-3 text-xs font-bold text-[#455d55]" key={item}>
              <Check className="size-3.5 text-[#39906f]" /> {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfirmVisual() {
  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-[#718079]">Bukti terbaru</p>
          <h3 className="mt-1 text-xl font-extrabold text-[#18352e]">Menunggu Dicek</h3>
        </div>
        <span className="rounded-full bg-[#fff0e5] px-3 py-1.5 text-[9px] font-bold text-[#ad5d2d]">
          Perlu admin
        </span>
      </div>
      <div className="mt-5 rounded-2xl border border-[#e2dfd8] p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-[#e7f2ff] font-extrabold text-[#316ca5]">N</div>
          <div>
            <p className="text-sm font-extrabold">Nabila Putri</p>
            <p className="text-[10px] text-[#75837e]">Rp500.000 • 8 Juni, 09.12</p>
          </div>
        </div>
        <div className="mt-4 grid h-28 place-items-center rounded-xl bg-[linear-gradient(135deg,#eef5f1,#d9e9e1)] text-[#638074]">
          <ImageIcon className="size-7" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="rounded-xl border border-[#e1b9be] px-3 py-2.5 text-xs font-bold text-[#a54052]">Tolak</button>
          <button className="rounded-xl bg-[#13795b] px-3 py-2.5 text-xs font-bold text-white">Terima</button>
        </div>
      </div>
    </div>
  );
}

function RecapVisual() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-[#718079]">Periode Juni</p>
          <h3 className="mt-1 text-xl font-extrabold text-[#18352e]">Rekap siap kirim</h3>
        </div>
        <div className="rounded-xl bg-[#e7f7f0] px-3 py-2 text-right">
          <p className="text-[8px] font-bold text-[#6a8178]">TERKUMPUL</p>
          <p className="text-sm font-extrabold text-[#13795b]">Rp4.000.000</p>
        </div>
      </div>
      <div className="mt-5 rounded-2xl bg-[#f5f6f4] p-4 font-mono text-[10px] leading-6 text-[#4d625b]">
        <p className="font-bold text-[#18352e]">REKAP ARISAN CERIA — JUNI</p>
        <p className="mt-2">✅ Sudah bayar (8)</p>
        <p>Nabila, Rani, Dita, Sari, ...</p>
        <p className="mt-2">⏳ Belum bayar (3)</p>
        <p>Ayu, Indah, Wulan</p>
        <p className="mt-2">🔎 Menunggu dicek (1)</p>
        <p>Maya</p>
      </div>
      <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#173f35] px-4 py-3 text-xs font-bold text-white">
        <Copy className="size-4" /> Salin ke Grup
      </button>
    </div>
  );
}

export function WorkflowSection() {
  const [active, setActive] = useState(0);
  const scope = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reduceMotion || !scope.current) return;

      const cards = gsap.utils.toArray<HTMLElement>("[data-workflow-step]");
      gsap.set(cards, { opacity: 0, x: -24 });

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;

          gsap.to(cards, {
            opacity: 1,
            x: 0,
            duration: 0.55,
            stagger: 0.08,
            ease: "power3.out",
          });
          observer.disconnect();
        },
        { threshold: 0.18 },
      );

      observer.observe(scope.current);

      return () => {
        observer.disconnect();
      };
    },
    { scope, dependencies: [reduceMotion] },
  );

  return (
    <section
      className="relative bg-[#edf7f2] px-5 py-20 sm:px-8 lg:py-28"
      id="cara-kerja"
      ref={scope}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_28%,rgba(195,183,244,0.34),transparent_27%),radial-gradient(circle_at_85%_70%,rgba(255,209,181,0.32),transparent_25%)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs font-bold tracking-[0.18em] text-[#13795b] uppercase">
            Alur yang mudah diikuti
          </p>
          <h2 className="text-3xl font-extrabold tracking-[-0.04em] text-[#18352e] sm:text-4xl lg:text-5xl">
            Cara kerja MyArisan
          </h2>
          <p className="mt-5 text-base leading-7 text-[#64736e] sm:text-lg">
            Tetap transfer ke admin, tetap berbagi kabar di grup. MyArisan
            merapikan jalur di antaranya.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16">
          <div className="space-y-3">
            {steps.map((step, index) => (
              <button
                className={cn(
                  "group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all sm:p-5",
                  active === index
                    ? "border-[#74b99d] bg-white shadow-[0_18px_55px_-35px_rgba(23,63,53,0.6)]"
                    : "border-transparent bg-white/45 hover:border-white hover:bg-white/70",
                )}
                data-workflow-step
                key={step.title}
                onClick={() => setActive(index)}
                type="button"
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 w-1 transition-colors",
                    active === index ? "bg-[#13795b]" : "bg-transparent",
                  )}
                />
                <div className="flex gap-4">
                  <div
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold transition-colors",
                      active === index
                        ? "bg-[#173f35] text-white"
                        : "bg-white text-[#6c7b76]",
                    )}
                  >
                    0{index + 1}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#24443a]">{step.title}</h3>
                    <p className="mt-1.5 text-xs leading-5 text-[#6a7873] sm:text-sm sm:leading-6">
                      {step.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="lg:sticky lg:top-28">
            <WorkflowMockup active={active} />
          </div>
        </div>
      </div>
    </section>
  );
}
