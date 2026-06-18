import { randomUUID } from "node:crypto";

import { handleWhatsAppProofImage } from "@/lib/whatsapp/handle-proof-image";
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
      whatsappMessageId: `dev-proof-${randomUUID()}`,
    });
    inboundLogId = inbound.logId;
    const result = await handleWhatsAppProofImage({
      caption,
      file,
      userId: inbound.userId,
    });

    if (inboundLogId) {
      await updateInboundWhatsAppStatus(inboundLogId, "processed");
    }

    return Response.json({
      detectedAmount: result.detectedAmount ?? null,
      hasWarnings: result.hasWarnings ?? false,
      paymentId: result.paymentId,
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
