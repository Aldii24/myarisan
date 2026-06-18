import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const maxPaymentProofSize = 3 * 1024 * 1024;
const allowedPaymentProofTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export type StorageDriver = "local" | "r2";

export type StoredFile = {
  hash: string;
  publicPath: string;
};

export function getStorageDriver(): StorageDriver {
  return process.env.STORAGE_DRIVER === "r2" ? "r2" : "local";
}

export function validatePaymentProofFile(file: File) {
  if (!file || file.size === 0) {
    return "Upload bukti pembayaran dulu.";
  }

  if (!allowedPaymentProofTypes.has(file.type)) {
    return "Format bukti harus JPG, PNG, atau WebP.";
  }

  if (file.size > maxPaymentProofSize) {
    return "Ukuran bukti maksimal 3MB.";
  }

  return null;
}

export async function savePaymentProofFile(file: File): Promise<StoredFile> {
  return saveImageFile(file, "payment-proofs");
}

export async function saveInvoiceProofFile(file: File): Promise<StoredFile> {
  return saveImageFile(file, "package-payments");
}

export function getPublicStorageUrl(storedPathOrKey: string | null | undefined) {
  if (!storedPathOrKey) {
    return null;
  }

  if (storedPathOrKey.startsWith("/uploads/")) {
    return storedPathOrKey;
  }

  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");

  if (!publicBaseUrl) {
    return null;
  }

  return `${publicBaseUrl}/${storedPathOrKey.replace(/^\/+/, "")}`;
}

export function isLocalUploadPath(storedPathOrKey: string) {
  return storedPathOrKey.startsWith("/uploads/");
}

export function resolveLocalUploadPath(storedPath: string) {
  if (!isLocalUploadPath(storedPath) || storedPath.includes("..")) {
    return null;
  }

  return path.join(process.cwd(), "public", storedPath);
}

export async function getR2Object(storedKey: string) {
  const { bucketName, client } = getR2Client();

  return client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: storedKey.replace(/^\/+/, ""),
    }),
  );
}

async function saveImageFile(file: File, folderName: string): Promise<StoredFile> {
  const validationError = validatePaymentProofFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const extension = allowedPaymentProofTypes.get(file.type);

  if (!extension) {
    throw new Error("Format bukti tidak didukung.");
  }

  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const objectKey = `${folderName}/${fileName}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");

  if (getStorageDriver() === "r2") {
    await saveR2Object({
      body: bytes,
      contentType: file.type,
      key: objectKey,
    });

    // TODO: Rename proof_image_url columns to storage_key when storage is formalized.
    return {
      hash,
      publicPath: objectKey,
    };
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", folderName);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), bytes);

  return {
    hash,
    publicPath: `/uploads/${objectKey}`,
  };
}

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      "R2 storage requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.",
    );
  }

  return {
    bucketName,
    client: new S3Client({
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      region: "auto",
    }),
  };
}

async function saveR2Object(input: {
  body: Buffer;
  contentType: string;
  key: string;
}) {
  const { bucketName, client } = getR2Client();

  await client.send(
    new PutObjectCommand({
      Body: input.body,
      Bucket: bucketName,
      ContentType: input.contentType,
      Key: input.key,
    }),
  );
}
