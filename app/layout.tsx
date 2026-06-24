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

// Runs before paint to apply the saved/system theme and avoid a flash of the
// wrong color scheme. Mirrors the logic in components/theme/theme-provider.tsx.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
