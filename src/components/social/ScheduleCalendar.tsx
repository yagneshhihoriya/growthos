"use client";

import * as React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg, DatesSetArg } from "@fullcalendar/core";
import { useToast } from "@/components/ui/toast";
import { PostEditDrawer, type EditablePost } from "./PostEditDrawer";

type ScheduledPost = EditablePost & {
  platforms: string[];
  status: string;
};

function platformColor(platforms: string[], status: string): string {
  if (status === "failed") return "#ef4444"; // red
  const ig = platforms.includes("instagram");
  const fb = platforms.includes("facebook");
  if (ig && fb) return "#a855f7"; // both — purple
  if (ig) return "#f97316"; // instagram — orange
  if (fb) return "#3b82f6"; // facebook — blue
  return "#6b7280";
}

function useIsNarrow(breakpoint = 640) {
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return narrow;
}

export function ScheduleCalendar() {
  const toast = useToast();
  const [posts, setPosts] = React.useState<ScheduledPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<ScheduledPost | null>(null);
  const isNarrow = useIsNarrow();

  const fetchMonth = React.useCallback(
    async (month: number, year: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/social/posts?status=scheduled&month=${month}&year=${year}&take=200`
        );
        const json = (await res.json()) as { posts?: ScheduledPost[] };
        setPosts(json.posts ?? []);

        // Also pull failed posts for the same window so sellers can retry from the calendar.
        const failedRes = await fetch(
          `/api/social/posts?status=failed&month=${month}&year=${year}&take=200`
        );
        const failedJson = (await failedRes.json()) as { posts?: ScheduledPost[] };
        setPosts((prev) => [...prev, ...(failedJson.posts ?? [])]);
      } catch {
        toast.error("Could not load calendar");
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const events = React.useMemo(
    () =>
      posts
        .filter((p) => p.scheduledFor)
        .map((p) => ({
          id: p.id,
          title:
            p.caption.length > 50 ? `${p.caption.slice(0, 50)}…` : p.caption || "(no caption)",
          start: p.scheduledFor as string,
          backgroundColor: platformColor(p.platforms, p.status),
          borderColor: "transparent",
          extendedProps: { post: p },
        })),
    [posts]
  );

  async function handleEventDrop(info: EventDropArg) {
    const id = info.event.id;
    const newStart = info.event.start;
    if (!newStart) {
      info.revert();
      return;
    }

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, scheduledFor: newStart.toISOString() } : p))
    );

    try {
      const res = await fetch(`/api/social/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor: newStart.toISOString() }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Reschedule failed");
      }
      toast.success("Rescheduled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reschedule failed");
      info.revert();
    }
  }

  function handleEventClick(info: EventClickArg) {
    const post = info.event.extendedProps.post as ScheduledPost | undefined;
    if (post) setSelected(post);
  }

  function handleDatesSet(info: DatesSetArg) {
    // Use the middle of the visible window to decide which month to load.
    const mid = new Date((info.start.getTime() + info.end.getTime()) / 2);
    void fetchMonth(mid.getMonth() + 1, mid.getFullYear());
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-text-tertiary">
        <Legend color="#f97316" label="Instagram" />
        <Legend color="#3b82f6" label="Facebook" />
        <Legend color="#a855f7" label="Both" />
        <Legend color="#ef4444" label="Failed" />
        {loading ? <span className="ml-auto">Loading…</span> : null}
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
        initialView={isNarrow ? "listWeek" : "dayGridMonth"}
        key={isNarrow ? "narrow" : "wide"}
        events={events}
        editable={!isNarrow}
        eventDrop={handleEventDrop}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        headerToolbar={
          isNarrow
            ? { left: "prev,next", center: "title", right: "listWeek,dayGridMonth" }
            : { left: "prev,next today", center: "title", right: "dayGridMonth,dayGridWeek" }
        }
        height="auto"
        eventDisplay="block"
        dayMaxEvents={3}
        moreLinkClick="popover"
        firstDay={1}
        noEventsText="No posts scheduled in this range"
      />

      <PostEditDrawer
        post={selected}
        onClose={() => setSelected(null)}
        onSaved={(updated) =>
          setPosts((prev) =>
            prev.map((p) =>
              p.id === updated.id ? { ...p, ...updated, scheduledFor: updated.scheduledFor ?? p.scheduledFor } : p
            )
          )
        }
        onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
      />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
