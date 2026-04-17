/**
 * Best posting times as **IST wall clock** (Asia/Kolkata), converted to absolute UTC
 * via explicit `+05:30` offsets (avoids buggy `setUTCHours` on the wrong calendar day).
 */
const BEST_TIMES: Record<number, { hour: number; minute: number }> = {
  0: { hour: 12, minute: 0 },
  1: { hour: 19, minute: 30 },
  2: { hour: 19, minute: 30 },
  3: { hour: 19, minute: 30 },
  4: { hour: 19, minute: 30 },
  5: { hour: 19, minute: 30 },
  6: { hour: 11, minute: 0 },
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Calendar Y-M-D in Asia/Kolkata for this instant. */
function istYmdParts(date: Date): { y: number; mo: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const mo = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return { y, mo, d };
}

/** Weekday 0–6 (Sun–Sat) for the IST calendar date containing `date`. */
function weekdayISTCalendar(date: Date): number {
  const { y, mo, d } = istYmdParts(date);
  // Noon IST on that calendar day — UTC weekday matches IST weekday for India (no same-day boundary issue).
  return new Date(`${y}-${pad2(mo)}-${pad2(d)}T12:00:00+05:30`).getUTCDay();
}

/**
 * Next occurrence of the configured “best” IST clock time on the **IST calendar day**
 * that contains `date` (or that day’s slot if still in the future vs `date`).
 */
export function getBestTimeForDate(date: Date): Date {
  const wd = weekdayISTCalendar(date);
  const best = BEST_TIMES[wd];
  const { y, mo, d } = istYmdParts(date);
  const iso = `${y}-${pad2(mo)}-${pad2(d)}T${pad2(best.hour)}:${pad2(best.minute)}:00+05:30`;
  return new Date(iso);
}

export function getNextBestTime(from: Date = new Date()): Date {
  const todayBest = getBestTimeForDate(from);
  if (todayBest > from) return todayBest;
  const nextDay = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return getBestTimeForDate(nextDay);
}

/** Start of that calendar day in Asia/Kolkata, as a UTC Date (for analytics dedupe keys). */
export function startOfISTDayContaining(date: Date): Date {
  const { y, mo, d } = istYmdParts(date);
  return new Date(`${y}-${pad2(mo)}-${pad2(d)}T00:00:00+05:30`);
}
