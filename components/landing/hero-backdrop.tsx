"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// three.js is loaded only after first paint, behind ssr:false, so it never
// blocks the hero's initial render.
const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

type IdleWindow = Window & {
  cancelIdleCallback?: (id: number) => void;
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
};

export function HeroBackdrop() {
  const [showScene, setShowScene] = useState(false);

  useEffect(() => {
    const win = window as IdleWindow;
    const prefersReducedMotion = win.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isLargeScreen = win.matchMedia("(min-width: 1024px)").matches;
    const hasFinePointer = win.matchMedia("(pointer: fine)").matches;

    // Keep the WebGL scene off where it would hurt (reduced motion, mobile,
    // touch). The CSS fallback below is always shown.
    if (prefersReducedMotion || !isLargeScreen || !hasFinePointer) {
      return;
    }

    const schedule = win.requestIdleCallback
      ? win.requestIdleCallback(() => setShowScene(true), { timeout: 1500 })
      : window.setTimeout(() => setShowScene(true), 600);

    return () => {
      if (win.cancelIdleCallback) {
        win.cancelIdleCallback(schedule);
      } else {
        clearTimeout(schedule);
      }
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Instant gradient fallback — renders immediately, WebGL fades over it. */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(100,203,159,0.30),transparent_60%),radial-gradient(circle_at_12%_82%,rgba(103,80,164,0.14),transparent_55%)]" />
      {showScene ? (
        <div
          className="absolute inset-0 [mask-image:radial-gradient(circle_at_62%_42%,black,transparent_78%)]"
          style={{ animation: "heroFadeIn 1.2s ease forwards", opacity: 0 }}
        >
          <HeroScene />
        </div>
      ) : null}
    </div>
  );
}
