import "server-only";

type WhatsAppMediaDownload =
  | {
      buffer: Buffer;
      contentType: string;
      filename: string;
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

function extensionForContentType(contentType: string) {
  if (contentType.includes("png")) {
    return "png";
  }

  if (contentType.includes("webp")) {
    return "webp";
  }

  return "jpg";
}

export async function downloadWhatsAppMedia(
  mediaId: string,
): Promise<WhatsAppMediaDownload> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || "v20.0";

  if (!accessToken) {
    return {
      error: "WHATSAPP_ACCESS_TOKEN belum diatur.",
      ok: false,
    };
  }

  try {
    const metadataResponse = await fetch(
      `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(mediaId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const metadata = (await metadataResponse.json().catch(() => null)) as
      | { mime_type?: string; url?: string; error?: { message?: string } }
      | null;

    if (!metadataResponse.ok || !metadata?.url) {
      return {
        error:
          metadata?.error?.message ||
          `Gagal mengambil URL media WhatsApp (${metadataResponse.status}).`,
        ok: false,
      };
    }

    const mediaResponse = await fetch(metadata.url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!mediaResponse.ok) {
      return {
        error: `Gagal mengunduh media WhatsApp (${mediaResponse.status}).`,
        ok: false,
      };
    }

    const contentType =
      mediaResponse.headers.get("content-type") ||
      metadata.mime_type ||
      "image/jpeg";
    const buffer = Buffer.from(await mediaResponse.arrayBuffer());

    if (buffer.length === 0) {
      return { error: "Media WhatsApp kosong.", ok: false };
    }

    return {
      buffer,
      contentType,
      filename: `whatsapp-${mediaId}.${extensionForContentType(contentType)}`,
      ok: true,
    };
  } catch (error) {
    console.error("WhatsApp media download failed", error);

    return {
      error:
        error instanceof Error ? error.message : "Gagal mengunduh media WhatsApp.",
      ok: false,
    };
  }
}
