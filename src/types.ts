export type ComponentType = "lecture" | "exercise" | "lab";

export const COMPONENT_TYPES: ComponentType[] = ["lecture", "exercise", "lab"];

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  lecture: "Lecture",
  exercise: "Exercise",
  lab: "Lab",
};

export type WeekParity = "every" | "odd" | "even";

export interface Session {
  id: string;
  /** 1 = Monday ... 7 = Sunday */
  dayOfWeek: number;
  /** "HH:MM" 24h */
  startTime: string;
  /** "HH:MM" 24h */
  endTime: string;
  weekParity: WeekParity;
  location?: string;
}

export interface Group {
  id: string;
  courseId: string;
  type: ComponentType;
  label: string;
  sessions: Session[];
}

export interface Course {
  id: string;
  name: string;
  color: string;
  componentTypes: ComponentType[];
  /** Whether this course is included in the current plan search. */
  included: boolean;
  /**
   * Components (lecture/exercise/lab) that may be dropped individually when no
   * full solution exists (§6.4). A dropped component is left out of the plan
   * entirely — its groups are not scheduled or displayed.
   */
  droppableComponents: ComponentType[];
}

export interface AppData {
  version: number;
  courses: Course[];
  groups: Group[];
}

export type CriterionKey =
  | "minGaps"
  | "maxFreeDays"
  | "lateStartEarlyFinish"
  | "minDays";

export const CRITERION_LABELS: Record<CriterionKey, string> = {
  minGaps: "Minimize gaps between classes",
  maxFreeDays: "Maximize free days",
  lateStartEarlyFinish: "Prefer late starts / early finishes",
  minDays: "Minimize number of class days",
};

export interface CriterionSetting {
  key: CriterionKey;
  enabled: boolean;
}

/** Ordered priority list; first = most important. */
export type CriteriaOrder = CriterionSetting[];

export const DEFAULT_CRITERIA: CriteriaOrder = [
  { key: "minGaps", enabled: true },
  { key: "maxFreeDays", enabled: true },
  { key: "lateStartEarlyFinish", enabled: true },
  { key: "minDays", enabled: true },
];

/** A (course, component) slot that was left out of a plan. */
export interface DroppedSlot {
  courseId: string;
  type: ComponentType;
}

/** One chosen group per required slot, forming a candidate schedule. */
export interface Combination {
  /** Group ids, one per (course, componentType) slot that was kept. */
  groupIds: string[];
  /** Component slots intentionally dropped for this combination (§6.4). */
  droppedSlots: DroppedSlot[];
}

export interface CombinationMetrics {
  /** Total idle minutes between first and last class, summed over the week. */
  gapMinutes: number;
  /** Count of weekdays (Mon–Fri, or full week if weekend classes) with no class. */
  freeDays: number;
  /** Sum of daily first-class start times, in minutes from midnight. */
  startSum: number;
  /** Sum of daily last-class end times, in minutes from midnight. */
  endSum: number;
  /** Number of distinct days that have at least one class. */
  daysUsed: number;
}

export interface RankedCombination {
  combination: Combination;
  metrics: CombinationMetrics;
  score: number;
}
