import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FOLDER_ROOT = "EcoEducacional";
export const FOLDER_PLANOS = "Planos de Aula";
export const FOLDER_PAUTAS = "Mini-Pautas";
export const FOLDER_FALTAS = "Mapa de Faltas";

export type EcoFolder = "planos" | "pautas" | "faltas";

const VISIBLE_ROOT_URI_KEY = "ecoeducacional_visible_root_uri_v1";

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

function getFolderName(folder: EcoFolder): string {
  const map: Record<EcoFolder, string> = {
    planos: FOLDER_PLANOS,
    pautas: FOLDER_PAUTAS,
    faltas: FOLDER_FALTAS,
  };
  return map[folder];
}

function safUriLooksLikeName(uri: string, name: string): boolean {
  const decoded = decodeURIComponent(uri).replace(/\/+$/g, "");
  return decoded.endsWith(`/${name}`) || decoded.endsWith(`:${name}`);
}

async function getOrCreateSafDirectory(
  SAF: any,
  parentUri: string,
  name: string,
): Promise<string> {
  try {
    const children = await SAF.readDirectoryAsync(parentUri);
    const existing = children.find((child: string) => safUriLooksLikeName(child, name));
    if (existing) return existing;
  } catch {
    // Some providers only allow create operations after permission is granted.
  }

  try {
    return await SAF.makeDirectoryAsync(parentUri, name);
  } catch (error) {
    const children = await SAF.readDirectoryAsync(parentUri);
    const existing = children.find((child: string) => safUriLooksLikeName(child, name));
    if (existing) return existing;
    throw error;
  }
}

async function getSavedVisibleRootUri(): Promise<string | null> {
  if (Platform.OS !== "android") return null;
  return AsyncStorage.getItem(VISIBLE_ROOT_URI_KEY);
}

async function requestVisibleRootUri(): Promise<string | null> {
  if (Platform.OS !== "android") return null;
  const FS = await import("expo-file-system/legacy");
  const permissions = await (FS as any).StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted || !permissions.directoryUri) return null;
  await AsyncStorage.setItem(VISIBLE_ROOT_URI_KEY, permissions.directoryUri);
  return permissions.directoryUri;
}

export async function resetVisibleEcoFolderPermission(): Promise<void> {
  await AsyncStorage.removeItem(VISIBLE_ROOT_URI_KEY);
}

export async function getVisibleEcoFolderUri(
  folder: EcoFolder,
  requestIfMissing = true,
): Promise<string | null> {
  if (Platform.OS !== "android") return null;

  const FS = await import("expo-file-system/legacy");
  const SAF = (FS as any).StorageAccessFramework;
  let rootUri = await getSavedVisibleRootUri();
  if (!rootUri && requestIfMissing) {
    rootUri = await requestVisibleRootUri();
  }
  if (!rootUri) return null;

  try {
    const ecoRootUri = await getOrCreateSafDirectory(SAF, rootUri, FOLDER_ROOT);
    return await getOrCreateSafDirectory(SAF, ecoRootUri, getFolderName(folder));
  } catch {
    await resetVisibleEcoFolderPermission();
    if (!requestIfMissing) return null;

    const refreshedRootUri = await requestVisibleRootUri();
    if (!refreshedRootUri) return null;

    const ecoRootUri = await getOrCreateSafDirectory(SAF, refreshedRootUri, FOLDER_ROOT);
    return getOrCreateSafDirectory(SAF, ecoRootUri, getFolderName(folder));
  }
}

export async function createVisibleEcoFile(
  folder: EcoFolder,
  filename: string,
  mimeType: string,
  base64Contents: string,
): Promise<string | null> {
  if (Platform.OS !== "android") return null;

  const FS = await import("expo-file-system/legacy");
  const SAF = (FS as any).StorageAccessFramework;
  const folderUri = await getVisibleEcoFolderUri(folder);
  if (!folderUri) return null;

  const writeFile = async (name: string): Promise<string> => {
    const fileUri = await SAF.createFileAsync(folderUri, name, mimeType);
    await SAF.writeAsStringAsync(fileUri, base64Contents, {
      encoding: (FS as any).EncodingType?.Base64 ?? "base64",
    });
    return fileUri;
  };

  try {
    return await writeFile(filename);
  } catch {
    const dotIndex = filename.lastIndexOf(".");
    const stem = dotIndex >= 0 ? filename.slice(0, dotIndex) : filename;
    const ext = dotIndex >= 0 ? filename.slice(dotIndex) : "";
    const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    return writeFile(`${stem}_${stamp}${ext}`);
  }
}
