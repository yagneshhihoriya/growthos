import axios from "axios";
import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { GoogleGenAI } from "@google/genai";
import { getS3Bucket, getS3Client } from "@/lib/s3";
import { publicUrlForS3Key } from "@/lib/public-url";

/** Default: stable Nano Banana (Gemini 2.5 Flash Image). Override with GEMINI_IMAGE_MODEL if needed. */
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

function imageModelId(): string {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
}

/** Placeholder URL for text-only generations (library / compare "before"). */
export const STUDIO_CREATE_ORIGINAL_PLACEHOLDER =
  "https://upload.wikimedia.org/wikipedia/commons/c/ca/1x1.png";

export async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return publicUrlForS3Key(key);
}

export async function fetchBufferFromUrl(url: string): Promise<Buffer> {
  const res = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
  return Buffer.from(res.data);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function formatGeminiApiError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const raw = String((err as { message: string }).message);
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string; code?: number; status?: string } };
      const m = parsed.error?.message;
      if (m) return m;
    } catch {
      return raw;
    }
    return raw;
  }
  return err instanceof Error ? err.message : "Unknown error";
}

function isRetryableGeminiError(err: unknown): boolean {
  const msg = formatGeminiApiError(err).toLowerCase();
  if (msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand")) return true;
  if (msg.includes("429") || msg.includes("resource exhausted") || msg.includes("rate")) return true;
  return false;
}

/** Downscale for Gemini inline image limits (~7MB per file in practice). */
async function prepareImageBufferForGeminiInline(imageBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;
  const maxEdge = 1536;
  let pipeline = sharp(imageBuffer).rotate();
  if (Math.max(w, h) > maxEdge) {
    pipeline = pipeline.resize({
      width: w >= h ? maxEdge : undefined,
      height: h > w ? maxEdge : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  return pipeline.png({ compressionLevel: 9 }).toBuffer();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageBufferFromGeminiResponse(response: any): Buffer {
  const candidates = response.candidates ?? [];
  for (const candidate of candidates) {
    const reason = candidate?.finishReason ?? candidate?.finish_reason;
    if (reason && String(reason).includes("SAFETY")) {
      throw new Error("Image generation was blocked by safety filters. Try a different prompt.");
    }
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      const inline = part.inlineData ?? part.inline_data;
      const data = inline?.data ?? inline?.bytes;
      if (data) {
        if (typeof data === "string") return Buffer.from(data, "base64");
        return Buffer.from(data);
      }
    }
  }
  throw new Error("Nano Banana returned no image. The model may have replied with text only — try a clearer image-generation prompt.");
}

async function generateContentWithRetries(
  ai: GoogleGenAI,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const maxAttempts = 4;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts && isRetryableGeminiError(err)) {
        await sleep(800 * attempt * attempt);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function requireGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

/**
 * Edit / transform: user image + prompt → single output image (JPEG).
 */
export async function nanoBananaEditImage(imageBuffer: Buffer, userPrompt: string): Promise<Buffer> {
  const apiKey = requireGeminiKey();
  const ai = new GoogleGenAI({ apiKey });
  const scenePrompt =
    userPrompt.trim() || "Minimal premium studio background, soft shadows, product photography";
  const png = await prepareImageBufferForGeminiInline(imageBuffer);
  const base64Image = png.toString("base64");

  const response = await generateContentWithRetries(ai, {
    model: imageModelId(),
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: base64Image,
            },
          },
          {
            text: `Transform this image according to the following instructions. Keep the main subject recognizable unless the user asks to change it completely. ${scenePrompt}. Output a single high-quality image suitable for e-commerce or social media.`,
          },
        ],
      },
    ],
    config: {
      responseModalities: ["image", "text"],
    },
  });

  const raw = extractImageBufferFromGeminiResponse(response);
  return await sharp(raw).jpeg({ quality: 92 }).toBuffer();
}

/**
 * Create from scratch: text-only → single output image (JPEG).
 */
export async function nanoBananaCreateImage(userPrompt: string): Promise<Buffer> {
  const apiKey = requireGeminiKey();
  const ai = new GoogleGenAI({ apiKey });
  const p = userPrompt.trim() || "A high quality product photograph on a clean studio background";

  const response = await generateContentWithRetries(ai, {
    model: imageModelId(),
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Create one high-quality image from this description. No collage, no grid — a single coherent image. ${p}`,
          },
        ],
      },
    ],
    config: {
      responseModalities: ["image", "text"],
    },
  });

  const raw = extractImageBufferFromGeminiResponse(response);
  return await sharp(raw).jpeg({ quality: 92 }).toBuffer();
}
