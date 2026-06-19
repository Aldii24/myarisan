import "server-only";

import {
  getGiliranData,
  randomizeGiliranOrder,
  reorderGiliranMember,
  setGiliranDrawMember,
} from "@/lib/giliran";

import {
  clearPendingAction,
  setPendingAction,
  type PendingActionState,
} from "./conversation-state";

type GiliranItem = {
  displayName: string;
  id: string;
};

type GiliranData = {
  arisanId: string;
  items: GiliranItem[];
};

const cancelKeywords = new Set(["selesai", "batal", "cancel", "tidak", "no"]);

const actionHelp = `Balas:
- Nomor untuk jadikan giliran bulan ini (mis. 2)
- ACAK untuk mengacak urutan
- NAIK <nomor> atau TURUN <nomor> untuk ubah urutan
- HAPUS untuk kosongkan giliran
- SELESAI untuk berhenti`;

// Render the current order from fresh data and persist the matching item list so
// a replied number maps to exactly what was shown.
async function renderAndStore(
  userId: string,
  arisanId: string,
  prefix?: string,
) {
  const data = await getGiliranData(arisanId);

  if (!data) {
    await clearPendingAction(userId);
    return "Data arisan tidak ditemukan.";
  }

  if (data.members.length === 0) {
    await clearPendingAction(userId);
    return "Belum ada anggota. Tambah anggota dulu sebelum mengatur giliran.";
  }

  const items = data.members.map((member) => ({
    displayName: member.displayName,
    id: member.id,
  }));

  await setPendingAction(userId, "manage_giliran", {
    arisanId,
    items,
  } satisfies GiliranData);

  const order = data.members
    .map((member, index) => {
      const mark = member.isCurrentDraw ? " (giliran sekarang)" : "";
      return `${index + 1}. ${member.displayName}${mark}`;
    })
    .join("\n");

  const header = `Atur giliran ${data.group.name}
Giliran sekarang: ${data.currentDrawName ?? "Belum diatur"}

Urutan:
${order}`;

  return [prefix, header, actionHelp].filter(Boolean).join("\n\n");
}

export async function beginManageGiliran(
  userId: string,
  arisanId: string,
) {
  return renderAndStore(userId, arisanId);
}

function parseMoveCommand(normalized: string) {
  const match = normalized.match(/^(naik|turun)\s+(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    direction: match[1] === "naik" ? ("up" as const) : ("down" as const),
    position: Number(match[2]),
  };
}

export async function handleGiliranInput(
  userId: string,
  text: string,
  state: PendingActionState,
) {
  const normalized = text.trim().toLocaleLowerCase("id-ID");
  const data = state.data as GiliranData;
  const { arisanId, items } = data;

  if (cancelKeywords.has(normalized)) {
    await clearPendingAction(userId);
    return "Pengaturan giliran selesai.";
  }

  if (normalized === "acak") {
    const result = await randomizeGiliranOrder({ actorUserId: userId, arisanId });

    if (!result.ok) {
      return result.error;
    }

    return renderAndStore(userId, arisanId, "Urutan giliran diacak.");
  }

  if (normalized === "hapus" || normalized === "kosongkan") {
    const result = await setGiliranDrawMember({
      actorUserId: userId,
      arisanId,
      membershipId: null,
    });

    if (!result.ok) {
      return result.error;
    }

    return renderAndStore(userId, arisanId, "Giliran bulan ini dikosongkan.");
  }

  const move = parseMoveCommand(normalized);

  if (move) {
    if (move.position < 1 || move.position > items.length) {
      return `Nomor harus antara 1 sampai ${items.length}.`;
    }

    const member = items[move.position - 1];
    const result = await reorderGiliranMember({
      actorUserId: userId,
      arisanId,
      direction: move.direction,
      membershipId: member.id,
    });

    if (!result.ok) {
      return result.error;
    }

    return renderAndStore(userId, arisanId, `${member.displayName} dipindahkan.`);
  }

  if (/^\d+$/.test(normalized)) {
    const position = Number(normalized);

    if (position < 1 || position > items.length) {
      return `Nomor harus antara 1 sampai ${items.length}.`;
    }

    const member = items[position - 1];
    const result = await setGiliranDrawMember({
      actorUserId: userId,
      arisanId,
      membershipId: member.id,
    });

    if (!result.ok) {
      return result.error;
    }

    return renderAndStore(
      userId,
      arisanId,
      `Giliran bulan ini: ${member.displayName}.`,
    );
  }

  return `Perintah tidak dikenali.\n\n${actionHelp}`;
}
