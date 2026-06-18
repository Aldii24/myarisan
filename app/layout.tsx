import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://myarisan.vercel.app"),
  title: {
    default: "MyArisan — Rekap arisan lebih tenang",
    template: "%s | MyArisan",
  },
  description:
    "Catat bukti setoran, cek siapa sudah atau belum bayar, dan buat rekap arisan siap kirim ke grup WhatsApp.",
  openGraph: {
    siteName: "MyArisan",
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
