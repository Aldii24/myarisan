import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createArisanGroup, formatRupiah } from "@/lib/arisan";

import {
  clearPendingAction,
  setPendingAction,
  type PendingActionState,
} from "./conversation-state";

const cancelKeywords = new Set(["batal", "cancel"]);
const confirmKeywords = new Set(["ya", "iya", "ok", "oke", "lanjut"]);

type CreateArisanStep = "name" | "amount" | "period" | "due" | "bank" | "confirm";

type CreateArisanData = {
  step: CreateArisanStep;
  name?: string;
  amount?: number;
  periodType?: "weekly" | "monthly";
  dueDay?: number;
  bankAccountText?: string;
};

function parsePositiveAmount(text: string) {
  const amount = Number(text.replace(/\D/g, ""));
  return Number.isInteger(amount) && amount > 0 ? amount : null;
}

function parsePeriodType(text: string): "weekly" | "monthly" | null {
  const normalized = text.trim().toLocaleLowerCase("id-ID");

  if (["1", "mingguan", "minggu", "weekly"].includes(normalized)) {
    return "weekly";
  }

  if (["2", "bulanan", "bulan", "monthly"].includes(normalized)) {
    return "monthly";
  }

  return null;
}

function summary(data: CreateArisanData) {
  return `Cek dulu ya:
Nama: ${data.name}
Setoran: ${formatRupiah(data.amount ?? 0)}
Periode: ${data.periodType === "weekly" ? "Mingguan" : "Bulanan"}
Batas setor: tanggal ${data.dueDay}
Rekening admin: ${data.bankAccountText}

Ketik YA untuk membuat arisan, atau BATAL untuk membatalkan.`;
}

export async function beginCreateArisan(userId: string) {
  await setPendingAction(userId, "create_arisan", { step: "name" });

  return `Buat arisan baru.
Siapa nama arisannya? (contoh: Arisan RT 05)
Ketik BATAL kapan saja untuk membatalkan.`;
}

export async function handleCreateArisanInput(
  userId: string,
  text: string,
  state: PendingActionState,
) {
  const trimmed = text.trim();
  const normalized = trimmed.toLocaleLowerCase("id-ID");

  if (cancelKeywords.has(normalized)) {
    await clearPendingAction(userId);
    return "Pembuatan arisan dibatalkan.";
  }

  const data = state.data as CreateArisanData;

  switch (data.step) {
    case "name": {
      if (trimmed.length < 3) {
        return "Nama arisan minimal 3 karakter. Coba ketik lagi.";
      }

      await setPendingAction(userId, "create_arisan", {
        ...data,
        name: trimmed,
        step: "amount",
      });

      return `Nominal setoran per periode berapa? (contoh: 100000)`;
    }
    case "amount": {
      const amount = parsePositiveAmount(trimmed);

      if (!amount) {
        return "Nominal harus berupa angka, contoh: 100000. Coba lagi.";
      }

      await setPendingAction(userId, "create_arisan", {
        ...data,
        amount,
        step: "period",
      });

      return `Periode arisannya apa?
Balas: Mingguan atau Bulanan`;
    }
    case "period": {
      const periodType = parsePeriodType(trimmed);

      if (!periodType) {
        return "Balas Mingguan atau Bulanan ya.";
      }

      await setPendingAction(userId, "create_arisan", {
        ...data,
        periodType,
        step: "due",
      });

      return `Batas setor tiap periode tanggal berapa? (angka 1 sampai 28)`;
    }
    case "due": {
      const dueDay = Number(trimmed.replace(/\D/g, ""));

      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
        return "Batas setor harus angka 1 sampai 28. Coba lagi.";
      }

      await setPendingAction(userId, "create_arisan", {
        ...data,
        dueDay,
        step: "bank",
      });

      return `Terakhir, tulis rekening atau e-wallet admin tujuan transfer.
Contoh: BCA 1234567890 a.n. Budi`;
    }
    case "bank": {
      if (trimmed.length < 4) {
        return "Tulis rekening atau e-wallet admin yang jelas ya. Coba lagi.";
      }

      const nextData: CreateArisanData = {
        ...data,
        bankAccountText: trimmed,
        step: "confirm",
      };

      await setPendingAction(userId, "create_arisan", nextData);

      return summary(nextData);
    }
    case "confirm": {
      if (!confirmKeywords.has(normalized)) {
        return `Ketik YA untuk membuat arisan, atau BATAL untuk membatalkan.`;
      }

      if (
        !data.name ||
        !data.amount ||
        !data.periodType ||
        !data.dueDay ||
        !data.bankAccountText
      ) {
        await clearPendingAction(userId);
        return "Data arisan belum lengkap. Ketik BUAT ARISAN untuk mulai lagi.";
      }

      const [user] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const group = await createArisanGroup({
        adminDisplayName: user?.name ?? "Admin",
        adminUserId: userId,
        amountPerPeriod: data.amount,
        bankAccountText: data.bankAccountText,
        dueDay: data.dueDay,
        name: data.name,
        periodType: data.periodType,
      });

      await clearPendingAction(userId);

      return `Arisan "${data.name}" berhasil dibuat ✅
Kode join: ${group.joinCode}

Bagikan kode ini ke anggota, atau ketik ANGGOTA untuk menambah anggota dari dashboard.`;
    }
    default: {
      await clearPendingAction(userId);
      return "Langkah pembuatan arisan tidak dikenali. Ketik BUAT ARISAN untuk mulai lagi.";
    }
  }
}
