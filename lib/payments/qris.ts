// The manual-payment QRIS image is committed to public/QRIS so the QRIS flow
// works on every deploy without extra config. NEXT_PUBLIC_MANUAL_QRIS_IMAGE_URL
// overrides it when a hosted/CDN copy is preferred. Intentionally free of
// "server-only" so both the dashboard (client/server) and the WhatsApp bot can
// import it.

export const BUNDLED_QRIS_PATH = "/QRIS/qrispaymentmyarisan.jpeg";

function configuredQris() {
  return process.env.NEXT_PUBLIC_MANUAL_QRIS_IMAGE_URL?.trim() || null;
}

// Browser-friendly src for the dashboard. A root-relative path resolves against
// the current origin, so no app URL is needed.
export function qrisImageSrc() {
  return configuredQris() ?? BUNDLED_QRIS_PATH;
}

// Absolute URL for contexts without an origin (e.g. a WhatsApp text link).
export function qrisImageUrl(appUrl: string) {
  const configured = configuredQris();

  if (configured) {
    return configured;
  }

  return `${appUrl.replace(/\/+$/, "")}${BUNDLED_QRIS_PATH}`;
}

// WhatsApp Cloud "image" messages need a publicly reachable HTTPS URL — Meta's
// servers fetch the `link` themselves. A localhost/http app URL (dev) can't be
// fetched, so callers should fall back to a text reply with the link instead.
export function isPubliclyFetchableImageUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    return (
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      host !== "::1" &&
      !host.endsWith(".local")
    );
  } catch {
    return false;
  }
}
