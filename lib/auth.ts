import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

const KEY_AUTH = "auth_settings_v1";

export interface AuthSettings {
  pinEnabled: boolean;
  pinHash: string | null;
  salt: string | null;
  biometricEnabled: boolean;
}

const DEFAULT_AUTH: AuthSettings = {
  pinEnabled: false,
  pinHash: null,
  salt: null,
  biometricEnabled: false,
};

export async function getAuthSettings(): Promise<AuthSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY_AUTH);
    if (!raw) return DEFAULT_AUTH;
    return { ...DEFAULT_AUTH, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AUTH;
  }
}

export async function saveAuthSettings(settings: AuthSettings): Promise<void> {
  await AsyncStorage.setItem(KEY_AUTH, JSON.stringify(settings));
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
}

export async function setupPin(pin: string, biometricEnabled: boolean): Promise<void> {
  if (!/^\d{4,6}$/.test(pin)) throw new Error("PIN inválido");
  const bytes = await Crypto.getRandomBytesAsync(16);
  let salt = "";
  for (let i = 0; i < bytes.length; i++) {
    salt += bytes[i].toString(16).padStart(2, "0");
  }
  const pinHash = await hashPin(pin, salt);
  await saveAuthSettings({
    pinEnabled: true,
    pinHash,
    salt,
    biometricEnabled,
  });
}

export async function verifyPin(pin: string): Promise<boolean> {
  const settings = await getAuthSettings();
  if (!settings.pinEnabled || !settings.pinHash || !settings.salt) return false;
  const hash = await hashPin(pin, settings.salt);
  return hash === settings.pinHash;
}

export async function disableAuth(): Promise<void> {
  await saveAuthSettings(DEFAULT_AUTH);
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  const settings = await getAuthSettings();
  await saveAuthSettings({ ...settings, biometricEnabled: enabled });
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const LocalAuth = await import("expo-local-authentication");
    const hasHw = await LocalAuth.hasHardwareAsync();
    const enrolled = await LocalAuth.isEnrolledAsync();
    return hasHw && enrolled;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometric(reason: string): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const LocalAuth = await import("expo-local-authentication");
    const result = await LocalAuth.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Usar PIN",
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
