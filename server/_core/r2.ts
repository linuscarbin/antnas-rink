import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ENV, isR2Configured } from "./env";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  const endpoint =
    ENV.r2.endpoint ||
    `https://${ENV.r2.accountId}.r2.cloudflarestorage.com`;
  _client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: ENV.r2.accessKeyId,
      secretAccessKey: ENV.r2.secretAccessKey,
    },
  });
  return _client;
}

/**
 * Uploads a buffer to R2 and returns the public URL (served via your domain).
 * Throws if R2 is not configured — callers should check isR2Configured() first.
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured");
  }
  await getClient().send(
    new PutObjectCommand({
      Bucket: ENV.r2.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return buildPublicUrl(ENV.r2.publicUrl, key);
}

/** Builds the public URL for a stored object (pure, testable). */
export function buildPublicUrl(publicBase: string, key: string): string {
  const base = publicBase.replace(/\/+$/, "");
  const cleanKey = key.replace(/^\/+/, "");
  return `${base}/${cleanKey}`;
}

export { isR2Configured };
