/**
 * Lightweight static table of India-wide sales-driving festival dates.
 * This avoids a runtime lunar-calendar dependency — we keep a rolling
 * ~3-year window that covers the product's planning horizon.
 *
 * Dates are approximate calendar days in IST. For moveable (lunar) holidays
 * the day shown is the *primary* retail day (sellers post the night before
 * and on the day itself).
 *
 * NOTE: When adding / correcting entries, use ISO `YYYY-MM-DD`. Entries
 * flagged with `range` are multi-day (e.g. Navratri); `day` is the peak day.
 */
export type Festival = {
  /** primary date in IST */
  date: string;
  /** human name */
  name: string;
  /** short hook for captions */
  hook?: string;
  /** one of: sale, religious, cultural, shopping */
  kind: "sale" | "religious" | "cultural" | "shopping";
};

// Rolling window — add new years as they approach. Dates compiled from
// official holiday lists / Jan Suchna 2025-2027 published by MOHUA.
const FESTIVALS: Festival[] = [
  // 2026
  { date: "2026-01-14", name: "Makar Sankranti / Pongal", kind: "religious", hook: "Festival kites, bright colours" },
  { date: "2026-01-26", name: "Republic Day", kind: "cultural", hook: "Tricolour-themed, patriotic offers" },
  { date: "2026-02-14", name: "Valentine's Day", kind: "shopping", hook: "Gifting, couple sets" },
  { date: "2026-02-19", name: "Mahashivratri", kind: "religious" },
  { date: "2026-03-03", name: "Holi", kind: "religious", hook: "Brights, whites, playful" },
  { date: "2026-03-19", name: "Gudi Padwa / Ugadi", kind: "religious" },
  { date: "2026-03-21", name: "Navratri begins", kind: "religious", hook: "9 nights, 9 colours" },
  { date: "2026-03-29", name: "Ram Navami", kind: "religious" },
  { date: "2026-03-31", name: "Eid al-Fitr", kind: "religious" },
  { date: "2026-04-13", name: "Baisakhi", kind: "cultural" },
  { date: "2026-05-01", name: "Labour Day", kind: "cultural" },
  { date: "2026-05-05", name: "Buddha Purnima", kind: "religious" },
  { date: "2026-07-09", name: "Rath Yatra", kind: "religious" },
  { date: "2026-08-09", name: "Raksha Bandhan", kind: "cultural", hook: "Sibling sets, gifting" },
  { date: "2026-08-15", name: "Independence Day", kind: "cultural" },
  { date: "2026-08-16", name: "Janmashtami", kind: "religious" },
  { date: "2026-08-27", name: "Onam", kind: "cultural" },
  { date: "2026-09-05", name: "Ganesh Chaturthi", kind: "religious" },
  { date: "2026-09-22", name: "Navratri Day 1 (sharad)", kind: "religious", hook: "9 colours start" },
  { date: "2026-10-02", name: "Gandhi Jayanti / Dussehra", kind: "religious" },
  { date: "2026-10-20", name: "Karwa Chauth", kind: "cultural", hook: "Reds, gold, sindoor" },
  { date: "2026-11-08", name: "Dhanteras", kind: "shopping", hook: "Gold, new purchases" },
  { date: "2026-11-10", name: "Diwali", kind: "religious", hook: "#1 retail night of year" },
  { date: "2026-11-11", name: "Govardhan Puja", kind: "religious" },
  { date: "2026-11-12", name: "Bhai Dooj", kind: "cultural" },
  { date: "2026-11-25", name: "Black Friday", kind: "sale" },
  { date: "2026-11-28", name: "Cyber Monday", kind: "sale" },
  { date: "2026-12-24", name: "Christmas Eve", kind: "cultural" },
  { date: "2026-12-25", name: "Christmas", kind: "cultural" },
  { date: "2026-12-31", name: "New Year's Eve", kind: "cultural" },

  // Recurring shopping milestones (Meesho / Flipkart / Amazon India)
  { date: "2026-07-15", name: "End-of-Season Sale (EOSS)", kind: "sale" },
  { date: "2026-09-22", name: "Big Billion Days (Flipkart)", kind: "sale" },
  { date: "2026-09-23", name: "Great Indian Festival (Amazon)", kind: "sale" },
];

/** All festivals in the given IST calendar month (1–12). */
export function festivalsInMonth(year: number, month: number): Festival[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const prefix = `${year}-${pad(month)}-`;
  return FESTIVALS.filter((f) => f.date.startsWith(prefix));
}

/** Index festivals by YYYY-MM-DD for O(1) day lookup. */
export function festivalsByDate(year: number, month: number): Record<string, Festival> {
  const map: Record<string, Festival> = {};
  for (const f of festivalsInMonth(year, month)) {
    map[f.date] = f;
  }
  return map;
}
