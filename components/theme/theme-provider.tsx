"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

// Lightweight, dependency-free theme store. The initial `.dark` class is set
// before paint by the inline script in app/layout.tsx; this store keeps every
// mounted toggle in sync at runtime via a module-level listener set.
const listeners = new Set<() => void>();

function isDark(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  return document.documentElement.classList.contains("dark");
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function setTheme(theme: Theme) {
  const dark = theme === "dark";
  document.documentElement.classList.toggle("dark", dark);

  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Ignore storage failures (private mode, disabled cookies, etc.).
  }

  emit();
}

export function toggleTheme() {
  setTheme(isDark() ? "light" : "dark");
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/** Returns the active theme, re-rendering the caller when it changes. */
export function useTheme(): Theme {
  const dark = useSyncExternalStore(
    subscribe,
    () => isDark(),
    () => false,
  );

  return dark ? "dark" : "light";
}
