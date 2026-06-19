export type WhatsAppCommand =
  | { name: "anggota" }
  | { name: "bantuan" }
  | { name: "bayar" }
  | { name: "belum-bayar" }
  | { name: "buat-arisan" }
  | { name: "dashboard" }
  | { name: "giliran" }
  | { name: "join"; code: string | null }
  | { name: "konfirmasi" }
  | { name: "menu" }
  | { name: "paket" }
  | { name: "periode" }
  | { name: "rekap" }
  | { name: "rekening" }
  | { name: "reset-pin" }
  | { name: "riwayat" }
  | { name: "status" }
  | { name: "tagih" }
  | { name: "unknown"; raw: string };

// Multi-word and single-word exact-match commands. Kept rule-based per PRD §13.3.
const exactCommands: Record<string, WhatsAppCommand> = {
  anggota: { name: "anggota" },
  bantuan: { name: "bantuan" },
  bayar: { name: "bayar" },
  "belum bayar": { name: "belum-bayar" },
  "buat arisan": { name: "buat-arisan" },
  dashboard: { name: "dashboard" },
  giliran: { name: "giliran" },
  konfirmasi: { name: "konfirmasi" },
  menu: { name: "menu" },
  paket: { name: "paket" },
  periode: { name: "periode" },
  "periode baru": { name: "periode" },
  "mulai periode": { name: "periode" },
  rekap: { name: "rekap" },
  rekening: { name: "rekening" },
  "reset pin": { name: "reset-pin" },
  riwayat: { name: "riwayat" },
  status: { name: "status" },
  tagih: { name: "tagih" },
};

export function parseWhatsAppCommand(text: string): WhatsAppCommand {
  const normalized = text.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");

  const exact = exactCommands[normalized];

  if (exact) {
    return exact;
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
