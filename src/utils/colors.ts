// A palette of distinct, readable colors auto-assigned to courses.
// Each entry carries background / border / text tokens for calendar blocks.
export interface CourseColor {
  name: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
}

export const COURSE_COLORS: CourseColor[] = [
  { name: "blue", bg: "bg-sky-100 dark:bg-sky-950", border: "border-sky-400 dark:border-sky-700", text: "text-sky-950 dark:text-sky-100", dot: "bg-sky-500" },
  { name: "emerald", bg: "bg-teal-100 dark:bg-teal-950", border: "border-teal-400 dark:border-teal-700", text: "text-teal-950 dark:text-teal-100", dot: "bg-teal-500" },
  { name: "amber", bg: "bg-amber-100 dark:bg-amber-950", border: "border-amber-400 dark:border-amber-700", text: "text-amber-950 dark:text-amber-100", dot: "bg-amber-500" },
  { name: "violet", bg: "bg-violet-100 dark:bg-violet-950", border: "border-violet-400 dark:border-violet-700", text: "text-violet-950 dark:text-violet-100", dot: "bg-violet-500" },
  { name: "rose", bg: "bg-rose-100 dark:bg-rose-950", border: "border-rose-400 dark:border-rose-700", text: "text-rose-950 dark:text-rose-100", dot: "bg-rose-500" },
  { name: "cyan", bg: "bg-cyan-100 dark:bg-cyan-950", border: "border-cyan-400 dark:border-cyan-700", text: "text-cyan-950 dark:text-cyan-100", dot: "bg-cyan-500" },
  { name: "orange", bg: "bg-orange-100 dark:bg-orange-950", border: "border-orange-400 dark:border-orange-700", text: "text-orange-950 dark:text-orange-100", dot: "bg-orange-500" },
  { name: "teal", bg: "bg-emerald-100 dark:bg-emerald-950", border: "border-emerald-400 dark:border-emerald-700", text: "text-emerald-950 dark:text-emerald-100", dot: "bg-emerald-500" },
  { name: "fuchsia", bg: "bg-fuchsia-100 dark:bg-fuchsia-950", border: "border-fuchsia-400 dark:border-fuchsia-700", text: "text-fuchsia-950 dark:text-fuchsia-100", dot: "bg-fuchsia-500" },
  { name: "lime", bg: "bg-lime-100 dark:bg-lime-950", border: "border-lime-400 dark:border-lime-700", text: "text-lime-950 dark:text-lime-100", dot: "bg-lime-500" },
  { name: "indigo", bg: "bg-indigo-100 dark:bg-indigo-950", border: "border-indigo-400 dark:border-indigo-700", text: "text-indigo-950 dark:text-indigo-100", dot: "bg-indigo-500" },
  { name: "pink", bg: "bg-pink-100 dark:bg-pink-950", border: "border-pink-400 dark:border-pink-700", text: "text-pink-950 dark:text-pink-100", dot: "bg-pink-500" },
];

export function colorByName(name: string): CourseColor {
  return COURSE_COLORS.find((c) => c.name === name) ?? COURSE_COLORS[0];
}

/** Pick the first palette color not already used by another course. */
export function nextColor(usedNames: string[]): string {
  const free = COURSE_COLORS.find((c) => !usedNames.includes(c.name));
  return (free ?? COURSE_COLORS[usedNames.length % COURSE_COLORS.length]).name;
}
