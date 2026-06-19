"use client";

import { ArrowRight, KeyRound, Phone, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { registerAction, type RegisterFormState } from "./actions";

const initialState: RegisterFormState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Nama kamu</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            autoComplete="name"
            className="h-12 bg-white pl-10 text-base shadow-sm md:text-sm"
            id="name"
            name="name"
            placeholder="Contoh: Sinta"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Nomor WhatsApp</Label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            autoComplete="tel"
            className="h-12 bg-white pl-10 text-base shadow-sm md:text-sm"
            id="phone"
            inputMode="tel"
            name="phone"
            placeholder="081234567890"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pin">Buat PIN 4 angka</Label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            autoComplete="new-password"
            className="h-12 bg-white pl-10 text-base tracking-[0.3em] shadow-sm md:text-sm"
            id="pin"
            inputMode="numeric"
            maxLength={4}
            minLength={4}
            name="pin"
            pattern="[0-9]{4}"
            placeholder="••••"
            required
            type="password"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPin">Ulangi PIN</Label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            autoComplete="new-password"
            className="h-12 bg-white pl-10 text-base tracking-[0.3em] shadow-sm md:text-sm"
            id="confirmPin"
            inputMode="numeric"
            maxLength={4}
            minLength={4}
            name="confirmPin"
            pattern="[0-9]{4}"
            placeholder="••••"
            required
            type="password"
          />
        </div>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        className="h-12 w-full bg-emerald-700 text-sm font-semibold shadow-lg shadow-emerald-900/20 hover:bg-emerald-800"
        disabled={pending}
        size="lg"
        type="submit"
      >
        {pending ? "Membuat akun..." : "Daftar & Buat Arisan"}
        <ArrowRight data-icon="inline-end" />
      </Button>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 text-emerald-700" />
        <span>Tanpa OTP WhatsApp.</span>
      </div>

      <p className="text-center text-sm text-zinc-600">
        Sudah punya akun?{" "}
        <Link
          className="font-semibold text-emerald-700 underline-offset-4 hover:underline"
          href="/login"
        >
          Masuk di sini
        </Link>
      </p>
    </form>
  );
}
