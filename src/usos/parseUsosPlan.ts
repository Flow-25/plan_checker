import type { ComponentType, Course, Group, Session } from "../types";
import { uid } from "../utils/id";
import { nextColor } from "../utils/colors";

export interface UsosParseResult {
  courses: Course[];
  groups: Group[];
  summary: {
    courseCount: number;
    groupCount: number;
    sessionCount: number;
    warnings: string[];
  };
}

/** Strip diacritics and lowercase for robust text matching. */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining marks (incl. Polish ogonek)
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L") // ł does not decompose under NFD
    .toLowerCase();
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DAY_STEMS: [string, number][] = [
  ["poniedzial", 1],
  ["wtor", 2],
  ["srod", 3],
  ["czwart", 4],
  ["piat", 5],
  ["sobot", 6],
  ["niedziel", 7],
];

function dayFromText(text: string): number | null {
  const t = fold(text);
  for (const [stem, n] of DAY_STEMS) if (t.includes(stem)) return n;
  return null;
}

/** Map a USOS class-type code to our three-bucket ComponentType. */
function mapType(rawCode: string): ComponentType {
  const c = fold(rawCode);
  if (c.startsWith("wyk") || c === "w") return "lecture";
  if (c.startsWith("lab") || c.startsWith("prac") || c.startsWith("pra"))
    return "lab";
  // Ćwiczenia, konwersatoria, seminaria, lektoraty, WF → grouped as "exercise".
  if (
    c.startsWith("cw") ||
    c.startsWith("kon") ||
    c.startsWith("sem") ||
    c.startsWith("psem") ||
    c.startsWith("pros") ||
    c.startsWith("lek") ||
    c.startsWith("wf") ||
    c.startsWith("rep")
  )
    return "exercise";
  return "lecture";
}

function pad(time: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return time.trim();
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

interface RawEntry {
  courseKey: string;
  courseName: string;
  rawType: string;
  groupNo: string;
  day: number | null;
  start: string;
  end: string;
  parity: Session["weekParity"];
  location?: string;
}

/**
 * Parse a USOSweb plan page (the "new-ui" `<usos-timetable>` format, shown when
 * the plan is opened with `plan_division=semester`) into our data model.
 *
 * Each `<timetable-entry>` carries the course name/code as attributes and the
 * type/group/room in a `slot="info"` div and the day/time/parity in a
 * `slot="dialog-event"` span, e.g. "co drugi czwartek (nieparzyste), 10:15 - 12:00".
 */
export function parseUsosPlan(
  html: string,
  usedColorNames: string[] = [],
): UsosParseResult {
  const warnings: string[] = [];
  const raws: RawEntry[] = [];

  const entryRe = /<timetable-entry\b([\s\S]*?)<\/timetable-entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(html))) {
    const block = m[1];
    const nameMatch = /\bname="([^"]*)"/.exec(block);
    const codeMatch = /name-id="([^"]*)"/.exec(block);
    const infoMatch = /slot="info">([\s\S]*?)<\/div>/.exec(block);
    const eventMatch = /slot="dialog-event">([\s\S]*?)<\/span>/.exec(block);

    const courseName = nameMatch ? stripTags(nameMatch[1]) : "";
    const code = codeMatch ? stripTags(codeMatch[1]) : "";
    const info = infoMatch ? stripTags(infoMatch[1]) : "";
    const event = eventMatch ? stripTags(eventMatch[1]) : "";
    if (!courseName && !code) continue;

    const typeMatch = /^([A-Za-zĆĘŁŃÓŚŻŹąćęłńóśżź]+)/.exec(info);
    const rawType = typeMatch ? typeMatch[1] : "";
    const groupMatch = /gr\.?\s*(\d+)/i.exec(info);
    const groupNo = groupMatch ? groupMatch[1] : "1";
    const roomMatch = /\(([^)]*)\)/.exec(info);
    const location = roomMatch ? roomMatch[1].trim() : undefined;

    const timeMatch = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(event);
    const start = timeMatch ? pad(timeMatch[1]) : "";
    const end = timeMatch ? pad(timeMatch[2]) : "";

    let parity: Session["weekParity"] = "every";
    const ev = fold(event);
    if (ev.includes("nieparzyst")) parity = "odd";
    else if (ev.includes("parzyst")) parity = "even";

    const day = dayFromText(event);

    raws.push({
      courseKey: code || courseName,
      courseName: courseName || code,
      rawType,
      groupNo,
      day,
      start,
      end,
      parity,
      location,
    });
  }

  // Group raw entries into courses → groups → sessions.
  // Key a course by its code; a group by (mappedType, rawType, groupNo) so that
  // distinct USOS types are never merged into one selectable group.
  const used = [...usedColorNames];
  const courseMap = new Map<string, Course>();
  const groupMap = new Map<string, Group>();

  for (const r of raws) {
    let course = courseMap.get(r.courseKey);
    if (!course) {
      const color = nextColor(used);
      used.push(color);
      course = {
        id: uid(),
        name: r.courseName,
        color,
        componentTypes: [],
        included: true,
        droppableComponents: [],
      };
      courseMap.set(r.courseKey, course);
    }

    const mapped = mapType(r.rawType);
    if (!course.componentTypes.includes(mapped)) course.componentTypes.push(mapped);

    const groupKey = `${r.courseKey}|${mapped}|${r.rawType}|${r.groupNo}`;
    let group = groupMap.get(groupKey);
    if (!group) {
      const label = r.rawType
        ? `${r.rawType.toUpperCase()} gr. ${r.groupNo}`
        : `Grupa ${r.groupNo}`;
      group = {
        id: uid(),
        courseId: course.id,
        type: mapped,
        label,
        sessions: [],
      };
      groupMap.set(groupKey, group);
    }

    if (r.day == null || !r.start || !r.end) {
      warnings.push(
        `Could not read day/time for ${r.courseName} (${r.rawType} gr. ${r.groupNo}); imported without a session.`,
      );
      continue;
    }
    group.sessions.push({
      id: uid(),
      dayOfWeek: r.day,
      startTime: r.start,
      endTime: r.end,
      weekParity: r.parity,
      location: r.location,
    });
  }

  const courses = [...courseMap.values()];
  const groups = [...groupMap.values()];
  const sessionCount = groups.reduce((n, g) => n + g.sessions.length, 0);

  // Default: lectures are optional (droppable), matching manual course creation.
  for (const course of courses) {
    if (course.componentTypes.includes("lecture"))
      course.droppableComponents = ["lecture"];
  }

  // Flag courses where two different USOS types collapsed into one bucket.
  for (const course of courses) {
    const byBucket = new Map<ComponentType, Set<string>>();
    for (const g of groups.filter((x) => x.courseId === course.id)) {
      const rawCode = g.label.split(" ")[0];
      const set = byBucket.get(g.type) ?? new Set<string>();
      set.add(rawCode);
      byBucket.set(g.type, set);
    }
    for (const [, codes] of byBucket) {
      if (codes.size > 1) {
        warnings.push(
          `${course.name}: types ${[...codes].join(", ")} were merged into one component — review whether they should be separate.`,
        );
      }
    }
  }

  return {
    courses,
    groups,
    summary: {
      courseCount: courses.length,
      groupCount: groups.length,
      sessionCount,
      warnings,
    },
  };
}
