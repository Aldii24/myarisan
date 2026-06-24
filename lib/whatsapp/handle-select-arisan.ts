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
import { bold, compose } from "./format";
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
    return "👍 Dibatalkan.";
  }

  const data = state.data as SelectArisanData;
  const candidates = data.candidates ?? [];
  const choice = Number(trimmed.replace(/\D/g, ""));

  if (!Number.isInteger(choice) || choice < 1 || choice > candidates.length) {
    return compose(
      `⚠️ Balas dengan ${bold(`nomor 1 sampai ${candidates.length}`)}, atau ketik BATAL.`,
      buildSelectPrompt(candidates),
    );
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
  const activeLine = `✅ ${bold(`Arisan aktif: ${selected.arisanName}`)}`;

  // An image reply (e.g. a paket bill with QRIS): prepend the active-arisan line
  // to its caption so the user still sees which arisan they switched to.
  if (typeof reply !== "string") {
    return { ...reply, caption: compose(activeLine, reply.caption) };
  }

  // If the re-run reply already names the active arisan, don't repeat it.
  if (reply.includes("Arisan aktif")) {
    return reply;
  }

  return compose(activeLine, reply);
}
