import { randomUUID } from "node:crypto";

import { debugWhatsApp } from "@/lib/whatsapp/config";
import { handleWhatsAppImage } from "@/lib/whatsapp/handle-image";
import {
  recordInboundWhatsAppMessage,
  updateInboundWhatsAppStatus,
} from "@/lib/whatsapp/inbound";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Form data tidak valid." }, { status: 400 });
  }

  const from = String(formData.get("from") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim() || null;
  const requestedMessageId = String(formData.get("messageId") ?? "").trim();
  const messageId = requestedMessageId || `dev-proof-${randomUUID()}`;
  const file = formData.get("file");

  if (!from || !(file instanceof File)) {
    return Response.json(
      { error: 'Kirim multipart field "from" dan "file".' },
      { status: 400 },
    );
  }

  let inboundLogId: string | null = null;

  try {
    const inbound = await recordInboundWhatsAppMessage({
      body: caption,
      fromPhone: from,
      mediaUrl: `dev-file:${file.name}`,
      messageType: "image",
      whatsappMessageId: messageId,
    });
    inboundLogId = inbound.logId;

    if (inbound.duplicate) {
      debugWhatsApp("Proof simulator delivery", {
        duplicate: true,
        messageId,
        messageType: "image",
        paymentId: null,
      });

      return Response.json({
        duplicate: true,
        duplicates: 1,
        ignored: 1,
        messageId,
        paymentId: null,
        processed: 0,
        received: true,
        reply: null,
        status: null,
      });
    }

    if (!inbound.userId) {
      throw new Error("Pengguna WhatsApp tidak ditemukan.");
    }

    const result = await handleWhatsAppImage({
      caption,
      file,
      userId: inbound.userId,
    });

    if (inboundLogId) {
      await updateInboundWhatsAppStatus(inboundLogId, "processed");
    }

    debugWhatsApp("Proof simulator delivery", {
      duplicate: false,
      messageId,
      messageType: "image",
      paymentId: result.paymentId,
    });

    return Response.json({
      detectedAmount: result.detectedAmount ?? null,
      duplicate: false,
      duplicates: 0,
      hasWarnings: result.hasWarnings ?? false,
      ignored: 0,
      messageId,
      paymentId: result.paymentId,
      processed: 1,
      received: true,
      reply: result.reply,
      status: result.status,
    });
  } catch (error) {
    if (inboundLogId) {
      await updateInboundWhatsAppStatus(inboundLogId, "failed");
    }

    console.error("WhatsApp proof simulator failed", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Simulator bukti gagal.",
      },
      { status: 500 },
    );
  }
}
