import { Platform } from "react-native";

const FOLDER_ROOT = "EcoEducacional";
export const FOLDER_PLANOS = "Planos de Aula";
export const FOLDER_PAUTAS = "Mini-Pautas";
export const FOLDER_FALTAS = "Mapa de Faltas";

export type EcoFolder = "planos" | "pautas" | "faltas";

function todaySuffix(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function getExportFileName(baseName: string, ext: "pdf" | "xlsx"): string {
  const sanitized = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s_-]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60) || "documento";
  return `${sanitized}_${todaySuffix()}.${ext}`;
}

export async function ensureEcoFolders(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const FS = await import("expo-file-system/legacy");
    const docDir = (FS as any).documentDirectory as string | undefined;
    if (!docDir) return;
    const subFolders: string[] = [
      FOLDER_ROOT,
      `${FOLDER_ROOT}/${FOLDER_PLANOS}`,
      `${FOLDER_ROOT}/${FOLDER_PAUTAS}`,
      `${FOLDER_ROOT}/${FOLDER_FALTAS}`,
    ];
    for (const rel of subFolders) {
      const path = `${docDir}${rel}/`;
      const info = await (FS as any).getInfoAsync(path);
      if (!info.exists) {
        await (FS as any).makeDirectoryAsync(path, { intermediates: true });
      }
    }
  } catch {
    // best-effort – silently fail if permissions missing
  }
}

export async function getEcoFolderPath(folder: EcoFolder): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const FS = await import("expo-file-system/legacy");
    const docDir = (FS as any).documentDirectory as string | undefined;
    if (!docDir) return null;
    const map: Record<EcoFolder, string> = {
      planos: FOLDER_PLANOS,
      pautas: FOLDER_PAUTAS,
      faltas: FOLDER_FALTAS,
    };
    return `${docDir}${FOLDER_ROOT}/${map[folder]}/`;
  } catch {
    return null;
  }
}
