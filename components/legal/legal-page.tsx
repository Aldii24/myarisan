import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export function LegalPage({
  eyebrow,
  title,
  intro,
  updatedAt,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#18352e]">
      <header className="border-b border-[#e0ddd6] bg-[#fbfaf7]/90">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link className="flex items-center gap-2.5 font-extrabold" href="/">
            <BrandMark className="size-9" />
            MyArisan
          </Link>
          <Link
            className="flex items-center gap-2 text-xs font-bold text-[#536761] transition-colors hover:text-[#13795b]"
            href="/"
          >
            <ArrowLeft className="size-4" />
            Kembali ke beranda
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.34fr_0.66fr] lg:gap-20 lg:py-20">
        <aside>
          <div className="lg:sticky lg:top-10">
            <p className="text-xs font-bold tracking-[0.18em] text-[#13795b] uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 text-sm leading-7 text-[#65736e]">{intro}</p>
            <p className="mt-6 text-xs font-semibold text-[#8a9591]">
              Terakhir diperbarui: {updatedAt}
            </p>
            <a
              className="mt-8 inline-flex items-center gap-2 rounded-xl border border-[#d9ddd9] bg-white px-4 py-3 text-xs font-bold text-[#315349] transition-colors hover:border-[#9cc9b6] hover:text-[#13795b]"
              href="mailto:aldiirawan240703@gmail.com"
            >
              <Mail className="size-4" />
              Hubungi MyArisan
            </a>
          </div>
        </aside>

        <article className="rounded-[2rem] border border-[#e1ded7] bg-white px-5 py-8 shadow-[0_24px_70px_-55px_rgba(23,63,53,0.45)] sm:px-9 sm:py-10">
          <div className="space-y-10">
            {sections.map((section, index) => (
              <section key={section.title}>
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[#e7f7f0] text-[10px] font-extrabold text-[#13795b]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-xl font-extrabold tracking-[-0.025em] text-[#24443a]">
                      {section.title}
                    </h2>
                    {section.paragraphs?.map((paragraph) => (
                      <p
                        className="mt-4 text-sm leading-7 text-[#5f6f69]"
                        key={paragraph}
                      >
                        {paragraph}
                      </p>
                    ))}
                    {section.items ? (
                      <ul className="mt-4 space-y-3">
                        {section.items.map((item) => (
                          <li
                            className="flex gap-3 text-sm leading-7 text-[#5f6f69]"
                            key={item}
                          >
                            <span className="mt-[0.7rem] size-1.5 shrink-0 rounded-full bg-[#46a47e]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>

      <footer className="border-t border-[#e0ddd6] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-xs text-[#75827d] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 MyArisan. Rekap arisan lebih tenang.</p>
          <nav className="flex flex-wrap gap-5 font-semibold">
            <Link className="hover:text-[#13795b]" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="hover:text-[#13795b]" href="/terms">
              Terms
            </Link>
            <Link className="hover:text-[#13795b]" href="/data-deletion">
              Data Deletion
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
