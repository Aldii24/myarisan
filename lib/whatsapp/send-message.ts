import "server-only";

import { db } from "@/db";
import { dashboardNotifications, messageLogs } from "@/db/schema";
import { findUserForLogin, normalizePhone } from "@/lib/auth/user";

import { getWhatsAppConfig, reportMissingWhatsAppEnv } from "./config";

type SendResult =
  | { ok: true; messageId: string | null; status: "sent" }
  | {
      error: string;
      ok: false;
      status: "failed" | "skipped_outside_window";
    };

// An outbound reply is either plain text or a single image with a caption. The
// webhook/process layer passes these around without caring how they're sent —
// see sendWhatsAppReply.
export type WhatsAppReply =
  | string
  | { caption: string; imageUrl: string; type: "image" };

type OutboundMessageType = "image" | "text";

async function logOutbound(input: {
  body: string;
  costType: "free_window" | "skipped_outside_window";
  messageId?: string | null;
  messageType?: OutboundMessageType;
  processedStatus: "failed" | "processed" | "skipped";
  toPhone: string;
  userId?: string | null;
}) {
  try {
    await db.insert(messageLogs).values({
      body: input.body,
      costType: input.costType,
      direction: "outbound",
      fromPhone: input.toPhone,
      messageType: input.messageType ?? "text",
      processedStatus: input.processedStatus,
      userId: input.userId ?? null,
      whatsappMessageId: input.messageId ?? null,
    });
  } catch (error) {
    console.error("Failed to log outbound WhatsApp message", error);
  }
}

async function createSkippedNotification(userId: string, body: string) {
  try {
    await db.insert(dashboardNotifications).values({
      message: body,
      title: "Pesan WhatsApp tidak dikirim",
      type: "whatsapp_skipped",
      userId,
    });
  } catch (error) {
    console.error("Failed to create skipped WhatsApp notification", error);
  }
}

export async function sendWhatsAppText(input: {
  allowPaidTemplate?: false;
  body: string;
  toPhone: string;
}): Promise<SendResult> {
  return sendWhatsAppMessage({
    logBody: input.body,
    messageType: "text",
    payload: { text: { body: input.body, preview_url: false }, type: "text" },
    toPhone: input.toPhone,
  });
}

// Sends a single image by public URL (WhatsApp Cloud "image" message). The
// caption rides along in the same bubble. Same 24h service-window cost guard as
// text — never sends outside the window.
export async function sendWhatsAppImage(input: {
  caption: string;
  imageUrl: string;
  toPhone: string;
}): Promise<SendResult> {
  return sendWhatsAppMessage({
    // The caption is what's human-readable, so log that as the body.
    logBody: input.caption,
    messageType: "image",
    payload: {
      image: { caption: input.caption, link: input.imageUrl },
      type: "image",
    },
    toPhone: input.toPhone,
  });
}

// Dispatches a structured reply (text or image) to the right sender.
export async function sendWhatsAppReply(input: {
  reply: WhatsAppReply;
  toPhone: string;
}): Promise<SendResult> {
  if (typeof input.reply === "string") {
    return sendWhatsAppText({ body: input.reply, toPhone: input.toPhone });
  }

  return sendWhatsAppImage({
    caption: input.reply.caption,
    imageUrl: input.reply.imageUrl,
    toPhone: input.toPhone,
  });
}

// Shared send core: the 24h service-window cost guard, config check, Cloud API
// call, and outbound logging — identical for text and image. Only the Graph API
// `payload` and the logged message type differ.
async function sendWhatsAppMessage(input: {
  logBody: string;
  messageType: OutboundMessageType;
  payload: Record<string, unknown>;
  toPhone: string;
}): Promise<SendResult> {
  const { logBody, messageType, payload, toPhone } = input;
  const normalizedPhone = normalizePhone(toPhone);

  if (!normalizedPhone) {
    return { error: "Nomor WhatsApp tidak valid.", ok: false, status: "failed" };
  }

  const user = await findUserForLogin(normalizedPhone);
  const isInsideServiceWindow = Boolean(
    user?.serviceWindowUntil && user.serviceWindowUntil > new Date(),
  );

  if (!user || !isInsideServiceWindow) {
    if (user) {
      await createSkippedNotification(user.id, logBody);
    }

    await logOutbound({
      body: logBody,
      costType: "skipped_outside_window",
      messageType,
      processedStatus: "skipped",
      toPhone: normalizedPhone,
      userId: user?.id,
    });

    return {
      error: "Di luar jendela layanan 24 jam. Pesan WhatsApp tidak dikirim.",
      ok: false,
      status: "skipped_outside_window",
    };
  }

  const config = getWhatsAppConfig();
  reportMissingWhatsAppEnv(
    ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
    "send",
  );

  if (!config.accessToken || !config.phoneNumberId) {
    await logOutbound({
      body: logBody,
      costType: "free_window",
      messageType,
      processedStatus: "failed",
      toPhone: normalizedPhone,
      userId: user.id,
    });

    return {
      error: "Konfigurasi WhatsApp Cloud API belum lengkap.",
      ok: false,
      status: "failed",
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: normalizedPhone,
          ...payload,
        }),
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
    const responsePayload = (await response.json().catch(() => null)) as
      | { error?: { message?: string }; messages?: Array<{ id?: string }> }
      | null;
    const messageId = responsePayload?.messages?.[0]?.id ?? null;

    await logOutbound({
      body: logBody,
      costType: "free_window",
      messageId,
      messageType,
      processedStatus: response.ok ? "processed" : "failed",
      toPhone: normalizedPhone,
      userId: user.id,
    });

    if (!response.ok) {
      return {
        error:
          responsePayload?.error?.message ||
          `WhatsApp API error ${response.status}.`,
        ok: false,
        status: "failed",
      };
    }

    return { messageId, ok: true, status: "sent" };
  } catch (error) {
    await logOutbound({
      body: logBody,
      costType: "free_window",
      messageType,
      processedStatus: "failed",
      toPhone: normalizedPhone,
      userId: user.id,
    });

    return {
      error: error instanceof Error ? error.message : "Gagal mengirim pesan WhatsApp.",
      ok: false,
      status: "failed",
    };
  }
}
