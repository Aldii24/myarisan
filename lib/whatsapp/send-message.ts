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

async function logOutbound(input: {
  body: string;
  costType: "free_window" | "skipped_outside_window";
  messageId?: string | null;
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
      messageType: "text",
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
  const { body, toPhone } = input;
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
      await createSkippedNotification(user.id, body);
    }

    await logOutbound({
      body,
      costType: "skipped_outside_window",
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
      body,
      costType: "free_window",
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
          text: {
            body,
            preview_url: false,
          },
          to: normalizedPhone,
          type: "text",
        }),
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string }; messages?: Array<{ id?: string }> }
      | null;
    const messageId = payload?.messages?.[0]?.id ?? null;

    await logOutbound({
      body,
      costType: "free_window",
      messageId,
      processedStatus: response.ok ? "processed" : "failed",
      toPhone: normalizedPhone,
      userId: user.id,
    });

    if (!response.ok) {
      return {
        error: payload?.error?.message || `WhatsApp API error ${response.status}.`,
        ok: false,
        status: "failed",
      };
    }

    return { messageId, ok: true, status: "sent" };
  } catch (error) {
    await logOutbound({
      body,
      costType: "free_window",
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
