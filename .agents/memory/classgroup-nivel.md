---
name: ClassGroup nivelEnsino
description: nivelEnsino field added to ClassGroup for per-class grade scale and negative threshold
---

ClassGroup now has `nivelEnsino?: string` (same options as TeacherProfile).

**Why:** Primary school (Ensino Primário) uses a 0–10 scale; secondary/university use 0–20. The grade-entry validation and mini-pauta negative thresholds depend on the class level, not just the teacher profile.

**How to apply:**
- student-grades.tsx: isPrimario = classGroup.nivelEnsino === "Ensino Primário", maxNota = isPrimario ? 10 : 20
- exportTemplates.ts: threshold = isPrimario ? 5 : 10 — used for red coloring of MT/MF cells and stats labels
- Classes created before this change have no nivelEnsino field → fallback to profile.nivelEnsino, then default threshold 10
