"use client";

import { useEffect, useState } from "react";

// Click-to-zoom proof thumbnail. The owner taps the small preview to open the
// full payment proof in a full-screen overlay (tap anywhere or press Esc to
// close). Raw <img> on purpose — the src is an auth-gated proxy route, not a
// statically optimizable asset.
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
        className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/70 shadow-sm"
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

      {open ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
        >
          <button
            aria-label="Tutup"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl font-semibold text-white hover:bg-white/25"
            onClick={() => setOpen(false)}
            type="button"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={alt}
            className="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            src={src}
          />
        </div>
      ) : null}
    </>
  );
}
