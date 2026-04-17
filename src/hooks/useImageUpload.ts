"use client";

import { useCallback, useState } from "react";
import { nanoid } from "nanoid";

export interface UploadFileItem {
  id: string;
  file: File;
  name: string;
  preview: string;
  publicUrl?: string;
  status: "pending" | "uploading" | "uploaded" | "error";
  progress: number;
  error?: string;
}

interface UseImageUploadReturn {
  files: UploadFileItem[];
  isUploading: boolean;
  addFiles: (newFiles: File[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  uploadAll: () => Promise<string[]>;
}

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function useImageUpload(): UseImageUploadReturn {
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    const items: UploadFileItem[] = newFiles
      .filter((f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_BYTES)
      .map((f) => ({
        id: nanoid(),
        file: f,
        name: f.name,
        preview: URL.createObjectURL(f),
        status: "pending" as const,
        progress: 0,
      }));
    setFiles((prev) => [...prev, ...items]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const clearFiles = useCallback(() => {
    setFiles((prev) => {
      for (const f of prev) if (f.preview) URL.revokeObjectURL(f.preview);
      return [];
    });
  }, []);

  const uploadAll = useCallback(async (): Promise<string[]> => {
    setIsUploading(true);
    const urls: string[] = [];

    for (const item of files) {
      if (item.status === "uploaded" && item.publicUrl) {
        urls.push(item.publicUrl);
        continue;
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "uploading" as const, progress: 10 } : f
        )
      );

      try {
        const presignRes = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: item.name,
            contentType: item.file.type,
            sizeBytes: item.file.size,
          }),
        });

        if (!presignRes.ok) {
          const errJson = await presignRes.json().catch(() => ({}));
          const serverMsg =
            typeof errJson?.error === "string" ? errJson.error : presignRes.statusText;
          throw new Error(`Presign failed: ${serverMsg}`);
        }
        const { uploadUrl, publicUrl } = (await presignRes.json()) as {
          uploadUrl: string;
          publicUrl: string;
        };

        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, progress: 30 } : f))
        );

        const xhr = new XMLHttpRequest();
        await new Promise<void>((resolve, reject) => {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 70) + 30;
              setFiles((prev) =>
                prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f))
              );
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              // Most common cause on Vercel: S3 bucket CORS does not allow the
              // current origin. The S3 error body usually says "AllowedOrigin".
              const body = (xhr.responseText || "").slice(0, 240);
              reject(new Error(`S3 ${xhr.status}: ${body || "see S3 CORS / bucket permissions"}`));
            }
          };
          xhr.onerror = () =>
            reject(
              new Error(
                "Upload network error — likely S3 CORS blocking this origin. See README / AWS S3 bucket CORS config."
              )
            );
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", item.file.type);
          xhr.send(item.file);
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: "uploaded" as const, progress: 100, publicUrl }
              : f
          )
        );
        urls.push(publicUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: "error" as const, error: msg } : f
          )
        );
      }
    }

    setIsUploading(false);
    return urls;
  }, [files]);

  return { files, isUploading, addFiles, removeFile, clearFiles, uploadAll };
}
