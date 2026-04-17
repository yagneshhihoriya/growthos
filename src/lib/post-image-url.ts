import { getPresignedDownloadUrl } from "@/lib/s3";
import { publicUrlForS3Key } from "@/lib/public-url";
import { extractS3KeyFromStoredUrl } from "@/lib/s3-object-access";

/**
 * Instagram/Meta must fetch the image over HTTPS without app cookies.
 * Prefer CloudFront / virtual-hosted public URL for our keys; otherwise short-lived presigned GET.
 */
export async function toPublicPostableUrl(storedUrl: string, sellerId: string): Promise<string> {
  const trimmed = storedUrl.trim();
  if (!trimmed) throw new Error("Image URL is empty");

  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    throw new Error("Invalid image URL for social posting");
  }

  const key = extractS3KeyFromStoredUrl(trimmed, sellerId);
  if (key) {
    const hasCf = Boolean(process.env.AWS_CLOUDFRONT_URL?.trim());
    if (hasCf) {
      return publicUrlForS3Key(key);
    }
    // Dev / private bucket: time-limited URL Meta can fetch (no Content-Disposition attachment).
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[post-image-url] AWS_CLOUDFRONT_URL unset — using 24h presigned URL for Meta fetch (set CloudFront for production)."
      );
    }
    return getPresignedDownloadUrl({ key, expiresInSeconds: 86400 });
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("Image URL must be https or an app-resolvable storage reference");
  }

  return trimmed;
}
