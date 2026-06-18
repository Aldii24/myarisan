"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

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
  { label: "Cara Kerja", href: "#cara-kerja" },
  { label: "Fitur", href: "#fitur" },
  { label: "Harga", href: "#harga" },
  { label: "FAQ", href: "#faq" },
];

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl border border-white/70 bg-[#fbfaf7]/85 px-4 shadow-[0_12px_45px_-24px_rgba(23,63,53,0.35)] backdrop-blur-xl sm:px-5">
        <Link className="flex items-center gap-2.5 font-extrabold tracking-[-0.02em]" href="/">
          <BrandMark className="size-9" />
          MyArisan
        </Link>
        <div className="hidden items-center gap-7 lg:flex">
          {links.map((link) => (
            <a
              className="text-xs font-bold text-[#52645e] transition-colors hover:text-[#13795b]"
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
              "h-10 rounded-xl bg-[#13795b] px-4 font-bold hover:bg-[#0f654c]",
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
                      buttonVariants({ variant: "outline", size: "lg" }),
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
    </header>
  );
}
