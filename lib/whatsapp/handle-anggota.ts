import "server-only";

import { getArisanMembers } from "@/lib/arisan";
import {
  addMembersByNames,
  parseMemberNames,
  removeMember,
  renameMember,
} from "@/lib/members";

import {
  clearPendingAction,
  setPendingAction,
  type PendingActionState,
} from "./conversation-state";
import { compose, footer, header } from "./format";

type AnggotaItem = {
  displayName: string;
  id: string;
};

type AnggotaData = {
  arisanId: string;
  items: AnggotaItem[];
  step: "menu" | "add" | "rename";
  targetId?: string;
};

const cancelKeywords = new Set(["selesai", "batal", "cancel", "tidak", "no"]);

const menuHelp = footer(
  "Balas: TAMBAH (tambah anggota) · UBAH <nomor> (ganti nama) · HAPUS <nomor> (hapus) · SELESAI (berhenti)",
);

async function renderMenu(userId: string, arisanId: string, prefix?: string) {
  const members = (await getArisanMembers(arisanId)).filter(
    (member) => member.role === "member",
  );
  const items = members.map((member) => ({
    displayName: member.displayName,
    id: member.id,
  }));

  await setPendingAction(userId, "manage_members", {
    arisanId,
    items,
    step: "menu",
  } satisfies AnggotaData);

  const list =
    items.length > 0
      ? items.map((item, index) => `${index + 1}. ${item.displayName}`).join("\n")
      : "Belum ada anggota.";

  const body = `👥 Jumlah anggota: *${items.length}*

${list}`;

  return compose(
    prefix ? `✅ ${prefix}` : null,
    header("👥", "Kelola Anggota"),
    body,
    menuHelp,
  );
}

export async function beginManageAnggota(userId: string, arisanId: string) {
  return renderMenu(userId, arisanId);
}

export async function handleAnggotaInput(
  userId: string,
  text: string,
  state: PendingActionState,
) {
  const data = state.data as AnggotaData;
  const trimmed = text.trim();
  const normalized = trimmed.toLocaleLowerCase("id-ID");

  if (cancelKeywords.has(normalized)) {
    await clearPendingAction(userId);
    return "👍 Selesai mengatur anggota.";
  }

  if (data.step === "add") {
    const names = parseMemberNames(trimmed);

    if (names.length === 0) {
      return "Tulis minimal 1 nama anggota, atau ketik SELESAI untuk berhenti.";
    }

    const result = await addMembersByNames({
      actorUserId: userId,
      arisanId: data.arisanId,
      names,
    });

    if (!result.ok) {
      return result.error;
    }

    return renderMenu(
      userId,
      data.arisanId,
      `${result.addedCount} anggota ditambahkan.`,
    );
  }

  if (data.step === "rename") {
    if (!data.targetId) {
      return renderMenu(userId, data.arisanId);
    }

    const result = await renameMember({
      actorUserId: userId,
      arisanId: data.arisanId,
      membershipId: data.targetId,
      newName: trimmed,
    });

    if (!result.ok) {
      return result.error;
    }

    return renderMenu(userId, data.arisanId, "Nama anggota diperbarui.");
  }

  // step === "menu"
  if (normalized === "tambah") {
    await setPendingAction(userId, "manage_members", {
      ...data,
      step: "add",
    } satisfies AnggotaData);

    return "✍️ Kirim nama anggota. Boleh banyak sekaligus, satu nama per baris.";
  }

  const ubahMatch = normalized.match(/^ubah\s+(\d+)$/);

  if (ubahMatch) {
    const position = Number(ubahMatch[1]);

    if (position < 1 || position > data.items.length) {
      return `Nomor harus antara 1 sampai ${data.items.length}.`;
    }

    const target = data.items[position - 1];

    await setPendingAction(userId, "manage_members", {
      ...data,
      step: "rename",
      targetId: target.id,
    } satisfies AnggotaData);

    return `Kirim nama baru untuk ${target.displayName}.`;
  }

  const hapusMatch = normalized.match(/^hapus\s+(\d+)$/);

  if (hapusMatch) {
    const position = Number(hapusMatch[1]);

    if (position < 1 || position > data.items.length) {
      return `Nomor harus antara 1 sampai ${data.items.length}.`;
    }

    const target = data.items[position - 1];
    const result = await removeMember({
      actorUserId: userId,
      arisanId: data.arisanId,
      membershipId: target.id,
    });

    if (!result.ok) {
      return result.error;
    }

    return renderMenu(userId, data.arisanId, `${target.displayName} dihapus.`);
  }

  return `⚠️ Perintah tidak dikenali.\n\n${menuHelp}`;
}
