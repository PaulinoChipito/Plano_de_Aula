import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

export function generateId(): string {
  return Crypto.randomUUID();
}

export interface DesenvolvimentoEtapa {
  etapa: string;
  duracao: string;
  actividadesProfessor: string;
  actividadesAlunos: string;
}

export interface TarefaDeCasa {
  descricao: string;
  referencia?: string;
  tempoEstimado?: string;
}

export interface DiferenciacaoPedagogica {
  dificuldades: string;
  avancados: string;
}

export interface LessonPlan {
  id: string;
  classe: string;
  disciplina: string;
  tema: string;
  duracao: string;
  numAlunos?: number;
  faixaEtaria?: string;
  sumario: string;
  objetivoGeral: string;
  objetivosEspecificos: string[];
  conteudos?: string[];
  metodosPrincipais?: string;
  metodos: string;
  meios: string;
  desenvolvimentoAula?: DesenvolvimentoEtapa[];
  atividades: { descricao: string; tempo: string }[];
  perguntasControlo: string[];
  tarefasPraticas?: string[];
  perguntasTarefa: string[];
  tarefaDeCasa?: TarefaDeCasa[];
  avaliacao?: string;
  diferenciacaoPedagogica?: DiferenciacaoPedagogica;
  observacoes?: string;
  score: number;
  sugestoes: string[];
  createdAt: string;
  periodo?: string;
}

export interface Student {
  id: string;
  nome: string;
  idade: string;
  telefoneEncarregado: string;
  fotoUri: string | null;
}

export interface ClassGroup {
  id: string;
  designacao: string;
  disciplina: string;
  alunos: Student[];
  createdAt: string;
}

export interface GradeEntry {
  id: string;
  nota: number;
  data: string;
}

export interface StudentGrade {
  alunoId: string;
  turmaId: string;
  mac: GradeEntry[];
  npt: number | null;
  observacao: string;
  periodo?: string;
}

export interface AttendanceRecord {
  turmaId: string;
  data: string;
  registos: { alunoId: string; presente: boolean }[];
  periodo?: string;
}

export interface AgendaEvent {
  id: string;
  titulo: string;
  tipo: "aula" | "prova" | "reuniao" | "lembrete";
  data: string;
  hora: string;
  descricao: string;
  periodo?: string;
}

export const NIVEL_ENSINO_OPTIONS = [
  "Ensino Primário",
  "1.º Ciclo do Ensino Secundário",
  "2.º Ciclo do Ensino Secundário",
  "Universidade",
];

export interface TeacherProfile {
  nome: string;
  email: string;
  instituicao: string;
  nivelEnsino: string;
  disciplinas: string;
}

const KEYS = {
  LESSON_PLANS: "lesson_plans",
  CLASSES: "classes",
  GRADES: "grades",
  ATTENDANCE: "attendance",
  EVENTS: "events",
  API_KEY: "gemini_api_key",
  TEACHER_PROFILE: "teacher_profile",
  ONBOARDING_DONE: "onboarding_done",
};

async function getItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

async function setItem(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function getApiKey(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.API_KEY)) || "";
}

export async function setApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.API_KEY, key);
}

export async function getLessonPlans(): Promise<LessonPlan[]> {
  return getItem<LessonPlan[]>(KEYS.LESSON_PLANS, []);
}

export async function saveLessonPlan(plan: LessonPlan): Promise<void> {
  const plans = await getLessonPlans();
  const idx = plans.findIndex((p) => p.id === plan.id);
  if (idx >= 0) plans[idx] = plan;
  else plans.unshift(plan);
  await setItem(KEYS.LESSON_PLANS, plans);
}

export async function deleteLessonPlan(id: string): Promise<void> {
  const plans = await getLessonPlans();
  await setItem(
    KEYS.LESSON_PLANS,
    plans.filter((p) => p.id !== id),
  );
}

export async function getClasses(): Promise<ClassGroup[]> {
  return getItem<ClassGroup[]>(KEYS.CLASSES, []);
}

export async function saveClass(classGroup: ClassGroup): Promise<void> {
  const classes = await getClasses();
  const idx = classes.findIndex((c) => c.id === classGroup.id);
  if (idx >= 0) classes[idx] = classGroup;
  else classes.unshift(classGroup);
  await setItem(KEYS.CLASSES, classes);
}

export async function deleteClass(id: string): Promise<void> {
  const classes = await getClasses();
  await setItem(
    KEYS.CLASSES,
    classes.filter((c) => c.id !== id),
  );
}

export async function getGrades(): Promise<StudentGrade[]> {
  return getItem<StudentGrade[]>(KEYS.GRADES, []);
}

export async function saveGrade(grade: StudentGrade): Promise<void> {
  const grades = await getGrades();
  const gradePeriodo = grade.periodo ?? "I";
  const idx = grades.findIndex(
    (g) =>
      g.alunoId === grade.alunoId &&
      g.turmaId === grade.turmaId &&
      (g.periodo ?? "I") === gradePeriodo,
  );
  if (idx >= 0) grades[idx] = grade;
  else grades.push(grade);
  await setItem(KEYS.GRADES, grades);
}

export async function getAttendance(): Promise<AttendanceRecord[]> {
  return getItem<AttendanceRecord[]>(KEYS.ATTENDANCE, []);
}

export async function saveAttendance(record: AttendanceRecord): Promise<void> {
  const records = await getAttendance();
  const idx = records.findIndex(
    (r) => r.turmaId === record.turmaId && r.data === record.data,
  );
  if (idx >= 0) records[idx] = record;
  else records.push(record);
  await setItem(KEYS.ATTENDANCE, records);
}

export async function getEvents(): Promise<AgendaEvent[]> {
  return getItem<AgendaEvent[]>(KEYS.EVENTS, []);
}

export async function saveEvent(event: AgendaEvent): Promise<void> {
  const events = await getEvents();
  const idx = events.findIndex((e) => e.id === event.id);
  if (idx >= 0) events[idx] = event;
  else events.push(event);
  await setItem(KEYS.EVENTS, events);
}

export async function deleteEvent(id: string): Promise<void> {
  const events = await getEvents();
  await setItem(
    KEYS.EVENTS,
    events.filter((e) => e.id !== id),
  );
}

export async function getTeacherProfile(): Promise<TeacherProfile> {
  return getItem<TeacherProfile>(KEYS.TEACHER_PROFILE, {
    nome: "",
    email: "",
    instituicao: "",
    nivelEnsino: "",
    disciplinas: "",
  });
}

export async function saveTeacherProfile(profile: TeacherProfile): Promise<void> {
  await setItem(KEYS.TEACHER_PROFILE, profile);
}

export async function isOnboardingDone(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.ONBOARDING_DONE);
  return val === "true";
}

export async function markOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, "true");
}
