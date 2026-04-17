import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  META_CLIENT_ID: z.string().optional(),
  META_CLIENT_SECRET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_CLOUDFRONT_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REMOVEBG_API_KEY: z.string().optional(),
  CLIPDROP_API_KEY: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  STABILITY_API_KEY: z.string().optional(),
  ENCRYPTION_KEY: z.string().length(64).optional().or(z.literal("")),
  PUSHER_APP_ID: z.string().optional(),
  PUSHER_APP_SECRET: z.string().optional(),
  NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function readServerEnv(): ServerEnv {
  return serverSchema.parse(process.env);
}

export function requireS3(): {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
} {
  const e = readServerEnv();
  if (
    !e.AWS_REGION ||
    !e.AWS_ACCESS_KEY_ID ||
    !e.AWS_SECRET_ACCESS_KEY ||
    !e.AWS_S3_BUCKET
  ) {
    throw new Error("AWS S3 is not configured");
  }
  return {
    region: e.AWS_REGION,
    accessKeyId: e.AWS_ACCESS_KEY_ID,
    secretAccessKey: e.AWS_SECRET_ACCESS_KEY,
    bucket: e.AWS_S3_BUCKET,
  };
}
