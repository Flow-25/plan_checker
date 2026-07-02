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
  { name: "blue", bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-900", dot: "bg-blue-500" },
  { name: "emerald", bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-900", dot: "bg-emerald-500" },
  { name: "amber", bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-900", dot: "bg-amber-500" },
  { name: "violet", bg: "bg-violet-100", border: "border-violet-400", text: "text-violet-900", dot: "bg-violet-500" },
  { name: "rose", bg: "bg-rose-100", border: "border-rose-400", text: "text-rose-900", dot: "bg-rose-500" },
  { name: "cyan", bg: "bg-cyan-100", border: "border-cyan-400", text: "text-cyan-900", dot: "bg-cyan-500" },
  { name: "orange", bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-900", dot: "bg-orange-500" },
  { name: "teal", bg: "bg-teal-100", border: "border-teal-400", text: "text-teal-900", dot: "bg-teal-500" },
  { name: "fuchsia", bg: "bg-fuchsia-100", border: "border-fuchsia-400", text: "text-fuchsia-900", dot: "bg-fuchsia-500" },
  { name: "lime", bg: "bg-lime-100", border: "border-lime-400", text: "text-lime-900", dot: "bg-lime-500" },
  { name: "indigo", bg: "bg-indigo-100", border: "border-indigo-400", text: "text-indigo-900", dot: "bg-indigo-500" },
  { name: "pink", bg: "bg-pink-100", border: "border-pink-400", text: "text-pink-900", dot: "bg-pink-500" },
];

export function colorByName(name: string): CourseColor {
  return COURSE_COLORS.find((c) => c.name === name) ?? COURSE_COLORS[0];
}

/** Pick the first palette color not already used by another course. */
export function nextColor(usedNames: string[]): string {
  const free = COURSE_COLORS.find((c) => !usedNames.includes(c.name));
  return (free ?? COURSE_COLORS[usedNames.length % COURSE_COLORS.length]).name;
}
