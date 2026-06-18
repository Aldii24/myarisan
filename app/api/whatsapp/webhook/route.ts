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
          text?: { body?: string };
          type?: string;
        }>;
      };
    }>;
  }>;
};

function getTextMessages(payload: WhatsAppWebhookPayload) {
  return (
    payload.entry?.flatMap(
      (entry) =>
        entry.changes?.flatMap(
          (change) =>
            change.value?.messages
              ?.filter(
                (message) =>
                  message.type === "text" &&
                  Boolean(message.id && message.from && message.text?.body),
              )
              .map((message) => ({
                fromPhone: message.from!,
                text: message.text!.body!,
                whatsappMessageId: message.id!,
              })) ?? [],
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

  const messages = getTextMessages(payload);
  const results = [];

  for (const message of messages) {
    try {
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
      });
    } catch (error) {
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
