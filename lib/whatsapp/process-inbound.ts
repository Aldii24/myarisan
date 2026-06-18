import "server-only";

import { parseWhatsAppCommand } from "./command-parser";
import { handleWhatsAppCommand } from "./handle-command";
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
    const command = parseWhatsAppCommand(input.text);
    const reply = await handleWhatsAppCommand({
      command,
      userId: inbound.userId,
    });

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
