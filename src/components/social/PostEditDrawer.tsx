"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export type EditablePost = {
  id: string;
  caption: string;
  hashtags: string[];
  platforms: string[];
  scheduledFor: string | null;
  imageUrl: string;
  status: string;
  errorMsg: string | null;
};

type Props = {
  post: EditablePost | null;
  onClose: () => void;
  onSaved: (post: EditablePost) => void;
  onDeleted: (id: string) => void;
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostEditDrawer({ post, onClose, onSaved, onDeleted }: Props) {
  const toast = useToast();
  const [caption, setCaption] = React.useState("");
  const [when, setWhen] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (post) {
      setCaption(post.caption);
      setWhen(toDatetimeLocal(post.scheduledFor));
      setConfirmDelete(false);
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

  async function save() {
    if (!post) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (caption.trim() !== post.caption) body.caption = caption.trim();
      if (when) {
        const d = new Date(when);
        if (!Number.isNaN(d.getTime())) body.scheduledFor = d.toISOString();
      }
      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }
      const res = await fetch(`/api/social/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { post?: EditablePost; error?: string };
      if (!res.ok || !json.post) throw new Error(json.error ?? "Update failed");
      toast.success("Saved");
      onSaved(json.post);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function postSoon() {
    if (!post) return;
    setSaving(true);
    try {
      const scheduledFor = new Date(Date.now() - 60_000).toISOString();
      const res = await fetch(`/api/social/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor, status: "scheduled" }),
      });
      const json = (await res.json()) as { post?: EditablePost; error?: string };
      if (!res.ok || !json.post) throw new Error(json.error ?? "Could not reschedule");
      toast.success("Queued for next cron run");
      onSaved(json.post);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reschedule");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!post) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/social/posts/${post.id}`, { method: "DELETE" });
      const json = (await res.json()) as { deleted?: boolean; error?: string };
      if (!res.ok || !json.deleted) throw new Error(json.error ?? "Delete failed");
      toast.success("Deleted");
      onDeleted(post.id);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

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
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-white/[0.08] bg-[rgb(14,14,18)] p-5 shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Edit post</p>
                <p className="text-xs text-text-tertiary">Status: {post.status}</p>
              </div>
              <button onClick={onClose} className="rounded-full p-1 text-text-tertiary hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>

            {post.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.imageUrl}
                alt=""
                className="aspect-square w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-white/[0.04] text-xs text-text-tertiary">
                No image
              </div>
            )}

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
              <label className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Scheduled for</label>
              <Input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void save()} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
              <Button type="button" variant="secondary" onClick={() => void postSoon()} disabled={saving} className="gap-2">
                <Send className="h-4 w-4" />
                Post soon
              </Button>
              {confirmDelete ? (
                <Button type="button" onClick={() => void remove()} disabled={saving} className="gap-2 bg-red-600/80 hover:bg-red-600 text-white">
                  <Trash2 className="h-4 w-4" />
                  Confirm delete
                </Button>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} disabled={saving} className="gap-2 text-red-300 hover:text-red-200">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>

            {post.errorMsg ? (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-[11px] text-red-300">{post.errorMsg}</p>
            ) : null}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
