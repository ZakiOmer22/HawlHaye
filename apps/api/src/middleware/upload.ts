import multer from "multer";
import { safeFromBuffer } from "../lib/safe-file-type";
import { HttpError } from "./errors";
import { prisma } from "../lib/prisma";
import { getSystemSettings } from "./settings";

// Store in memory first so we can inspect the binary signature before saving to disk/S3
const storage = multer.memoryStorage();

export const uploadAttachment = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size
    files: 1, // Only 1 file per request
  },
});

const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export async function validateFileMagicBytes(fileBuffer: Buffer) {
  const type = await safeFromBuffer(fileBuffer);

  if (!type || !ALLOWED_MIMES.includes(type.mime)) {
    throw new HttpError(
      400,
      "Invalid file type. Only PDF, images, and office documents are allowed.",
      "invalid_file_type",
    );
  }

  return type;
}

// Check global storage limit before saving
export async function assertStorageAvailable(additionalBytes: number) {
  const settings = await getSystemSettings();
  const limitMb = settings?.storageLimitMb ?? 10240; // Default 10GB
  const limitBytes = BigInt(limitMb) * 1024n * 1024n;

  // NOTE: Change 'attachment' to your actual Prisma model name for files
  // (e.g., 'file', 'taskAttachment', etc.) and 'sizeBytes' to your actual size field.
  const agg = await prisma.attachment.aggregate({ _sum: { sizeBytes: true } });
  const usedBytes = BigInt(agg._sum.sizeBytes ?? 0);

  if (usedBytes + BigInt(additionalBytes) > limitBytes) {
    throw new HttpError(
      413,
      "Global storage limit exceeded. Contact an administrator.",
      "storage_limit_exceeded",
    );
  }
}
