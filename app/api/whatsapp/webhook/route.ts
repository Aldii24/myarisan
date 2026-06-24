import {
  debugWhatsApp,
  getWhatsAppConfig,
  reportMissingWhatsAppEnv,
} from "@/lib/whatsapp/config";
import { handleWhatsAppImage } from "@/lib/whatsapp/handle-image";
import {
  recordInboundWhatsAppMessage,
  updateInboundWhatsAppStatus,
} from "@/lib/whatsapp/inbound";
import { downloadWhatsAppMedia } from "@/lib/whatsapp/media";
import { processInboundWhatsAppText } from "@/lib/whatsapp/process-inbound";
import { sendWhatsAppText } from "@/lib/whatsapp/send-message";

export const runtime = "nodejs";
// Payment-proof OCR/AI is deferred to `after()`; allow time for that background
// work so the webhook itself still returns fast.
export const maxDuration = 60;

const processingFailureReply =
  "⚠️ Maaf, pesan/bukti kamu belum bisa diproses. Coba kirim ulang sebentar lagi, atau buka dashboard MyArisan ya 🙏";

type MetaContact = {
  profile?: { name?: string };
  wa_id?: string;
};

type MetaMessage = {
  from?: string;
  id?: string;
  image?: {
    caption?: string;
    id?: string;
    mime_type?: string;
    sha256?: string;
  };
  text?: { body?: string };
  timestamp?: string;
  type?: string;
};

type MetaWebhookValue = {
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  statuses?: unknown[];
};

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: MetaWebhookValue;
    }>;
    id?: string;
  }>;
  object?: string;
};

type WebhookMessage =
  | {
      contactName: string | null;
      fromPhone: string;
      metadata: MetaWebhookValue["metadata"];
      text: string;
      timestamp: Date | null;
      type: "text";
      whatsappMessageId: string;
    }
  | {
      caption: string | null;
      contactName: string | null;
      fromPhone: string;
      mediaId: string;
      metadata: MetaWebhookValue["metadata"];
      mimeType: string | null;
      sha256: string | null;
      timestamp: Date | null;
      type: "image";
      whatsappMessageId: string;
    };

function parseTimestamp(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const timestamp = new Date(Number(value) * 1000);

  return Number.isNaN(timestamp.getTime()) ? null : timestamp;
}

function contactNameFor(contacts: MetaContact[] | undefined, fromPhone: string) {
  return (
    contacts?.find((contact) => contact.wa_id === fromPhone)?.profile?.name?.trim() ||
    null
  );
}

function getMessages(payload: WhatsAppWebhookPayload): {
  ignoredMessageTypes: string[];
  messages: WebhookMessage[];
  statusCount: number;
} {
  const messages: WebhookMessage[] = [];
  const ignoredMessageTypes: string[] = [];
  let statusCount = 0;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;

      if (!value) {
        continue;
      }

      statusCount += value.statuses?.length ?? 0;

      for (const message of value.messages ?? []) {
        if (!message.id || !message.from) {
          continue;
        }

        const common = {
          contactName: contactNameFor(value.contacts, message.from),
          fromPhone: message.from,
          metadata: value.metadata,
          timestamp: parseTimestamp(message.timestamp),
          whatsappMessageId: message.id,
        };

        if (message.type === "text" && message.text?.body) {
          messages.push({
            ...common,
            text: message.text.body,
            type: "text",
          });
          continue;
        }

        if (message.type === "image" && message.image?.id) {
          messages.push({
            ...common,
            caption: message.image.caption?.trim() || null,
            mediaId: message.image.id,
            mimeType: message.image.mime_type?.trim() || null,
            sha256: message.image.sha256?.trim() || null,
            type: "image",
          });
          continue;
        }

        ignoredMessageTypes.push(message.type || "unknown");
      }
    }
  }

  return { ignoredMessageTypes, messages, statusCount };
}

async function sendProcessingFailure(fromPhone: string) {
  const result = await sendWhatsAppText({
    body: processingFailureReply,
    toPhone: fromPhone,
  });

  return result.ok;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const config = getWhatsAppConfig();

  if (!config.verifyToken) {
    reportMissingWhatsAppEnv(["WHATSAPP_VERIFY_TOKEN"], "verify");
  }

  if (
    config.verifyToken &&
    mode === "subscribe" &&
    token === config.verifyToken &&
    challenge
  ) {
    return new Response(challenge, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      status: 200,
    });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  let payload: WhatsAppWebhookPayload;

  try {
    payload = (await request.json()) as WhatsAppWebhookPayload;
  } catch {
    return Response.json({ received: false }, { status: 400 });
  }

  const parsed = getMessages(payload);
  const results: Array<Record<string, unknown>> = [];

  debugWhatsApp("Webhook delivery received", {
    ignoredMessageTypes: parsed.ignoredMessageTypes,
    messageCount: parsed.messages.length,
    object: payload.object ?? null,
    statusCount: parsed.statusCount,
  });

  for (const message of parsed.messages) {
    let imageLogId: string | null = null;

    debugWhatsApp("Inbound message", {
      contactName: message.contactName,
      fromPhone: message.fromPhone,
      messageType: message.type,
      phoneNumberId: message.metadata?.phone_number_id ?? null,
      timestamp: message.timestamp?.toISOString() ?? null,
    });

    try {
      if (message.type === "text") {
        const processed = await processInboundWhatsAppText(message);

        if (processed.duplicate) {
          debugWhatsApp("Webhook message result", {
            duplicate: true,
            messageId: message.whatsappMessageId,
            messageType: message.type,
            paymentId: null,
          });
          results.push({
            duplicate: true,
            messageId: message.whatsappMessageId,
            type: message.type,
          });
          continue;
        }

        const sendResult = processed.reply
          ? await sendWhatsAppText({
              body: processed.reply,
              toPhone: processed.fromPhone,
            })
          : null;

        debugWhatsApp("Text message processed", {
          command: processed.command?.name ?? null,
          duplicate: false,
          fromPhone: processed.fromPhone,
          messageId: message.whatsappMessageId,
          messageType: message.type,
          paymentId: null,
          sent: sendResult?.ok ?? false,
        });
        results.push({
          duplicate: false,
          messageId: message.whatsappMessageId,
          sent: sendResult?.ok ?? false,
          type: message.type,
        });
        continue;
      }

      const mediaDescription = [
        `whatsapp-media:${message.mediaId}`,
        message.mimeType ? `mime=${message.mimeType}` : null,
        message.sha256 ? `sha256=${message.sha256}` : null,
      ]
        .filter(Boolean)
        .join(";");
      const inbound = await recordInboundWhatsAppMessage({
        body: message.caption,
        fromPhone: message.fromPhone,
        mediaUrl: mediaDescription,
        messageType: "image",
        whatsappMessageId: message.whatsappMessageId,
      });
      imageLogId = inbound.logId;

      if (inbound.duplicate) {
        debugWhatsApp("Webhook message result", {
          duplicate: true,
          messageId: message.whatsappMessageId,
          messageType: message.type,
          paymentId: null,
        });
        results.push({
          duplicate: true,
          messageId: message.whatsappMessageId,
          type: message.type,
        });
        continue;
      }

      if (!inbound.userId) {
        throw new Error("Pengguna WhatsApp tidak ditemukan.");
      }

      const media = await downloadWhatsAppMedia(message.mediaId);

      if (!media.ok) {
        throw new Error(`Media download failed: ${media.error}`);
      }

      const file = new File([Uint8Array.from(media.buffer)], media.filename, {
        type: media.contentType,
      });
      const proofResult = await handleWhatsAppImage({
        caption: message.caption,
        file,
        userId: inbound.userId,
      });

      await updateInboundWhatsAppStatus(imageLogId!, "processed");

      const sendResult = await sendWhatsAppText({
        body: proofResult.reply,
        toPhone: inbound.fromPhone,
      });

      debugWhatsApp("Image message processed", {
        duplicate: false,
        fromPhone: inbound.fromPhone,
        messageId: message.whatsappMessageId,
        messageType: message.type,
        paymentId: proofResult.paymentId,
        sent: sendResult.ok,
        status: proofResult.status,
      });
      results.push({
        duplicate: false,
        messageId: message.whatsappMessageId,
        paymentId: proofResult.paymentId,
        sent: sendResult.ok,
        status: proofResult.status,
        type: message.type,
      });
    } catch (error) {
      if (imageLogId) {
        await updateInboundWhatsAppStatus(imageLogId, "failed").catch(
          (statusError) => {
            console.error(
              "[WhatsApp] Failed to mark inbound image as failed",
              statusError,
            );
          },
        );
      }

      console.error("[WhatsApp] Message processing failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        fromPhone: message.fromPhone,
        messageId: message.whatsappMessageId,
        messageType: message.type,
      });

      const failureReplySent = await sendProcessingFailure(message.fromPhone).catch(
        (sendError) => {
          console.error("[WhatsApp] Failure reply could not be sent", {
            error:
              sendError instanceof Error ? sendError.message : "Unknown error",
            messageId: message.whatsappMessageId,
          });
          return false;
        },
      );

      results.push({
        failed: true,
        failureReplySent,
        messageId: message.whatsappMessageId,
        type: message.type,
      });
    }
  }

  const duplicates = results.filter((result) => result.duplicate === true).length;

  return Response.json({
    duplicates,
    ignored: parsed.ignoredMessageTypes.length + duplicates,
    processed: results.length - duplicates,
    received: true,
    ...(process.env.NODE_ENV !== "production" ? { results } : {}),
  });
}
