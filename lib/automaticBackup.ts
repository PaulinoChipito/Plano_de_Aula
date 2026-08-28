import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import { getGoogleDriveBackupStatus, uploadBackupToDrive } from "./googleDriveBackup";

const SETTINGS_KEY = "google_drive_automatic_backup_v1";
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export type AutomaticBackupFrequency = "off" | "daily" | "weekly" | "monthly";

export interface AutomaticBackupSettings {
  frequency: AutomaticBackupFrequency;
  lastBackupAt?: string;
}

const DEFAULT_SETTINGS: AutomaticBackupSettings = { frequency: "off" };
let running = false;

export async function getAutomaticBackupSettings(): Promise<AutomaticBackupSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AutomaticBackupSettings>;
    const frequency = parsed.frequency;
    if (!frequency || !["off", "daily", "weekly", "monthly"].includes(frequency)) {
      return DEFAULT_SETTINGS;
    }
    return { frequency, lastBackupAt: parsed.lastBackupAt };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setAutomaticBackupFrequency(frequency: AutomaticBackupFrequency): Promise<void> {
  const current = await getAutomaticBackupSettings();
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ frequency, ...(frequency === "off" ? {} : { lastBackupAt: current.lastBackupAt }) }),
  );
}

function intervalFor(frequency: Exclude<AutomaticBackupFrequency, "off">) {
  if (frequency === "daily") return 24 * 60 * 60 * 1000;
  if (frequency === "weekly") return 7 * 24 * 60 * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
}

export function isAutomaticBackupDue(settings: AutomaticBackupSettings, now = Date.now()) {
  if (settings.frequency === "off") return false;
  if (!settings.lastBackupAt) return true;
  const lastBackupAt = Date.parse(settings.lastBackupAt);
  return !Number.isFinite(lastBackupAt) || now - lastBackupAt >= intervalFor(settings.frequency);
}

export async function runAutomaticBackupIfDue(): Promise<boolean> {
  if (running) return false;
  const settings = await getAutomaticBackupSettings();
  if (!isAutomaticBackupDue(settings)) return false;

  const status = await getGoogleDriveBackupStatus();
  if (!status.configured || !status.connected) return false;

  running = true;
  try {
    await uploadBackupToDrive();
    const current = await getAutomaticBackupSettings();
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...current, lastBackupAt: new Date().toISOString() }),
    );
    return true;
  } finally {
    running = false;
  }
}

export function startAutomaticBackupMonitor(onError?: (error: unknown) => void) {
  const check = () => {
    runAutomaticBackupIfDue().catch((error) => onError?.(error));
  };
  check();
  const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
    if (state === "active") check();
  });
  const interval = setInterval(check, CHECK_INTERVAL_MS);
  return () => {
    subscription.remove();
    clearInterval(interval);
  };
}
