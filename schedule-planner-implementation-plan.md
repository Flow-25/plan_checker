# University Schedule Planner — Implementation Plan

## 1. Overview

Build a **static, client-side-only web application** (no backend, hostable on any static host — GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.) that lets a student:

1. Manually enter, per course, the available **lecture / exercise (tutorial) / lab groups**, each with its own weekly time slot(s).
2. Automatically generate **all valid combinations** (one group per required component per course) that have **zero time collisions**.
3. When zero-collision combinations exist, **rank them** by user-selected quality criteria (gaps between classes, free days, etc.) and show the best ones first.
4. When *no* collision-free combination exists for the full course set, clearly report that and offer a way to see the closest options (see §6.4).

No user accounts, no server, no database. All data lives in the browser (localStorage) with manual export/import as JSON for backup/portability.

---

## 2. Tech Stack Recommendation

- **Frontend framework:** React (Vite) — simple, static-buildable, good ecosystem for forms and state.
- **Styling:** Tailwind CSS (utility classes, easy to keep clean without custom design system overhead).
- **State/persistence:** React state + `localStorage` (no IndexedDB needed at this data scale — a semester's worth of courses/groups is small).
- **No backend, no external API calls.** Build output is pure static HTML/JS/CSS.
- **Hosting:** any static host. Output should be a `dist/` folder from `vite build` deployable as-is.

Agent should scaffold with `npm create vite@latest` (React template), add Tailwind, and structure the app per §7.

---

## 3. Data Model

### 3.1 Core entities

```
Course
  - id: string (uuid)
  - name: string                 // e.g. "Algorithms and Data Structures"
  - color: string                // auto-assigned, for calendar display
  - componentTypes: ComponentType[]  // which of lecture/exercise/lab this course requires

ComponentType = "lecture" | "exercise" | "lab"
  // A course may require 1, 2, or all 3. E.g. some courses only have a lecture,
  // others have lecture + exercise, others lecture + exercise + lab.

Group
  - id: string (uuid)
  - courseId: string             // FK to Course
  - type: ComponentType
  - label: string                 // e.g. "Group 3", "prof. Kowalski", free text
  - sessions: Session[]           // a group can meet more than once a week

Session
  - dayOfWeek: 1-7 (Mon-Sun)
  - startTime: "HH:MM"
  - endTime: "HH:MM"
  - weekParity: "every" | "odd" | "even"   // see §3.2
  - location: string (optional, free text)
```

### 3.2 Week parity (odd/even weeks)

Polish universities commonly schedule some groups only on odd (nieparzyste) or even (parzyste) weeks. Support this **per session**, optionally:

- Default value: `"every"` (meets every week).
- User can switch a session to `"odd"` or `"even"`.
- **Collision logic:** two sessions collide only if their day+time overlap **AND** their week parities are compatible — i.e. collide if either is `"every"`, or both are the same parity (`"odd"`+`"odd"` or `"even"`+`"even"`). Sessions with opposite parity (`"odd"` vs `"even"`) never collide with each other, even at the same day/time.

This should be implemented as an optional toggle per session (default hidden/collapsed as "every week" to keep the form simple for courses that don't need it).

### 3.3 Persistence

- Entire app state (`courses`, `groups`) is serialized to a single JSON object and stored under one `localStorage` key (e.g. `schedule-planner-data`).
- **Export**: button that downloads the current state as a `.json` file.
- **Import**: file picker that reads a `.json` file and replaces (with confirmation) or merges the current state.
- Autosave to localStorage on every change (debounced), so nothing is lost on refresh/close.

---

## 4. Input Flow (Manual Form Entry)

1. **Add Course**: name + which component types it needs (checkboxes: lecture/exercise/lab). At least one required.
2. **Add Group** under a course/component: label + one or more sessions (day, start, end, optional week parity, optional location). Support adding multiple sessions per group (some groups meet twice a week) and multiple groups per component (e.g. 5 different lab groups to choose from).
3. Provide a simple **course list view** showing, per course, how many groups exist per component type, with inline edit/delete.
4. Validate: end time after start time; warn (not block) if a group for a required component type has zero sessions defined.
5. Provide a way to **temporarily exclude** a course from planning without deleting it (useful for "what-if" comparisons), e.g. a checkbox "include in this plan."

---

## 5. Combination Generation Algorithm

### 5.1 Setup

For each included course, build the list of "choice slots": one slot per required component type, each slot's options being the groups of that type for that course.

Example: Course A needs lecture + exercise → 2 slots: `[LectureGroups_A]`, `[ExerciseGroups_A]`.
Course B needs lecture only → 1 slot: `[LectureGroups_B]`.

The full plan search space is the **Cartesian product** across all slots from all courses (pick exactly one group per slot).

### 5.2 Combinatorial explosion — must prune, not brute-force blindly

Naive full Cartesian product can be huge (e.g. 5 courses × 3 components × 5 groups each = 5^15). Use **incremental backtracking with early pruning**:

- Process slots one at a time (order doesn't matter for correctness, but ordering slots with fewer options first, or courses with tighter constraints first, speeds pruning).
- Maintain the partial combination's already-placed sessions.
- Before adding a candidate group to the partial combination, check its sessions against all already-placed sessions for collisions (respecting week parity rules from §3.2).
- If it collides, skip that candidate (don't recurse into it) — this is what makes the search tractable instead of generating everything then filtering.
- If it doesn't collide, recurse into the next slot.
- Collect complete, collision-free combinations at the leaves.

This is a standard constraint-satisfaction / backtracking search and should comfortably handle realistic course loads (5-8 courses) in-browser without noticeable lag. Implement with plain recursion, not a heavy CSP library — no dependency needed.

### 5.3 Cap on results

Even with pruning, there can be very many valid combinations (e.g. thousands if groups rarely collide). Add a safety cap (e.g. stop after generating 2000 valid combinations, or after a time budget e.g. 3 seconds) and tell the user the results are capped / truncated if hit.

---

## 6. Ranking

### 6.1 User must be able to choose/weight ranking criteria

Selected criteria (from clarifying Q&A):
1. **Minimize gaps ("okienka")** — total idle time between the first and last class on each day, summed across the week.
2. **Maximize free days** — count of weekdays (or full week if weekend classes exist) with zero classes.
3. **Prefer late starts / early finishes** — minimize how early the first class starts and/or how late the last class ends, aggregated across the week (e.g. sum or average of daily start times, sum of daily end times).
4. **Minimize number of distinct days with classes** — i.e. compress the schedule into fewer days.

### 6.2 UI for criteria

- Let the user **toggle which criteria matter** and optionally **order/weight them** (a simple drag-to-reorder priority list is enough — most-important first, used as a tie-breaker chain, or convert rank position to a weight for a weighted-sum score). A `rank_priorities`-style ordering UI is a good fit here.
- Default: all four enabled with the order shown above if the user hasn't customized it, since these were the ones the user cared about.

### 6.3 Scoring

For each valid combination compute the four raw metrics (§6.1), normalize each to a 0–1 scale across the current result set, then combine into a single score using the user's priority order as weights (e.g. earlier-priority criterion gets a higher weight; simplest correct approach: weight = 1/(rank position), or an explicit weight slider if time allows — keep it simple first, refine later). Sort combinations by score descending. Show the top N (e.g. 20) with a way to page/load more, plus each combination's raw metric values displayed so the user can sanity-check the ranking, not just trust a black-box score.

### 6.4 No collision-free plan exists

If the backtracking search terminates with zero complete valid combinations:
- Report this clearly to the user.
- Optionally (nice-to-have, not required for v1): identify which course pairs are the source of unavoidable collisions, e.g. by finding the smallest subset of courses that still yields zero valid combinations, so the user knows which course(s) to reconsider. This can be a stretch goal — flag it as such in the plan, don't block v1 on it.
- As a fallback, allow the user to mark one or more courses as "optional/droppable" and show best combinations that satisfy all *non-optional* courses only, with dropped courses listed.

---

## 7. Suggested App Structure

```
src/
  main.tsx
  App.tsx
  types.ts                # Course, Group, Session, ComponentType, etc.
  storage/
    persistence.ts        # load/save to localStorage, export/import JSON
  scheduling/
    collision.ts           # session overlap + week-parity logic
    generateCombinations.ts # backtracking search (§5)
    ranking.ts              # metrics + scoring (§6)
  components/
    CourseForm.tsx
    GroupForm.tsx
    CourseList.tsx
    CriteriaSelector.tsx
    ResultsList.tsx
    ScheduleCalendarView.tsx   # weekly grid visualization of a chosen combination
    ExportImportButtons.tsx
  App state: React context or lifted state in App.tsx (no need for Redux at this scale)
```

---

## 8. UI/Views Checklist

1. **Course & Group setup view** (main data entry, per §4).
2. **Criteria selection view** — toggle + reorder ranking priorities.
3. **Results view** — list of ranked valid combinations, each summarized (score, key metrics, maybe a mini preview), clicking one opens:
4. **Calendar view** — a Mon–Sun weekly grid rendering the selected combination's sessions as blocks, color-coded by course, showing group label/time/location. Should visually distinguish odd/even-week sessions (e.g. a small badge) if used.
5. **No-solution view** — clear message + fallback options (§6.4).
6. **Export/Import** — accessible from setup view (backup/restore/move-device).

---

## 9. Out of Scope for v1 (explicitly deferred)

- User accounts / server-side storage / multi-device sync.
- Automatic parsing/import from USOS or other university systems (user chose manual entry).
- Advanced "minimum culprit set" collision diagnosis (mentioned as optional stretch goal only).
- Mobile-native app (responsive web is enough).

---

## 10. Suggested Build Order (for the implementing agent)

1. Scaffold Vite + React + Tailwind project.
2. Define types (`types.ts`) and localStorage persistence layer.
3. Build course/group data entry forms and list view — get manual data entry fully working and persisted first.
4. Implement collision detection (`collision.ts`) with unit-test-style manual checks (including week parity cases).
5. Implement backtracking combination generator (`generateCombinations.ts`) against sample data.
6. Implement ranking metrics + scoring (`ranking.ts`).
7. Build results list + calendar view for a selected combination.
8. Build criteria selector UI and wire it into ranking.
9. Handle the no-solution case and the optional-course fallback.
10. Add export/import JSON.
11. Polish: validation messages, empty states, responsive layout, color coding per course.
12. Production build (`vite build`) and deploy to a static host.
