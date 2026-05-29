# Plano de Aula (Lesson Planner Pro)

## Overview

**Plano de Aula** is a mobile-first teacher productivity app built with Expo (React Native) that helps educators manage lesson plans, classes, student records, assessments, attendance, and scheduling. The app follows an **offline-first** architecture using AsyncStorage for local data persistence, with an Express backend server available for API services and optional cloud sync.

Key features:
- **Lesson Plan Creation** — Manual or AI-assisted generation with pedagogical scoring (0–100)
- **Class/Student Management** — Create classes, add students with photos, phone contacts
- **Assessments & Grades** — Track MAC (continuous assessment averages) and NPT (exam scores)
- **Attendance Tracking** — Mark daily attendance per class with historical stats
- **Agenda/Calendar** — Schedule events (classes, exams, meetings, reminders)
- **Statistics Dashboard** — Cross-reference grades, attendance, and generate insights
- **Settings** — Model status for AI features, teacher profile configuration

The app is designed for Portuguese-speaking educators (UI text is in Portuguese).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with expo-router for file-based routing
- **Navigation**: Stack-based navigation via `expo-router` with typed routes. All screens are defined as top-level files in the `app/` directory (no tab navigation — uses a grid-based home screen)
- **State Management**: Local component state with `useState`. React Query (`@tanstack/react-query`) is configured for server-state but currently the app is primarily offline-first
- **Data Persistence**: `@react-native-async-storage/async-storage` is the primary data store. All CRUD operations go through `lib/storage.ts` which defines typed interfaces and async read/write functions
- **Fonts**: Inter font family (400, 500, 600, 700 weights) via `@expo-google-fonts/inter`
- **Styling**: Raw `StyleSheet.create()` — no UI library. Color constants defined in `constants/colors.ts` with light/dark theme values
- **Platform Support**: Primarily mobile (iOS/Android) with web compatibility. Platform-specific adjustments for safe areas and keyboard handling
- **Key Libraries**: expo-image-picker (student photos), expo-haptics (tactile feedback), expo-linear-gradient (UI gradients), react-native-gesture-handler, react-native-reanimated

### Screen Architecture

| Screen | Purpose |
|--------|---------|
| `index.tsx` | Home dashboard with grid navigation |
| `lesson-plans.tsx` | List all lesson plans |
| `create-plan.tsx` | Create plan (manual or AI mode) |
| `view-plan.tsx` | View plan details |
| `classes.tsx` | Manage classes/turmas |
| `class-detail.tsx` | View/edit class students |
| `assessments.tsx` | Select class for grading |
| `student-grades.tsx` | Grade individual students |
| `attendance.tsx` | Select class for attendance |
| `attendance-mark.tsx` | Mark daily attendance |
| `statistics.tsx` | Analytics dashboard |
| `agenda.tsx` | Event calendar |
| `settings.tsx` | AI model status, teacher profile & security (PIN/biometria) |

### Backend

The app is **100% offline** — there is no backend server. All data lives in AsyncStorage on the client. The Express/Drizzle/PostgreSQL scaffolding was removed. No `DATABASE_URL` or API keys are required.

### Data Models (Client-Side in `lib/storage.ts`)

- **LessonPlan** — Full lesson plan following the Angolan pedagogical guide structure:
  - *Identificação*: classe, disciplina, tema, duracao, numAlunos, sumario
  - *Objectivo Geral* + *Objectivos Específicos* (ABCD model)
  - *Conteúdos*: list of content topics
  - *Método(s) Principal(is)* + full metodos/meios description
  - *Desenvolvimento da Aula*: table with etapa, duracao, actividadesProfessor, actividadesAlunos
  - *Perguntas de Controlo*, *Tarefas Práticas*
  - *Avaliação*, *Observações*
  - score (0-100), sugestoes, AI generation metadata
  - Backward-compatible: atividades and perguntasTarefa fields retained for older data
- **ClassGroup** — Class with designation, subject, and embedded students array
- **Student** — Name, age, guardian phone, photo URI
- **StudentGrade / GradeEntry** — Grade tracking per student per class
- **AttendanceRecord** — Daily attendance per class
- **AgendaEvent** — Scheduled events with type (aula/prova/reuniao/lembrete)
- **TeacherProfile** — Name, institution, subject
- **AuthSettings** (`lib/auth.ts`) — Optional 6-digit PIN (SHA-256 + salt via expo-crypto) and biometric flag (expo-local-authentication). Stored in `auth_settings_v1` AsyncStorage key. Enforced at app start by `components/AuthGate.tsx` (re-locks after 60s in background)

### Export / Download

- **`lib/exports.ts`** — Cross-platform helpers: `exportPdfFromHtml` (uses `expo-print` on native, `window.print()` on web) and `exportExcel` (xlsx → base64 → expo-sharing on native, blob download on web)
- **`lib/exportTemplates.ts`** — Builds HTML and worksheet rows for: students list per class, mini-pauta per class (faithful to the official anexo with 3 trimestres + MAC/NPT/MT/MFD/MF + class statistics), and attendance map per class
- **`components/ExportMenu.tsx`** — Bottom sheet with PDF / Excel options; wired in `classes.tsx`, `assessments.tsx`, and `attendance.tsx`

### Path Aliases

- `@/*` → project root
- `@shared/*` → `./shared/*`

## External Dependencies

### AI Integration
- The app uses **offline-first AI** for lesson plan generation via `lib/localAI.ts`:
  - **Web**: Runs the `Qwen2.5-0.5B-Instruct` model (ONNX quantized, ~300 MB) directly in the browser using `@huggingface/transformers` (WebAssembly). Downloaded once, cached in browser storage, fully offline afterwards. No API key required.
  - **Native (iOS/Android)**: Smart template-based pedagogical generation — instant, fully offline, no model download needed.
- Generated plans follow the structure defined in `docs/guia_plano_de_aula.md` (Angolan pedagogical guide with 18 model plans).
- No external API keys required. No data is sent to external servers.

### Database
- **PostgreSQL** via Drizzle ORM — required for server-side features. Needs `DATABASE_URL` environment variable.

### Key NPM Packages
- **expo** (~54.0.27) — Core framework
- **expo-router** (~6.0.17) — File-based routing
- **express** (^5.0.1) — Backend server
- **drizzle-orm** (^0.39.3) + **pg** (^8.16.3) — Database ORM
- **@tanstack/react-query** (^5.83.0) — Server state management
- **@react-native-async-storage/async-storage** (2.2.0) — Local persistence
- **@huggingface/transformers** — Offline AI inference via Qwen2.5-0.5B-Instruct (ONNX) on web
- **expo-image-picker** — Student photo selection
- **expo-haptics** — Tactile feedback on actions
- **expo-crypto** — UUID generation
- **patch-package** — Applied via postinstall script (check `patches/` directory for any active patches)

### Development & Build
- **tsx** — TypeScript execution for dev server
- **esbuild** — Server production bundling
- **drizzle-kit** — Database migration tooling
- **Metro** — Expo's JavaScript bundler

### Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required for server DB features)
- `EXPO_PUBLIC_DOMAIN` — Public domain for API calls
- `REPLIT_DEV_DOMAIN` — Replit development domain
- `REPLIT_DOMAINS` — Comma-separated allowed domains for CORS