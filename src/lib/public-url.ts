export function publicUrlForS3Key(key: string): string {
  const cloudfront = process.env.AWS_CLOUDFRONT_URL?.replace(/\/$/, "");
  if (cloudfront) return `${cloudfront}/${key}`;

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) {
    throw new Error("AWS_S3_BUCKET and AWS_REGION are required to build public URLs");
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`;
}
