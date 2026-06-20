import "server-only";

import { getPendingAction } from "./conversation-state";
import { handlePaketProofImage } from "./handle-paket";
import { handleWhatsAppProofImage } from "./handle-proof-image";

export type WhatsAppImageResult = {
  reply: string;
  paymentId: string | null;
  status: string | null;
  detectedAmount?: number | null;
  hasWarnings?: boolean;
};

// Single entry point for inbound photos. An admin mid-paket flow (await_proof)
// has their photo routed to the package invoice; everyone else falls through to
// the member payment-proof flow. This keeps a package-payment screenshot from
// being misread as an arisan payment.
export async function handleWhatsAppImage(input: {
  caption?: string | null;
  file: File;
  userId: string;
}): Promise<WhatsAppImageResult> {
  const pendingAction = await getPendingAction(input.userId);

  if (pendingAction?.action === "manage_package") {
    const reply = await handlePaketProofImage({
      file: input.file,
      state: pendingAction,
      userId: input.userId,
    });

    return { paymentId: null, reply, status: null };
  }

  const result = await handleWhatsAppProofImage(input);

  return {
    detectedAmount: result.detectedAmount ?? null,
    hasWarnings: result.hasWarnings ?? false,
    paymentId: result.paymentId,
    reply: result.reply,
    status: result.status,
  };
}
