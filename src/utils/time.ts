/** Convert "HH:MM" to minutes since midnight. Returns NaN if malformed. */
export function toMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return NaN;
  return h * 60 + min;
}

/** Convert minutes since midnight to "HH:MM". */
export function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const DAY_NAMES = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const DAY_SHORT = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function isValidTimeRange(start: string, end: string): boolean {
  const s = toMinutes(start);
  const e = toMinutes(end);
  return !Number.isNaN(s) && !Number.isNaN(e) && e > s;
}

/** Format a minute count as "Xh Ym" / "Xh" / "Ym". */
export function formatDuration(mins: number): string {
  if (mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
