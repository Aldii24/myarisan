import { ReceiptText, Sparkles, UserPlus, Wallet } from "lucide-react";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/lib/auth/user";

import { RegisterForm } from "./register-form";

const benefits = [
  {
    icon: UserPlus,
    label: "Daftar gratis, langsung jadi admin",
  },
  {
    icon: ReceiptText,
    label: "Rekap siap kirim ke grup",
  },
  {
    icon: Wallet,
    label: "Uang arisan tetap di tangan admin",
  },
];

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/app");
  }

  return (
    <BackgroundBeamsWithCollision className="h-auto min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8">
      <ThemeToggle className="fixed right-4 top-4 z-50 shadow-sm" />
      <main className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-8 py-3 lg:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <BrandMark className="size-11 shadow-lg shadow-emerald-900/15" />
              <div>
                <p className="text-lg font-semibold text-foreground">MyArisan</p>
                <Badge
                  className="mt-1 border-success-border bg-success-surface text-success-foreground"
                  variant="outline"
                >
                  <Sparkles />
                  Coba gratis
                </Badge>
              </div>
            </div>

            <h1 className="mt-10 max-w-lg text-5xl font-semibold leading-[1.12] tracking-tight text-foreground">
              Mulai arisan kamu hari ini
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Daftar pakai nomor WhatsApp dan PIN 4 angka. Setelah daftar, kamu
              langsung diarahkan membuat arisan pertama sebagai admin.
            </p>

            <div className="mt-10 max-w-lg rounded-2xl border border-border bg-card p-3 shadow-xl shadow-indigo-950/5 backdrop-blur-xl">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;

                return (
                  <div key={benefit.label}>
                    {index > 0 ? <Separator /> : null}
                    <div className="flex items-center gap-4 px-3 py-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-surface text-primary">
                        <Icon className="size-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {benefit.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-md flex-col justify-center">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <BrandMark className="size-10 shadow-lg shadow-emerald-900/15" />
            <span className="text-lg font-semibold text-foreground">MyArisan</span>
          </div>

          <Card className="gap-0 border-border bg-card py-0 shadow-md ring-zinc-900/8 backdrop-blur-xl">
            <CardHeader className="gap-0 px-5 pb-3 pt-6 sm:px-7 sm:pt-7">
              <CardTitle className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Daftar MyArisan
              </CardTitle>
              <CardDescription className="mt-3 leading-6 text-muted-foreground">
                Buat akun dengan nomor WhatsApp dan PIN 4 angka pribadi, lalu
                lanjut buat arisan pertama kamu.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-6 pt-4 sm:px-7 sm:pb-7">
              <RegisterForm />
            </CardContent>
          </Card>

          <div className="mt-5 grid grid-cols-3 gap-2 lg:hidden">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <div
                  className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-2 py-3 text-center shadow-sm backdrop-blur"
                  key={benefit.label}
                >
                  <Icon className="size-4 text-primary" />
                  <span className="text-[0.68rem] font-semibold leading-4 text-muted-foreground">
                    {benefit.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </BackgroundBeamsWithCollision>
  );
}
