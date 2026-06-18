import { handleWhatsAppProofImage } from "@/lib/whatsapp/handle-proof-image";
import {
  recordInboundWhatsAppMessage,
  updateInboundWhatsAppStatus,
} from "@/lib/whatsapp/inbound";
import { downloadWhatsAppMedia } from "@/lib/whatsapp/media";
import { processInboundWhatsAppText } from "@/lib/whatsapp/process-inbound";
import { sendWhatsAppText } from "@/lib/whatsapp/send-message";

export const runtime = "nodejs";

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          id?: string;
          image?: {
            caption?: string;
            id?: string;
            mime_type?: string;
          };
          text?: { body?: string };
          type?: string;
        }>;
      };
    }>;
  }>;
};

type WebhookMessage =
  | {
      fromPhone: string;
      text: string;
      type: "text";
      whatsappMessageId: string;
    }
  | {
      caption: string | null;
      fromPhone: string;
      mediaId: string;
      type: "image";
      whatsappMessageId: string;
    };

function getMessages(payload: WhatsAppWebhookPayload): WebhookMessage[] {
  return (
    payload.entry?.flatMap(
      (entry) =>
        entry.changes?.flatMap(
          (change) =>
            change.value?.messages
              ?.flatMap((message): WebhookMessage[] => {
                if (
                  message.type === "text" &&
                  message.id &&
                  message.from &&
                  message.text?.body
                ) {
                  return [
                    {
                      fromPhone: message.from,
                      text: message.text.body,
                      type: "text",
                      whatsappMessageId: message.id,
                    },
                  ];
                }

                if (
                  message.type === "image" &&
                  message.id &&
                  message.from &&
                  message.image?.id
                ) {
                  return [
                    {
                      caption: message.image.caption?.trim() || null,
                      fromPhone: message.from,
                      mediaId: message.image.id,
                      type: "image",
                      whatsappMessageId: message.id,
                    },
                  ];
                }

                return [];
              }) ?? [],
        ) ?? [],
    ) ?? []
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (!verifyToken) {
    return new Response("WHATSAPP_VERIFY_TOKEN belum diatur.", { status: 503 });
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, {
      headers: { "Content-Type": "text/plain" },
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
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  const messages = getMessages(payload);
  const results = [];

  for (const message of messages) {
    let imageLogId: string | null = null;

    try {
      if (message.type === "text") {
        const processed = await processInboundWhatsAppText(message);
        const sendResult =
          processed.reply && !processed.duplicate
            ? await sendWhatsAppText({
                body: processed.reply,
                toPhone: processed.fromPhone,
              })
            : null;

        results.push({
          duplicate: processed.duplicate,
          messageId: message.whatsappMessageId,
          sent: sendResult?.ok ?? false,
          type: message.type,
        });
        continue;
      }

      const inbound = await recordInboundWhatsAppMessage({
        body: message.caption,
        fromPhone: message.fromPhone,
        mediaUrl: `whatsapp-media:${message.mediaId}`,
        messageType: "image",
        whatsappMessageId: message.whatsappMessageId,
      });
      imageLogId = inbound.logId;

      if (inbound.duplicate) {
        results.push({
          duplicate: true,
          messageId: message.whatsappMessageId,
          sent: false,
          type: message.type,
        });
        continue;
      }

      const media = await downloadWhatsAppMedia(message.mediaId);

      if (!media.ok) {
        await updateInboundWhatsAppStatus(imageLogId!, "failed");
        const reply =
          "Bukti belum bisa diunduh dari WhatsApp. Coba kirim ulang atau upload dari dashboard.";
        const sendResult = await sendWhatsAppText({
          body: reply,
          toPhone: inbound.fromPhone,
        });

        results.push({
          error: media.error,
          messageId: message.whatsappMessageId,
          sent: sendResult.ok,
          type: message.type,
        });
        continue;
      }

      const file = new File([Uint8Array.from(media.buffer)], media.filename, {
        type: media.contentType,
      });
      const proofResult = await handleWhatsAppProofImage({
        caption: message.caption,
        file,
        userId: inbound.userId,
      });

      await updateInboundWhatsAppStatus(imageLogId!, "processed");

      const sendResult = await sendWhatsAppText({
        body: proofResult.reply,
        toPhone: inbound.fromPhone,
      });

      results.push({
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
            console.error("Failed to mark WhatsApp image message as failed", statusError);
          },
        );
      }

      console.error("Failed to process WhatsApp webhook message", error);
      results.push({
        error: error instanceof Error ? error.message : "Unknown error",
        messageId: message.whatsappMessageId,
        sent: false,
      });
    }
  }

  return Response.json({
    processed: results.length,
    results,
  });
}
