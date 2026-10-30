import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { HttpError } from "./errors";

// Store in memory first so we can inspect the binary signature before saving to disk/S3
const storage = multer.memoryStorage();

export const uploadAttachment = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
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
  const type = await fileTypeFromBuffer(fileBuffer);

  if (!type || !ALLOWED_MIMES.includes(type.mime)) {
    throw new HttpError(
      400,
      "Invalid file type. Only PDF, images, and office documents are allowed.",
      "invalid_file_type",
    );
  }

  return type;
}
