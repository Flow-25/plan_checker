# 📅 Schedule Planner

A static, client-side university timetable planner. Enter your courses and their
lecture / exercise / lab groups, and it generates every **collision-free**
combination, ranked by the criteria you care about (fewer gaps, more free days,
later starts, fewer class days).

No accounts, no server, no database — all data lives in your browser
(`localStorage`), with JSON export/import for backup and moving between devices.

## Tech stack

- **React 19 + TypeScript**, built with **Vite**
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **Vitest** for the scheduling logic tests
- Pure static build output — deploy the `dist/` folder to any static host
  (GitHub Pages, Netlify, Vercel, Cloudflare Pages, …).

## Commands

```bash
npm install       # install dependencies
npm run dev       # local dev server (http://localhost:5173)
npm run build     # type-check + production build into dist/
npm run preview   # preview the production build
npm test          # run the scheduling logic tests
```

## How it works

- **Data model** (`src/types.ts`): a `Course` requires one or more component
  types (lecture/exercise/lab); each component has one or more `Group`s to
  choose from; each group has one or more weekly `Session`s (day, time, optional
  odd/even-week parity, optional room).
- **Collision detection** (`src/scheduling/collision.ts`): two sessions collide
  only if they share a day, their times overlap, **and** their week parities are
  compatible (opposite odd/even sessions never collide).
- **Combination generation** (`src/scheduling/generateCombinations.ts`):
  incremental backtracking over the Cartesian product of "one group per required
  component per course", pruning any partial assignment that introduces a
  collision. Capped at 2000 results / 3s to stay responsive.
- **Ranking** (`src/scheduling/ranking.ts`): computes four metrics per plan,
  normalizes them across the result set, and weighted-sums them using your
  priority order (higher priority = more weight).
- **No-solution fallback** (`src/scheduling/plan.ts`): if no plan fits every
  course, and you've marked some courses "droppable", it retries dropping the
  smallest set of droppable courses that yields a solution.

## Importing from USOS

The **Setup tab → "Import from USOS"** section reads a USOSweb plan into the app.

Because USOSweb requires your session and sends no CORS headers, a static app
**cannot reliably fetch a share link directly** — so import is paste-based:

1. Open your plan share link in USOS and switch it to **"semestralny"**
   (whole-semester) view — the current-week view is empty during holidays.
2. Select-all + copy the page (or "View source"), and paste it into the import
   box. Click **Read plan** → **Add to my courses**.

You can also paste the **share link** itself: the app rewrites it to the
semester-view URL, offers an "Open plan in USOS ↗" button, and makes a
best-effort attempt to fetch it through a public CORS proxy (this often fails
for USOS, in which case fall back to pasting the page HTML).

The parser (`src/usos/parseUsosPlan.ts`) reads the `<usos-timetable>` grid:
course name/code, class type (WYK→lecture, ĆW→exercise, LAB→lab, …), group
number, day, time, room, and **odd/even week parity**. A shared plan that lists
several groups per component imports them all as alternatives to choose among.

## Usage

1. **Setup tab** — add courses, tick the components each needs, add group
   options, and give each group its weekly session times. Toggle *Include* to
   temporarily leave a course out of planning, or *Droppable* to allow it to be
   dropped as a fallback.
2. **Plan & results tab** — pick and order your ranking criteria, browse the
   ranked collision-free plans, and click one to see it on the weekly calendar.
3. Use **Export / Import JSON** (Setup tab) to back up or transfer your data.

Data autosaves to `localStorage` on every change.
