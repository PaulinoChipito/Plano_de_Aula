import AsyncStorage from "@react-native-async-storage/async-storage";

export const APP_BACKUP_VERSION = 1;

export const APP_BACKUP_KEYS = [
  "lesson_plans",
  "classes",
  "grades",
  "attendance",
  "events",
  "teacher_profile",
  "onboarding_done",
  "export_header_v1",
  "aulas_professor_v1",
  "current_period_v1",
  "current_year_v1",
  "years_list_v1",
  "app_language_v1",
  "auth_settings_v1",
] as const;

export interface AppBackupPayload {
  version: number;
  app: "EcoEducacional";
  createdAt: string;
  data: Record<string, string>;
}

export async function createAppBackupPayload(): Promise<AppBackupPayload> {
  const pairs = await AsyncStorage.multiGet([...APP_BACKUP_KEYS]);
  const data = pairs.reduce<Record<string, string>>((acc, [key, value]) => {
    if (value !== null) acc[key] = value;
    return acc;
  }, {});

  return {
    version: APP_BACKUP_VERSION,
    app: "EcoEducacional",
    createdAt: new Date().toISOString(),
    data,
  };
}

export function parseAppBackupPayload(raw: string): AppBackupPayload {
  const parsed = JSON.parse(raw) as AppBackupPayload;
  if (!parsed || parsed.app !== "EcoEducacional" || typeof parsed.data !== "object") {
    throw new Error("Ficheiro de backup inválido.");
  }
  return parsed;
}

export async function restoreAppBackupPayload(payload: AppBackupPayload): Promise<void> {
  const entries = Object.entries(payload.data).filter(([key, value]) =>
    APP_BACKUP_KEYS.includes(key as (typeof APP_BACKUP_KEYS)[number]) && typeof value === "string",
  );

  await AsyncStorage.multiRemove([...APP_BACKUP_KEYS]);
  if (entries.length > 0) {
    await AsyncStorage.multiSet(entries);
  }
}
