---
name: Lesson plan PDF template
description: Both AI and manual plans use same generatePdfHtml; all sections always present
---

generatePdfHtml in view-plan.tsx always renders the same fixed set of sections regardless of plan type (AI vs manual):
- Metodo(s) Principal(is) always in meta table (shows "—" for manual)
- Objectivos Específicos, Conteúdos, Perguntas de Controlo, TPC, Avaliação Formativa, Observações always shown (show "—" if empty)
- Desenvolvimento da Aula always shown as 3-column table (manual: "Momento N" rows, AI: proper etapa names)
- Diferenciação Pedagógica only shown when data exists (AI-only field)

**Why:** User requested AI and manual plan PDFs look "igual" (the same format).
