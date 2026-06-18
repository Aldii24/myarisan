"use client";

import { motion, useReducedMotion } from "motion/react";

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M20.5 11.8a8.45 8.45 0 0 1-12.46 7.43L3.5 20.5l1.23-4.39A8.46 8.46 0 1 1 20.5 11.8Z"
        fill="currentColor"
      />
      <path
        d="M8.15 7.42c.2-.46.42-.47.62-.48h.53c.17 0 .44.07.67.58.23.52.8 1.95.87 2.09.07.14.12.3.02.48-.09.19-.14.3-.28.46-.14.16-.3.35-.43.47-.14.14-.28.29-.12.57.16.28.7 1.15 1.5 1.86 1.03.91 1.9 1.2 2.18 1.34.28.14.44.12.6-.07.17-.18.7-.81.9-1.09.18-.28.37-.23.62-.14.26.1 1.62.77 1.9.91.28.14.47.21.54.33.07.12.07.68-.16 1.34-.23.65-1.36 1.25-1.87 1.33-.48.08-1.1.12-1.77-.09-.41-.13-.94-.3-1.62-.6-.72-.31-3.15-1.17-5.35-4.1-.62-.82-1.04-1.74-1.16-2.02-.12-.28-1.31-3.16.37-4.33Z"
        fill="white"
      />
    </svg>
  );
}

export function FloatingWhatsAppCta({ href }: { href: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="fixed right-4 bottom-5 z-40 sm:right-6 sm:bottom-6"
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
      transition={{ delay: 0.45, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.span
        aria-hidden="true"
        animate={
          reduceMotion
            ? undefined
            : {
                opacity: [0.22, 0.42, 0.22],
                scale: [0.96, 1.08, 0.96],
              }
        }
        className="pointer-events-none absolute -inset-1.5 rounded-full bg-[#76d6ae]/45 blur-xl"
        transition={{
          duration: 3.8,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
      <motion.a
        aria-label="Chat WhatsApp MyArisan"
        className="group relative flex min-h-13 items-center gap-2.5 overflow-hidden rounded-full border border-white/45 bg-[linear-gradient(135deg,rgba(20,126,94,0.84),rgba(10,82,62,0.9))] py-2 pr-4 pl-2.5 text-white shadow-[0_18px_45px_-16px_rgba(13,91,68,0.78),0_4px_14px_rgba(23,63,53,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] outline-none backdrop-blur-xl transition-[background,box-shadow,border-color] duration-300 hover:border-white/60 hover:bg-[linear-gradient(135deg,rgba(23,141,105,0.9),rgba(11,93,69,0.94))] hover:shadow-[0_22px_55px_-15px_rgba(13,91,68,0.88),0_6px_18px_rgba(23,63,53,0.24),inset_0_1px_0_rgba(255,255,255,0.28)] focus-visible:ring-4 focus-visible:ring-[#92dbbc]/65 sm:min-h-15 sm:gap-3 sm:py-2.5 sm:pr-5 sm:pl-3"
        href={href}
        rel="noreferrer"
        target="_blank"
        whileHover={reduceMotion ? undefined : { y: -3, scale: 1.02 }}
        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
        />
        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-colors duration-300 group-hover:bg-white/18 sm:size-9">
          <WhatsAppIcon className="size-5 sm:size-[22px]" />
        </span>
        <span className="flex flex-col text-left">
          <span className="text-[11px] font-extrabold leading-tight whitespace-nowrap drop-shadow-sm sm:text-xs">
            Chat WhatsApp
          </span>
          <span className="mt-0.5 hidden text-[9px] font-semibold leading-tight text-white/70 sm:block">
            Tanya MyArisan
          </span>
        </span>
      </motion.a>
    </motion.div>
  );
}
