"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useImageUpload } from "@/hooks/useImageUpload";
import { PlatformSelector, type SocialPlatform } from "@/components/social/PlatformSelector";
import { CaptionGenerator } from "@/components/social/CaptionGenerator";
import { cn } from "@/lib/utils";

type Props = {
  hasInstagram: boolean;
  hasFacebook: boolean;
  onScheduled: () => void;
};

export function PostComposer({ hasInstagram, hasFacebook, onScheduled }: Props) {
  const toast = useToast();
  const upload = useImageUpload();
  const [imageUrl, setImageUrl] = React.useState("");
  const [manualUrl, setManualUrl] = React.useState("");
  const [caption, setCaption] = React.useState("");
  const [hashtags, setHashtags] = React.useState<string[]>([]);
  const [platforms, setPlatforms] = React.useState<SocialPlatform[]>(["instagram"]);
  const [scheduleMode, setScheduleMode] = React.useState<"auto" | "pick" | "now" | "draft">("auto");
  const [pickIso, setPickIso] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const effectiveImageUrl = imageUrl || manualUrl.trim();

  async function handleUploadFiles() {
    const urls = await upload.uploadAll();
    if (urls[0]) setImageUrl(urls[0]);
  }

  async function submit() {
    if (scheduleMode !== "draft" && !hasInstagram) {
      toast.error("Connect Instagram first");
      return;
    }
    if (!effectiveImageUrl) {
      toast.warning("Image required", "Upload an image or paste a public image URL.");
      return;
    }
    if (!caption.trim()) {
      toast.warning("Caption required");
      return;
    }
    if (platforms.includes("facebook") && !hasFacebook) {
      toast.error("Facebook not connected");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        imageUrl: effectiveImageUrl,
        caption: caption.trim(),
        hashtags,
        platforms,
        useAutoTime: scheduleMode === "auto",
        saveAsDraft: scheduleMode === "draft",
      };
      if (scheduleMode === "draft") {
        body.useAutoTime = false;
      }
      if (scheduleMode === "pick") {
        if (!pickIso) {
          toast.warning("Pick a date and time");
          setSubmitting(false);
          return;
        }
        const d = new Date(pickIso);
        if (Number.isNaN(d.getTime())) {
          toast.error("Invalid date");
          setSubmitting(false);
          return;
        }
        body.scheduledFor = d.toISOString();
        body.useAutoTime = false;
      }
      if (scheduleMode === "now") {
        body.useAutoTime = false;
      }

      const res = await fetch("/api/social/schedule-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string; post?: { id: string } };
      if (!res.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Schedule failed");
      }
      if (scheduleMode === "draft") {
        toast.success("Draft saved", "You can schedule it later from the queue.");
      } else {
        toast.success("Scheduled", "Your post is queued for publishing.");
      }
      setCaption("");
      setHashtags([]);
      setImageUrl("");
      setManualUrl("");
      upload.clearFiles();
      onScheduled();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Schedule failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <CaptionGenerator
        onSelect={(c, tags) => {
          setCaption(c);
          setHashtags(tags);
        }}
      />

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Post</p>
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs text-text-tertiary">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/20 p-3 text-sm text-text-primary focus:border-purple-500/30 focus:outline-none"
              placeholder="Write or pick from AI captions above…"
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary">Image URL (or upload)</label>
            <Input
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              className="mt-1"
              placeholder="https://… or /api/images/file?key=…"
            />
          </div>
          <div className="rounded-lg border border-dashed border-white/[0.12] p-4 text-center">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              id="social-upload"
              onChange={(e) => {
                const list = e.target.files;
                if (list?.length) upload.addFiles(Array.from(list));
                e.target.value = "";
              }}
            />
            <label htmlFor="social-upload" className="cursor-pointer text-sm text-purple-400 hover:text-purple-300">
              Choose file
            </label>
            <p className="mt-1 text-[11px] text-text-tertiary">JPG, PNG, WEBP · max 25MB</p>
            {upload.files.map((f) => (
              <div key={f.id} className="mt-2 text-xs text-text-secondary">
                {f.name} — {f.status} {f.publicUrl ? "✓" : ""}
              </div>
            ))}
            <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={() => void handleUploadFiles()} disabled={upload.isUploading}>
              {upload.isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload to storage"}
            </Button>
          </div>

          <PlatformSelector
            value={platforms}
            onChange={setPlatforms}
            hasInstagram={hasInstagram}
            hasFacebook={hasFacebook}
          />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">When</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  { id: "auto" as const, label: "Best time (auto)" },
                  { id: "pick" as const, label: "Pick date & time" },
                  { id: "now" as const, label: "Post soon" },
                  { id: "draft" as const, label: "Save draft" },
                ]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScheduleMode(opt.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium",
                    scheduleMode === opt.id
                      ? "border-purple-500/40 bg-purple-500/10 text-purple-200"
                      : "border-white/[0.08] text-text-secondary"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {scheduleMode === "pick" ? (
              <Input
                type="datetime-local"
                value={pickIso}
                onChange={(e) => setPickIso(e.target.value)}
                className="mt-2 max-w-xs"
              />
            ) : null}
          </div>

          <Button type="button" onClick={() => void submit()} disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Save to queue
          </Button>
        </div>
      </div>
    </div>
  );
}
