import "server-only";

import { tmpdir } from "node:os";

import { createWorker, type Worker } from "tesseract.js";

const ocrLanguages = "ind+eng";
const ocrTimeoutMs = 20000;

let workerPromise: Promise<Worker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    // tesseract.js caches downloaded language data to `cachePath` (default cwd).
    // On serverless hosts like Vercel the cwd is read-only, so writing the
    // traineddata there throws EROFS and OCR never works. Point it at the OS
    // temp dir (/tmp on Vercel), the only writable location.
    workerPromise = createWorker(ocrLanguages, undefined, {
      cachePath: tmpdir(),
    }).catch((error) => {
      workerPromise = null;
      throw error;
    });
  }

  return workerPromise;
}

export async function extractTextFromImage(
  image: Buffer | Uint8Array | null | undefined,
): Promise<string> {
  if (!image || image.byteLength === 0) {
    return "";
  }

  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    const worker = await getWorker();
    const buffer = Buffer.isBuffer(image) ? image : Buffer.from(image);
    const recognition = worker.recognize(buffer);
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("OCR timed out.")), ocrTimeoutMs);
    });
    const { data } = await Promise.race([recognition, timeoutPromise]);

    return data.text.trim();
  } catch (error) {
    console.warn("OCR extraction failed", error);
    return "";
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
