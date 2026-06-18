"use client";

import { ArrowRight, KeyRound, Phone, ShieldCheck } from "lucide-react";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginAction, type LoginFormState } from "./actions";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
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
        <Label htmlFor="pin">PIN 4 angka</Label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            autoComplete="current-password"
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
        {pending ? "Masuk..." : "Masuk"}
        <ArrowRight data-icon="inline-end" />
      </Button>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 text-emerald-700" />
        <span>Tidak perlu OTP WhatsApp.</span>
      </div>
    </form>
  );
}
