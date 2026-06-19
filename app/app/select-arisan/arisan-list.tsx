"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { StatusBadge, buttonStyles, cn } from "@/components/ui/app-ui";
import { Input } from "@/components/ui/input";

export type ArisanListItem = {
  id: string;
  arisanGroupId: string;
  role: "admin" | "member";
  arisanName: string;
};

type RoleFilter = "all" | "admin" | "member";

const PAGE_SIZE = 9;

const roleFilters: Array<{ label: string; value: RoleFilter }> = [
  { label: "Semua", value: "all" },
  { label: "Admin", value: "admin" },
  { label: "Anggota", value: "member" },
];

export function ArisanList({ items }: { items: ArisanListItem[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");

    return items.filter((item) => {
      const matchesRole = role === "all" || item.role === role;
      const matchesQuery =
        !normalizedQuery ||
        item.arisanName.toLocaleLowerCase("id-ID").includes(normalizedQuery);

      return matchesRole && matchesQuery;
    });
  }, [items, query, role]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-emerald-700" />
          <Input
            aria-label="Cari arisan"
            className="h-11 rounded-2xl border-white/60 bg-white/70 pl-10 text-base shadow-sm backdrop-blur md:text-sm"
            inputMode="search"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Cari nama arisan..."
            type="search"
            value={query}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {roleFilters.map((filter) => (
            <button
              className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold shadow-sm backdrop-blur transition",
                role === filter.value
                  ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
                  : "border-white/55 bg-white/45 text-zinc-700 hover:bg-white/68",
              )}
              key={filter.value}
              onClick={() => {
                setRole(filter.value);
                setPage(1);
              }}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[1.5rem] border border-white/55 bg-white/45 p-8 text-center shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-zinc-800">
            Arisan tidak ditemukan.
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Coba ubah kata kunci atau filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((item) => (
            <Link
              className="group rounded-[1.5rem] border border-white/55 bg-white/50 p-5 shadow-[0_18px_60px_rgba(67,48,35,0.1)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/68"
              href={`/app/arisan/${item.arisanGroupId}`}
              key={item.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-zinc-950">
                    {item.arisanName}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600">
                    Lihat ringkasan, anggota, dan pembayaran.
                  </p>
                </div>
                <StatusBadge status={item.role === "admin" ? "Admin" : "Anggota"} />
              </div>
              <p className="mt-6 text-sm font-semibold text-emerald-700 transition group-hover:translate-x-1">
                Buka arisan
              </p>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <button
            className={cn(buttonStyles.secondary, "disabled:opacity-50")}
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            Sebelumnya
          </button>
          <p className="text-sm font-medium text-zinc-600">
            Halaman {currentPage} dari {totalPages}
          </p>
          <button
            className={cn(buttonStyles.secondary, "disabled:opacity-50")}
            disabled={currentPage >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            type="button"
          >
            Berikutnya
          </button>
        </div>
      ) : null}
    </div>
  );
}
