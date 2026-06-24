import "server-only";

import { formatDateTimeLabel, formatRupiah } from "@/lib/arisan";
import { deleteArisan } from "@/lib/arisan-delete";
import {
  getArisanSettings,
  updateArisanSettingField,
  type ArisanSettingsField,
} from "@/lib/arisan-settings";
import { getPackageStatus, isSubscriptionActive } from "@/lib/subscription";

import {
  clearPendingAction,
  setPendingAction,
  type PendingActionState,
} from "./conversation-state";
import { bold, compose, footer, header } from "./format";

type SettingsData = {
  arisanId: string;
  field?: ArisanSettingsField;
  step: "menu" | "value" | "confirm_delete";
};

const cancelKeywords = new Set(["selesai", "batal", "cancel", "tidak", "no"]);

const fieldByNumber: Record<string, { field: ArisanSettingsField; prompt: string }> = {
  "1": { field: "name", prompt: "Kirim nama arisan yang baru." },
  "2": {
    field: "amountPerPeriod",
    prompt: "Kirim nominal setoran baru (angka saja, contoh: 100000).",
  },
  "3": {
    field: "dueDay",
    prompt: "Kirim tanggal batas setor baru (angka 1-28).",
  },
  "4": {
    field: "bankAccountText",
    prompt: "Kirim rekening admin baru (bank, nama, nomor).",
  },
};

async function renderMenu(userId: string, arisanId: string, prefix?: string) {
  const settings = await getArisanSettings(arisanId);

  if (!settings) {
    await clearPendingAction(userId);
    return "Data arisan tidak ditemukan.";
  }

  await setPendingAction(userId, "manage_settings", {
    arisanId,
    step: "menu",
  } satisfies SettingsData);

  const body = `1️⃣ Nama: *${settings.name}*
2️⃣ Setoran: *${formatRupiah(settings.amountPerPeriod)}*
3️⃣ Batas setor: *tanggal ${settings.dueDay}*
4️⃣ Rekening: *${settings.bankAccountText || "Belum diisi"}*
5️⃣ 🗑️ *Hapus arisan*`;

  return compose(
    prefix ? `✅ ${prefix}` : null,
    header("⚙️", "Pengaturan", settings.name),
    body,
    footer("Balas nomor (1-5) untuk memilih, atau SELESAI untuk berhenti."),
  );
}

export async function beginPengaturan(userId: string, arisanId: string) {
  return renderMenu(userId, arisanId);
}

// Shown when an admin tries to delete an arisan that still has an active paid
// package — deleting would waste the paid time, so steer them to a new period.
async function activeSubscriptionNudge(arisanId: string) {
  const status = await getPackageStatus(arisanId);

  return compose(
    header("🛡️", "Paket Masih Aktif"),
    `Arisan ini masih punya paket aktif sampai ${bold(
      formatDateTimeLabel(status.activeUntil),
    )}.`,
    "Menghapus arisan akan membuang sisa paket yang sudah kamu bayar.",
    `Lebih baik ${bold("buat periode baru")} — ketik ${bold(
      "PERIODE",
    )} untuk lanjut memakai paketnya.`,
  );
}

export async function handlePengaturanInput(
  userId: string,
  text: string,
  state: PendingActionState,
) {
  const data = state.data as SettingsData;
  const trimmed = text.trim();
  const normalized = trimmed.toLocaleLowerCase("id-ID");

  if (cancelKeywords.has(normalized)) {
    await clearPendingAction(userId);
    return "👍 Selesai mengubah pengaturan.";
  }

  if (data.step === "confirm_delete") {
    const result = await deleteArisan({
      actorUserId: userId,
      arisanId: data.arisanId,
      confirmationName: trimmed,
    });

    if (result.ok) {
      await clearPendingAction(userId);
      return compose(
        header("🗑️", "Arisan Dihapus"),
        `Arisan *${result.name}* sudah dihapus permanen beserta semua datanya.`,
      );
    }

    if (result.code === "active_subscription") {
      await clearPendingAction(userId);
      return activeSubscriptionNudge(data.arisanId);
    }

    if (result.code === "name_mismatch") {
      return `${result.error}\n\nAtau ketik BATAL untuk membatalkan.`;
    }

    // not_found / not_admin — flow can't continue.
    await clearPendingAction(userId);
    return result.error;
  }

  if (data.step === "value") {
    if (!data.field) {
      return renderMenu(userId, data.arisanId);
    }

    const result = await updateArisanSettingField({
      actorUserId: userId,
      arisanId: data.arisanId,
      field: data.field,
      rawValue: trimmed,
    });

    if (!result.ok) {
      return result.error;
    }

    return renderMenu(userId, data.arisanId, "Pengaturan disimpan.");
  }

  // step === "menu"
  if (normalized === "5") {
    // Block the delete up front when a paid package is still active so we never
    // ask the admin to type the name only to refuse afterwards.
    if (await isSubscriptionActive(data.arisanId)) {
      return activeSubscriptionNudge(data.arisanId);
    }

    const settings = await getArisanSettings(data.arisanId);

    if (!settings) {
      await clearPendingAction(userId);
      return "Data arisan tidak ditemukan.";
    }

    await setPendingAction(userId, "manage_settings", {
      arisanId: data.arisanId,
      step: "confirm_delete",
    } satisfies SettingsData);

    return compose(
      header("🗑️", "Hapus Arisan", settings.name),
      "⚠️ *Tindakan ini permanen.* Semua data akan hilang dan tidak bisa dikembalikan:",
      "• Anggota\n• Periode\n• Riwayat pembayaran",
      `Untuk konfirmasi, ketik nama arisan persis: ${bold(settings.name)}`,
      footer("Atau ketik BATAL untuk membatalkan."),
    );
  }

  const choice = fieldByNumber[normalized];

  if (!choice) {
    return "⚠️ Balas nomor 1 sampai 5 untuk memilih, atau SELESAI.";
  }

  await setPendingAction(userId, "manage_settings", {
    arisanId: data.arisanId,
    field: choice.field,
    step: "value",
  } satisfies SettingsData);

  return choice.prompt;
}
