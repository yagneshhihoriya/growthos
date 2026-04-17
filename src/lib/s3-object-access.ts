import axios from "axios";
import { downloadFromS3 } from "@/lib/s3";

async function fetchBufferFromUrl(url: string): Promise<Buffer> {
  const res = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
  return Buffer.from(res.data);
}

/**
 * Extract S3 object key from a GrowthOS public URL (virtual-hosted S3 or CloudFront).
 */
export function extractS3ObjectKeyFromUrl(url: string): string | null {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  const cf = process.env.AWS_CLOUDFRONT_URL?.replace(/\/$/, "");

  try {
    const u = new URL(url);
    if (cf && (url.startsWith(`${cf}/`) || u.origin === new URL(cf).origin)) {
      const path = u.pathname.replace(/^\//, "");
      return path ? decodeURIComponent(path) : null;
    }
    if (bucket && region) {
      const vh = `${bucket}.s3.${region}.amazonaws.com`;
      if (u.hostname === vh) {
        return decodeURIComponent(u.pathname.replace(/^\//, ""));
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function isSellerObjectKey(key: string, sellerId: string): boolean {
  return key.startsWith(`uploads/${sellerId}/`) || key.startsWith(`${sellerId}/`);
}

/**
 * Resolve an S3 object key from values we store on ImageJob (viewer path, HTTPS URL, or raw key).
 */
export function extractS3KeyFromStoredUrl(ref: string, sellerId: string): string | null {
  if (!ref || !ref.trim()) return null;
  const trimmed = ref.trim();
  if (trimmed.startsWith("/api/images/file")) {
    try {
      const u = new URL(trimmed, "https://placeholder.local");
      const raw = u.searchParams.get("key");
      if (!raw) return null;
      const key = decodeURIComponent(raw);
      return isSellerObjectKey(key, sellerId) ? key : null;
    } catch {
      return null;
    }
  }
  const fromHttps = extractS3ObjectKeyFromUrl(trimmed);
  if (fromHttps && isSellerObjectKey(fromHttps, sellerId)) return fromHttps;
  if (isSellerObjectKey(trimmed, sellerId)) return trimmed;
  return null;
}

/** All distinct S3 keys referenced by an image job (only keys owned by seller). */
export function collectS3KeysForImageJob(params: {
  sellerId: string;
  originalUrl: string;
  originalKey: string | null;
  processedUrls: Record<string, string> | null;
  bgRemovedUrl: string | null;
}): string[] {
  const { sellerId, originalUrl, originalKey, processedUrls, bgRemovedUrl } = params;
  const keys = new Set<string>();

  const add = (ref: string | null | undefined) => {
    if (!ref) return;
    const k = extractS3KeyFromStoredUrl(ref, sellerId);
    if (k) keys.add(k);
  };

  add(originalUrl);
  add(originalKey ?? undefined);
  add(bgRemovedUrl ?? undefined);
  if (processedUrls && typeof processedUrls === "object") {
    for (const v of Object.values(processedUrls)) {
      if (typeof v === "string") add(v);
    }
  }
  return Array.from(keys);
}

/**
 * Load image bytes for AI edit: prefer private S3 fetch when URL is our bucket.
 */
export async function loadImageBufferForEdit(imageUrl: string, sellerId: string): Promise<Buffer> {
  const key = extractS3ObjectKeyFromUrl(imageUrl);
  if (key && isSellerObjectKey(key, sellerId)) {
    return downloadFromS3(key);
  }
  return fetchBufferFromUrl(imageUrl);
}
