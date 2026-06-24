"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Click-to-zoom proof thumbnail. The owner taps the small preview to open the
// full payment proof in a full-screen overlay (tap the backdrop, the ✕ button,
// or press Esc to close). Raw <img> on purpose — the src is an auth-gated proxy
// route, not a statically optimizable asset.
//
// The overlay is rendered through a portal to <body>: the owner card it lives in
// uses backdrop-blur (a backdrop-filter), which would otherwise become the
// containing block for `position: fixed` and trap/clip the overlay inside the
// card instead of covering the viewport.
export function ProofPreview({ alt, src }: { alt: string; src: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        aria-label="Lihat bukti pembayaran"
        className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border shadow-sm"
        onClick={() => setOpen(true)}
        type="button"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={alt}
          className="h-full w-full object-cover transition group-hover:scale-105"
          src={src}
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-semibold text-white/0 transition group-hover:bg-black/40 group-hover:text-white">
          Perbesar
        </span>
      </button>

      {open
        ? createPortal(
            <div
              aria-modal="true"
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
              onClick={() => setOpen(false)}
              role="dialog"
            >
              <button
                aria-label="Tutup"
                className="fixed right-4 top-4 z-[110] flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-black/60 text-2xl font-semibold leading-none text-white shadow-lg active:scale-95"
                onClick={() => setOpen(false)}
                type="button"
              >
                ✕
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={alt}
                className="max-h-[90dvh] max-w-[94vw] rounded-2xl object-contain shadow-2xl"
                onClick={(event) => event.stopPropagation()}
                src={src}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
