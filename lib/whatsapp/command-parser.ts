export type WhatsAppCommand =
  | { name: "anggota" }
  | { name: "arisan" }
  | { name: "bantuan" }
  | { name: "bayar" }
  | { name: "belum-bayar" }
  | { name: "buat-arisan" }
  | { name: "catat-bayar" }
  | { name: "dashboard" }
  | { name: "giliran" }
  | { name: "join"; code: string | null }
  | { name: "konfirmasi" }
  | { name: "menu" }
  | { name: "owner" }
  | { name: "paket" }
  | { name: "pengaturan" }
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
  arisan: { name: "arisan" },
  "ganti arisan": { name: "arisan" },
  "pilih arisan": { name: "arisan" },
  bantuan: { name: "bantuan" },
  bayar: { name: "bayar" },
  "belum bayar": { name: "belum-bayar" },
  "buat arisan": { name: "buat-arisan" },
  "catat bayar": { name: "catat-bayar" },
  catat: { name: "catat-bayar" },
  "catat pembayaran": { name: "catat-bayar" },
  dashboard: { name: "dashboard" },
  giliran: { name: "giliran" },
  konfirmasi: { name: "konfirmasi" },
  menu: { name: "menu" },
  owner: { name: "owner" },
  "cek paket": { name: "owner" },
  "review paket": { name: "owner" },
  paket: { name: "paket" },
  "atur paket": { name: "paket" },
  "ganti paket": { name: "paket" },
  upgrade: { name: "paket" },
  langganan: { name: "paket" },
  pengaturan: { name: "pengaturan" },
  "atur arisan": { name: "pengaturan" },
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
