import "server-only";

import {
  buildSelectPrompt,
  setActiveArisan,
  type SelectArisanData,
} from "./active-arisan";
import {
  clearPendingAction,
  type PendingActionState,
} from "./conversation-state";
import { handleWhatsAppCommand } from "./handle-command";

const cancelKeywords = new Set(["batal", "cancel", "selesai"]);

export async function handleSelectArisanInput(
  userId: string,
  text: string,
  state: PendingActionState,
) {
  const trimmed = text.trim();
  const normalized = trimmed.toLocaleLowerCase("id-ID");

  if (cancelKeywords.has(normalized)) {
    await clearPendingAction(userId);
    return "Dibatalkan.";
  }

  const data = state.data as SelectArisanData;
  const candidates = data.candidates ?? [];
  const choice = Number(trimmed.replace(/\D/g, ""));

  if (!Number.isInteger(choice) || choice < 1 || choice > candidates.length) {
    return `Balas dengan nomor 1 sampai ${candidates.length}, atau ketik BATAL.

${buildSelectPrompt(candidates)}`;
  }

  const selected = candidates[choice - 1];

  await setActiveArisan(userId, selected.arisanGroupId);
  await clearPendingAction(userId);

  // Re-run the original command; the active arisan now resolves to a single
  // target so the resolver returns it directly instead of re-prompting.
  const reply = await handleWhatsAppCommand({
    command: data.command,
    userId,
  });

  // The menu reply already states the active arisan, so don't repeat it.
  if (reply.startsWith("Arisan aktif")) {
    return reply;
  }

  return `Arisan aktif: ${selected.arisanName}

${reply}`;
}
