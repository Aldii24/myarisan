"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  { href: "#cara-kerja", id: "cara-kerja", label: "Cara Kerja" },
  { href: "#fitur", id: "fitur", label: "Fitur" },
  { href: "#harga", id: "harga", label: "Harga" },
  { href: "#faq", id: "faq", label: "FAQ" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) {
        return;
      }
      frame = requestAnimationFrame(() => {
        frame = 0;
        setScrolled(window.scrollY > 8);
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        setProgress(docHeight > 0 ? window.scrollY / docHeight : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

  useEffect(() => {
    const sections = links
      .map((link) => document.getElementById(link.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setActive(visible.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <nav
        className={cn(
          "mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl border px-4 transition-all duration-300 sm:px-5",
          scrolled
            ? "border-white/70 bg-[#fbfaf7]/90 shadow-[0_16px_50px_-26px_rgba(23,63,53,0.45)] backdrop-blur-xl"
            : "border-transparent bg-[#fbfaf7]/55 shadow-none backdrop-blur-md",
        )}
      >
        <Link
          className="flex items-center gap-2.5 font-extrabold tracking-[-0.02em]"
          href="/"
        >
          <BrandMark className="size-9" />
          MyArisan
        </Link>
        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <a
              className={cn(
                "rounded-full px-3.5 py-2 text-xs font-bold transition-colors",
                active === link.id
                  ? "bg-[#e7f7f0] text-[#0f654c]"
                  : "text-[#52645e] hover:text-[#13795b]",
              )}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Link
            className={cn(buttonVariants({ variant: "ghost" }), "h-10 px-4 font-bold")}
            href="/login"
          >
            Masuk
          </Link>
          <Link
            className={cn(
              buttonVariants(),
              "h-10 rounded-xl bg-[#13795b] px-4 font-bold shadow-[0_12px_30px_-14px_#13795b] hover:bg-[#0f654c]",
            )}
            href="/login"
          >
            Coba Gratis
          </Link>
        </div>
        <Sheet>
          <SheetTrigger
            aria-label="Buka menu"
            className="grid size-10 place-items-center rounded-xl border border-[#d8dfdb] bg-white text-[#24443a] sm:hidden"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent className="bg-[#fbfaf7] p-2" side="right">
            <SheetHeader className="p-4">
              <SheetTitle className="flex items-center gap-2.5 text-lg font-extrabold">
                <BrandMark className="size-9" />
                MyArisan
              </SheetTitle>
              <SheetDescription>Navigasi halaman MyArisan</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-3 pt-4">
              {links.map((link) => (
                <SheetClose
                  key={link.href}
                  render={
                    <a
                      className="rounded-xl px-4 py-3 text-sm font-bold text-[#314b43] hover:bg-[#e7f7f0]"
                      href={link.href}
                    />
                  }
                >
                  {link.label}
                </SheetClose>
              ))}
            </div>
            <div className="mt-auto grid gap-2 p-3">
              <SheetClose
                render={
                  <Link
                    className={cn(
                      buttonVariants({ size: "lg", variant: "outline" }),
                      "h-11 rounded-xl font-bold",
                    )}
                    href="/login"
                  />
                }
              >
                Masuk
              </SheetClose>
              <SheetClose
                render={
                  <Link
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "h-11 rounded-xl bg-[#13795b] font-bold",
                    )}
                    href="/login"
                  />
                }
              >
                Coba Gratis
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
      <div className="mx-auto mt-1 h-0.5 max-w-7xl overflow-hidden rounded-full">
        <div
          className="h-full origin-left rounded-full bg-gradient-to-r from-[#13795b] to-[#2fae84] transition-transform duration-150"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </header>
  );
}
