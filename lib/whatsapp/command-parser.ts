export type WhatsAppCommand =
  | { name: "bayar" }
  | { name: "dashboard" }
  | { name: "join"; code: string | null }
  | { name: "konfirmasi" }
  | { name: "menu" }
  | { name: "paket" }
  | { name: "rekap" }
  | { name: "reset-pin" }
  | { name: "status" }
  | { name: "tagih" }
  | { name: "unknown"; raw: string };

export function parseWhatsAppCommand(text: string): WhatsAppCommand {
  const normalized = text.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");

  if (normalized === "menu") {
    return { name: "menu" };
  }

  if (normalized === "status") {
    return { name: "status" };
  }

  if (normalized === "bayar") {
    return { name: "bayar" };
  }

  if (normalized === "rekap") {
    return { name: "rekap" };
  }

  if (normalized === "tagih") {
    return { name: "tagih" };
  }

  if (normalized === "konfirmasi") {
    return { name: "konfirmasi" };
  }

  if (normalized === "paket") {
    return { name: "paket" };
  }

  if (normalized === "dashboard") {
    return { name: "dashboard" };
  }

  if (normalized === "reset pin") {
    return { name: "reset-pin" };
  }

  if (normalized === "join") {
    return { code: null, name: "join" };
  }

  if (normalized.startsWith("join ")) {
    const code = normalized.slice(5).trim().toUpperCase();

    return { code: code || null, name: "join" };
  }

  return { name: "unknown", raw: text.trim() };
}
