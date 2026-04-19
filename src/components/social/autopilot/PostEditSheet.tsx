"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { useImageUpload } from "@/hooks/useImageUpload";

export type AutopilotPost = {
  id: string;
  caption: string;
  hashtags: string[];
  imageUrl: string;
  platforms: string[];
  status: string;
  scheduledFor: string | null;
  autopilotDay: number | null;
  product: {
    id: string;
    name: string;
    rawImageUrls: string[];
    price: number | null;
  } | null;
};

type Props = {
  post: AutopilotPost | null;
  onClose: () => void;
  onSaved: (post: AutopilotPost) => void;
};

export function AutopilotPostEditSheet({ post, onClose, onSaved }: Props) {
  const [caption, setCaption] = React.useState("");
  const [hashtags, setHashtags] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const { addFiles, uploadAll, clearFiles, isUploading, files } = useImageUpload();
  const progress = files[0]?.progress ?? 0;

  React.useEffect(() => {
    if (post) {
      setCaption(post.caption);
      setHashtags(post.hashtags.join(" "));
      setImageUrl(post.imageUrl);
    }
  }, [post]);

  React.useEffect(() => {
    if (!post) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [post, onClose]);

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      clearFiles();
      addFiles([file]);
      // addFiles is async via setState; defer upload to next tick so the file is in state.
      await new Promise((r) => setTimeout(r, 0));
      const urls = await uploadAll();
      if (urls.length > 0) setImageUrl(urls[0]);
      else throw new Error("Upload failed — check file type (jpeg/png/webp, ≤25MB)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      e.target.value = "";
    }
  }

  async function save() {
    if (!post) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (caption.trim() !== post.caption) body.caption = caption.trim();
      const tags = hashtags
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith("#") ? t : `#${t}`));
      if (JSON.stringify(tags) !== JSON.stringify(post.hashtags)) body.hashtags = tags;
      if (imageUrl && imageUrl !== post.imageUrl) body.imageUrl = imageUrl;

      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }

      const res = await fetch(`/api/social/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Save failed");
      toast.success("Saved");
      onSaved({ ...post, ...(json.post as Partial<AutopilotPost>) });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const productImages = post?.product?.rawImageUrls ?? [];

  return (
    <AnimatePresence>
      {post ? (
        <motion.div
          className="fixed inset-0 z-40 bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-white/[0.08] bg-[rgb(14,14,18)] p-5"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Day {post.autopilotDay ?? "—"}
                </p>
                <p className="text-sm text-text-secondary">{post.product?.name ?? "Product"}</p>
              </div>
              <button onClick={onClose} className="rounded-full p-1 text-text-tertiary hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Image</p>
              <div className="aspect-square overflow-hidden rounded-xl bg-white/[0.04]">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-text-tertiary">
                    No image assigned
                  </div>
                )}
              </div>

              {productImages.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {productImages.slice(0, 6).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setImageUrl(u)}
                      className={`h-14 w-14 overflow-hidden rounded border ${
                        imageUrl === u ? "border-purple-500" : "border-white/[0.08]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}

              <label className="mt-2 inline-block">
                <input type="file" accept="image/*" className="hidden" onChange={pickFile} />
                <span className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-text-secondary hover:border-white/[0.18]">
                  {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {isUploading ? `Uploading ${progress}%` : "Upload new image"}
                </span>
              </label>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={5}
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 p-3 text-sm text-text-primary focus:border-purple-500/40 focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-text-tertiary">{caption.length} chars</p>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Hashtags</label>
              <textarea
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 p-3 text-xs text-text-primary focus:border-purple-500/40 focus:outline-none"
                placeholder="#fashion #ethnic …"
              />
            </div>

            <Button type="button" onClick={() => void save()} disabled={saving || isUploading} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save day
            </Button>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
