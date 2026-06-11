---
name: Ano Lectivo multi-year system
description: How the school year (anoLectivo) context works — architecture, defaults, and where each piece lives.
---

## Rule
Every data entity has an optional `anoLectivo?: string` field. Screens filter by `(record.anoLectivo ?? defaultYear) === currentYear` where `defaultYear = years[0] ?? ""`. This ensures existing data without the field is visible under the first-ever year.

**Why:** Teachers need to keep historical data permanently accessible while working within the current year. Same pattern as `periodo`/`periodContext`.

**How to apply:**
- `lib/yearContext.tsx` — `YearProvider` wraps the whole app (inside `_layout.tsx`, outer of `PeriodProvider`). Exposes `currentYear`, `years`, `setYear(y)`, `addYear(label)`, `isLatestYear`.
- AsyncStorage keys: `current_year_v1` (active year string), `years_list_v1` (JSON array of strings, oldest-first).
- Default year auto-created on first load: `${y-1}/${y}` if month < 9, else `${y}/${y+1}`.
- `addYear(label)` appends to list and auto-switches to the new year.
- Data models with `anoLectivo?`: LessonPlan, ClassGroup, StudentGrade, AttendanceRecord, AgendaEvent.
- All screens use `const defaultYear = years[0] ?? "";` for backward compat with old data.
- Settings > "Ano Lectivo" section: lists all years (newest first), active badge, "Ver dados" for past years, "Novo Ano Lectivo" button opens modal with auto-suggested next year label.
- When `!isLatestYear`, a yellow banner "A visualizar dados de X" is shown inside the Settings section.
