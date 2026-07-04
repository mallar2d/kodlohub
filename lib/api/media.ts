import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "@/lib/r2";

// Match the proven /api/upload + /api/presign defaults (env var is authoritative in prod).
export const R2_BUCKET = process.env.R2_BUCKET_NAME || "kodlo-hub";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";
export const MAX_MEDIA_SIZE = 100 * 1024 * 1024; // 100 MB

const TEXT_CONTENT_TYPES = ["text/", "application/json", "application/xml"];

/** Unique R2 object key scoped to the uploading user. */
export function mediaKey(authorId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "bin";
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  return `${authorId}/${unique}`;
}

function normalizeContentType(contentType: string): string {
  return TEXT_CONTENT_TYPES.some((t) => contentType.startsWith(t))
    ? `${contentType}; charset=utf-8`
    : contentType;
}

export function publicUrlFor(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

/** Whether a URL points at our own R2 bucket (guards the register-by-url path). */
export function isOwnR2Url(url: string): boolean {
  return R2_PUBLIC_URL.length > 0 && url.startsWith(`${R2_PUBLIC_URL}/`);
}

export async function putToR2(
  key: string,
  body: Uint8Array,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType ? normalizeContentType(contentType) : "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return publicUrlFor(key);
}

export async function presignPut(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType ? normalizeContentType(contentType) : "application/octet-stream",
    CacheControl: "public, max-age=31536000, immutable",
  });
  return getSignedUrl(r2, command, { expiresIn: 600 });
}
