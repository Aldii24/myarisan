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
        isSuccess && "border-success-border bg-success-surface text-success-foreground",
        isPending && "border-warning-border bg-warning-surface text-warning-foreground",
        isDanger && "border-danger-border bg-danger-surface text-danger-foreground",
        !isSuccess &&
          !isPending &&
          !isDanger &&
          "border-border bg-muted text-muted-foreground",
        className,
      )}
      variant="outline"
    >
      {label}
    </Badge>
  );
}
