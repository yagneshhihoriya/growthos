import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { publicUrlForS3Key } from "@/lib/public-url";

let client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (client) return client;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("AWS S3 client env vars are missing");
  }
  client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export function getS3Bucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("AWS_S3_BUCKET is not set");
  return bucket;
}

export function getCDNUrl(key: string): string {
  return publicUrlForS3Key(key);
}

export async function uploadToS3(params: {
  key: string;
  buffer: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<string> {
  const s3 = getS3Client();
  const bucket = getS3Bucket();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType,
      CacheControl: params.cacheControl ?? "public, max-age=31536000, immutable",
    })
  );
  return getCDNUrl(params.key);
}

export async function getPresignedUploadUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; key: string }> {
  const s3 = getS3Client();
  const bucket = getS3Bucket();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: params.expiresInSeconds ?? 300,
  });
  return { uploadUrl, key: params.key };
}

export async function getPresignedDownloadUrl(params: {
  key: string;
  expiresInSeconds?: number;
  filename?: string;
}): Promise<string> {
  const s3 = getS3Client();
  const bucket = getS3Bucket();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ...(params.filename
      ? { ResponseContentDisposition: `attachment; filename="${params.filename}"` }
      : {}),
  });
  return await getSignedUrl(s3, command, {
    expiresIn: params.expiresInSeconds ?? 86400,
  });
}

export async function downloadFromS3(key: string): Promise<Buffer> {
  const s3 = getS3Client();
  const bucket = getS3Bucket();
  const result = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  const stream = result.Body;
  if (!stream) throw new Error(`Empty body for S3 key: ${key}`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function deleteFromS3(key: string): Promise<void> {
  const s3 = getS3Client();
  const bucket = getS3Bucket();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function existsInS3(key: string): Promise<boolean> {
  const s3 = getS3Client();
  const bucket = getS3Bucket();
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}
