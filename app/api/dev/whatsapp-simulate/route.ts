import { randomUUID } from "node:crypto";

import { processInboundWhatsAppText } from "@/lib/whatsapp/process-inbound";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }

  let payload: { from?: unknown; text?: unknown };

  try {
    payload = (await request.json()) as { from?: unknown; text?: unknown };
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  if (
    typeof payload.from !== "string" ||
    typeof payload.text !== "string" ||
    !payload.from.trim() ||
    !payload.text.trim()
  ) {
    return Response.json(
      { error: 'Kirim JSON dengan field "from" dan "text".' },
      { status: 400 },
    );
  }

  try {
    const result = await processInboundWhatsAppText({
      fromPhone: payload.from,
      text: payload.text,
      whatsappMessageId: `dev-${randomUUID()}`,
    });

    return Response.json({
      command: result.command,
      from: result.fromPhone,
      reply: result.reply,
      serviceWindowUntil: result.serviceWindowUntil.toISOString(),
    });
  } catch (error) {
    console.error("WhatsApp simulator failed", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Simulator gagal.",
      },
      { status: 500 },
    );
  }
}
