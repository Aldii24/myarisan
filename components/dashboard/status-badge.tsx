import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({
  className,
  status,
}: {
  className?: string;
  status: string | null | undefined;
}) {
  const label = status || "Belum Bayar";
  const normalized = label.toLocaleLowerCase("id-ID");
  const isSuccess =
    normalized.includes("sudah") ||
    normalized.includes("aktif") ||
    normalized.includes("claimed") ||
    normalized.includes("terdaftar");
  const isPending =
    normalized.includes("menunggu") ||
    normalized.includes("pending") ||
    normalized.includes("belum dibayar");
  const isDanger =
    normalized.includes("ditolak") ||
    normalized.includes("expired") ||
    normalized.includes("rejected");

  return (
    <Badge
      className={cn(
        "border",
        isSuccess && "border-emerald-200 bg-emerald-50 text-emerald-800",
        isPending && "border-amber-200 bg-amber-50 text-amber-800",
        isDanger && "border-red-200 bg-red-50 text-red-700",
        !isSuccess &&
          !isPending &&
          !isDanger &&
          "border-slate-200 bg-slate-100 text-slate-700",
        className,
      )}
      variant="outline"
    >
      {label}
    </Badge>
  );
}
