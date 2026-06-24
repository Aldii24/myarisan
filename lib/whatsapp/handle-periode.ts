import "server-only";

import { formatDateLabel } from "@/lib/arisan";
import { getPeriodOverview, startNextPeriod } from "@/lib/periods";

import {
  clearPendingAction,
  setPendingAction,
  type PendingActionState,
} from "./conversation-state";
import { bold, compose, field, header, italic } from "./format";

type PeriodeData = {
  arisanId: string;
  arisanName: string;
};

const cancelKeywords = new Set(["batal", "cancel", "tidak", "no", "selesai"]);
const confirmKeywords = new Set(["ya", "yes", "lanjut", "ok", "oke"]);

export async function beginPeriode(
  userId: string,
  arisanId: string,
  arisanName: string,
) {
  const overview = await getPeriodOverview(arisanId);

  if (!overview) {
    return "Data arisan tidak ditemukan.";
  }

  await setPendingAction(userId, "manage_period", {
    arisanId,
    arisanName,
  } satisfies PeriodeData);

  const lines = [header("🗓️", "Kelola Periode", arisanName), ""];

  if (overview.activePeriod) {
    lines.push(
      field("📅", "Periode aktif", overview.activePeriod.name),
      field("⏰", "Batas setor", formatDateLabel(overview.activePeriod.dueDate)),
      `✅ Sudah bayar: ${bold(overview.paidCount)} · ⏳ Belum: ${bold(
        overview.unpaidCount,
      )}`,
    );
  } else {
    lines.push("Belum ada periode aktif.");
  }

  if (overview.activePeriod && !overview.hasDrawWinner) {
    lines.push(
      "",
      italic(
        "⚠️ Giliran bulan ini belum diatur — periode ini tidak akan punya catatan pemenang.",
      ),
    );
  }

  lines.push(
    "",
    bold("Tutup periode ini dan mulai periode berikutnya?"),
    italic("Balas YA untuk lanjut, atau BATAL untuk membatalkan."),
  );

  return lines.join("\n");
}

export async function handlePeriodeInput(
  userId: string,
  text: string,
  state: PendingActionState,
) {
  const normalized = text.trim().toLocaleLowerCase("id-ID");
  const data = state.data as PeriodeData;

  if (cancelKeywords.has(normalized)) {
    await clearPendingAction(userId);
    return "👍 Pengaturan periode dibatalkan.";
  }

  if (!confirmKeywords.has(normalized)) {
    return "Balas *YA* untuk tutup & mulai periode baru, atau *BATAL* untuk membatalkan.";
  }

  const result = await startNextPeriod({
    actorUserId: userId,
    arisanId: data.arisanId,
  });

  await clearPendingAction(userId);

  if (!result.ok) {
    if (result.reason === "expired") {
      return "⚠️ Paket arisan sudah berakhir. Perpanjang paket untuk membuka periode baru.";
    }

    return "⚠️ Arisan tidak ditemukan.";
  }

  if (result.closedPeriodName) {
    return compose(
      header("🗓️", "Periode Baru"),
      `✅ Periode ${bold(result.closedPeriodName)} ditutup.`,
      `🆕 Periode baru dimulai: ${bold(result.newPeriodName ?? "-")}.`,
      italic("Semua anggota mulai dari status belum bayar lagi."),
    );
  }

  return compose(
    header("🗓️", "Periode Baru"),
    `🆕 Periode baru dimulai: ${bold(result.newPeriodName ?? "-")}.`,
  );
}
