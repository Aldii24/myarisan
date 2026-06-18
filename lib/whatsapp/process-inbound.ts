import "server-only";

import { parseWhatsAppCommand, type WhatsAppCommand } from "./command-parser";
import { getPendingAction } from "./conversation-state";
import { handleWhatsAppCommand } from "./handle-command";
import { handleResetPinInput } from "./handle-reset-pin";
import {
  recordInboundWhatsAppMessage,
  updateInboundWhatsAppStatus,
} from "./inbound";

export async function processInboundWhatsAppText(input: {
  fromPhone: string;
  text: string;
  whatsappMessageId: string;
}) {
  const inbound = await recordInboundWhatsAppMessage({
    body: input.text,
    fromPhone: input.fromPhone,
    messageType: "text",
    whatsappMessageId: input.whatsappMessageId,
  });

  if (inbound.duplicate) {
    return {
      command: null,
      duplicate: true,
      fromPhone: inbound.fromPhone,
      reply: null,
      serviceWindowUntil: inbound.serviceWindowUntil,
      userId: inbound.userId,
    };
  }

  if (!inbound.userId) {
    throw new Error("Pengguna WhatsApp tidak ditemukan.");
  }

  try {
    // A user mid-flow (e.g. awaiting a new PIN) has their next message routed to
    // that flow instead of the command parser, so "1234" is read as the PIN and
    // not as an unknown command.
    const pendingAction = await getPendingAction(inbound.userId);

    let command: WhatsAppCommand | null = null;
    let reply: string;

    if (pendingAction === "reset_pin") {
      reply = await handleResetPinInput(inbound.userId, input.text);
    } else {
      command = parseWhatsAppCommand(input.text);
      reply = await handleWhatsAppCommand({
        command,
        userId: inbound.userId,
      });
    }

    await updateInboundWhatsAppStatus(inbound.logId!, "processed");

    return {
      command,
      duplicate: false,
      fromPhone: inbound.fromPhone,
      reply,
      serviceWindowUntil: inbound.serviceWindowUntil,
      userId: inbound.userId,
    };
  } catch (error) {
    await updateInboundWhatsAppStatus(inbound.logId!, "failed");

    throw error;
  }
}
