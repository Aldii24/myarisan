import "server-only";

const reportedMissingEnv = new Set<string>();

export function getWhatsAppConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || null,
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || "v20.0",
    appUrl: (
      process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"
    ).replace(/\/+$/, ""),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() || null,
  };
}

export function reportMissingWhatsAppEnv(
  names: Array<
    | "NEXT_PUBLIC_APP_URL"
    | "WHATSAPP_ACCESS_TOKEN"
    | "WHATSAPP_PHONE_NUMBER_ID"
    | "WHATSAPP_VERIFY_TOKEN"
  >,
  context: string,
) {
  const missing = names.filter((name) => !process.env[name]?.trim());

  for (const name of missing) {
    const reportKey = `${context}:${name}`;

    if (!reportedMissingEnv.has(reportKey)) {
      reportedMissingEnv.add(reportKey);
      console.warn(`[WhatsApp:${context}] Missing environment variable: ${name}`);
    }
  }

  return missing;
}

export function debugWhatsApp(
  message: string,
  details?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[WhatsApp] ${message}`, details ?? {});
  }
}
