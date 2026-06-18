import "server-only";

export async function extractTextFromImage(imagePathOrUrl: string): Promise<string> {
  try {
    if (!imagePathOrUrl) {
      return "";
    }

    // TODO: Replace this placeholder with a production OCR provider such as
    // Tesseract, Google Vision, OCR.space, or another reliable image OCR service.
    return "";
  } catch (error) {
    console.warn("OCR extraction failed", error);
    return "";
  }
}
