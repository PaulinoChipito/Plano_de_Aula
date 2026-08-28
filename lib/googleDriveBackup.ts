import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { createAppBackupPayload, parseAppBackupPayload, restoreAppBackupPayload } from "./appBackup";

WebBrowser.maybeCompleteAuthSession();

const TOKEN_STORAGE_KEY = "google_drive_backup_tokens_v1";
const BACKUP_FILE_NAME = "ecoeducacional-backup.json";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const PROFILE_SCOPE = "openid email profile";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const DEFAULT_GOOGLE_CLIENT_ID =
  "638940181616-v64e3fhu0tv6f5i4r17jhsp061re2sf4.apps.googleusercontent.com";
const GOOGLE_REDIRECT_PATH = "google-drive-auth";
const DEFAULT_GOOGLE_REDIRECT_URI = "com.planodeaula.app:/google-drive-auth";
const ANDROID_NATIVE_AUTH_REQUIRED =
  "Google Sign-In nativo ainda nao esta disponivel neste build. Instale @react-native-google-signin/google-signin e recompile o APK.";
const ANDROID_DEVELOPER_ERROR_MESSAGE =
  "Erro de configuracao do Google Sign-In. Confirme no Google Cloud/Firebase que existe um OAuth Client Android com package name com.planodeaula.app e o SHA-1 da chave usada para assinar este APK. Se usar EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, ele deve ser um OAuth Client do tipo Web.";

export interface GoogleDriveBackupStatus {
  configured: boolean;
  connected: boolean;
  email?: string;
}

export interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
}

interface GoogleDriveTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  email?: string;
}

type GoogleSigninUser = {
  scopes?: string[];
  user?: {
    email?: string | null;
  };
};

type GoogleSigninResponse = {
  type: "success" | "cancelled" | "noSavedCredentialFound" | string;
  data?: GoogleSigninUser;
};

type GoogleSigninApi = {
  configure: (options?: { scopes?: string[]; offlineAccess?: boolean; webClientId?: string }) => void;
  hasPlayServices: (options?: { showPlayServicesUpdateDialog?: boolean }) => Promise<boolean>;
  hasPreviousSignIn: () => boolean;
  signIn: (options?: Record<string, unknown>) => Promise<GoogleSigninResponse>;
  signInSilently: () => Promise<GoogleSigninResponse>;
  addScopes: (options: { scopes: string[] }) => Promise<GoogleSigninResponse | null>;
  getTokens: () => Promise<{ accessToken: string; idToken?: string }>;
  signOut: () => Promise<null>;
};

function getClientId() {
  return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? DEFAULT_GOOGLE_CLIENT_ID;
}

function getNativeWebClientId() {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
}

function isGoogleDeveloperError(error: unknown) {
  const anyError = error as { code?: string; message?: string };
  const text = `${anyError.code ?? ""} ${anyError.message ?? ""}`;
  return /DEVELOPER_ERROR|code:\s*10|Developer console is not set up correctly/i.test(text);
}

export function getGoogleDriveRedirectUri() {
  const configuredRedirectUri = process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI?.trim();
  if (configuredRedirectUri) return configuredRedirectUri;

  if (Platform.OS === "web") {
    return Linking.createURL(GOOGLE_REDIRECT_PATH);
  }

  return DEFAULT_GOOGLE_REDIRECT_URI;
}

export function isGoogleDriveBackupConfigured() {
  return getClientId().trim().length > 0;
}

async function loadGoogleSignin(): Promise<GoogleSigninApi> {
  try {
    const googleSigninModule = await import("@react-native-google-signin/google-signin");
    return googleSigninModule.GoogleSignin as GoogleSigninApi;
  } catch {
    throw new Error(ANDROID_NATIVE_AUTH_REQUIRED);
  }
}

async function getNativeGoogleDriveTokens(interactive: boolean): Promise<GoogleDriveTokens> {
  const GoogleSignin = await loadGoogleSignin();
  const webClientId = getNativeWebClientId();
  GoogleSignin.configure({
    scopes: [DRIVE_SCOPE],
    offlineAccess: false,
    ...(webClientId ? { webClientId } : {}),
  });

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    let response: GoogleSigninResponse | null = null;
    if (GoogleSignin.hasPreviousSignIn()) {
      response = await GoogleSignin.signInSilently();
    }

    if (response?.type !== "success") {
      if (!interactive) throw new Error("Sessao Google expirada. Inicie sessao novamente.");
      response = await GoogleSignin.signIn({});
    }

    if (response.type !== "success" || !response.data) {
      throw new Error("Inicio de sessao cancelado.");
    }

    if (!response.data.scopes?.includes(DRIVE_SCOPE)) {
      const scopedResponse = await GoogleSignin.addScopes({ scopes: [DRIVE_SCOPE] });
      if (scopedResponse?.type !== "success" || !scopedResponse.data) {
        throw new Error("Permissao Google Drive nao concedida.");
      }
      response = scopedResponse;
    }

    const userData = response.data;
    if (!userData) throw new Error("Inicio de sessao cancelado.");

    const tokens = await GoogleSignin.getTokens();
    return {
      accessToken: tokens.accessToken,
      expiresAt: Date.now() + 55 * 60 * 1000,
      email: userData.user?.email ?? undefined,
    };
  } catch (error) {
    if (isGoogleDeveloperError(error)) {
      throw new Error(ANDROID_DEVELOPER_ERROR_MESSAGE);
    }
    throw error;
  }
}

async function getStoredTokens(): Promise<GoogleDriveTokens | null> {
  const raw = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoogleDriveTokens;
  } catch {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
}

async function storeTokens(tokens: GoogleDriveTokens) {
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

function formEncode(params: Record<string, string>) {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function base64ToBase64Url(value: string) {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bytesToBase64Url(bytes: Uint8Array) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1] ?? 0;
    const b3 = bytes[i + 2] ?? 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    output += alphabet[(triplet >> 18) & 63];
    output += alphabet[(triplet >> 12) & 63];
    output += i + 1 < bytes.length ? alphabet[(triplet >> 6) & 63] : "=";
    output += i + 2 < bytes.length ? alphabet[triplet & 63] : "=";
  }
  return base64ToBase64Url(output);
}

async function createPkcePair() {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const verifier = bytesToBase64Url(randomBytes);
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  return { verifier, challenge: base64ToBase64Url(digest) };
}

function parseQuery(url: string) {
  const [, query = ""] = url.split("?");
  const [, fragment = ""] = url.split("#");
  const params = new URLSearchParams(query || fragment);
  return {
    code: params.get("code") ?? "",
    error: params.get("error") ?? "",
    state: params.get("state") ?? "",
  };
}

async function exchangeCodeForTokens(code: string, verifier: string): Promise<GoogleDriveTokens> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formEncode({
      client_id: getClientId(),
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: getGoogleDriveRedirectUri(),
    }),
  });

  if (!response.ok) throw new Error(await response.text());

  const json = await response.json();
  const tokens: GoogleDriveTokens = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + Number(json.expires_in ?? 3600) * 1000,
  };
  return tokens;
}

async function refreshAccessToken(tokens: GoogleDriveTokens): Promise<GoogleDriveTokens> {
  if (Platform.OS === "android") {
    const refreshed = await getNativeGoogleDriveTokens(false);
    await storeTokens(refreshed);
    return refreshed;
  }

  if (!tokens.refreshToken) throw new Error("Sessão Google expirada. Inicie sessão novamente.");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formEncode({
      client_id: getClientId(),
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }),
  });

  if (!response.ok) {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    throw new Error("Sessão Google expirada. Inicie sessão novamente.");
  }

  const json = await response.json();
  const refreshed: GoogleDriveTokens = {
    ...tokens,
    accessToken: json.access_token,
    expiresAt: Date.now() + Number(json.expires_in ?? 3600) * 1000,
  };
  await storeTokens(refreshed);
  return refreshed;
}

async function fetchUserEmail(accessToken: string) {
  try {
    const response = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return undefined;
    const profile = await response.json();
    return typeof profile.email === "string" ? profile.email : undefined;
  } catch {
    return undefined;
  }
}

async function getValidTokens() {
  const tokens = await getStoredTokens();
  if (!tokens) return signInToGoogleDrive();
  if (tokens.expiresAt > Date.now() + 60_000) return tokens;
  return refreshAccessToken(tokens);
}

export async function getGoogleDriveBackupStatus(): Promise<GoogleDriveBackupStatus> {
  const tokens = await getStoredTokens();
  return {
    configured: isGoogleDriveBackupConfigured(),
    connected: !!tokens,
    email: tokens?.email,
  };
}

export async function signInToGoogleDrive(forceAccountSelection = false): Promise<GoogleDriveTokens> {
  if (!isGoogleDriveBackupConfigured()) {
    throw new Error("Backup Google Drive não configurado.");
  }

  if (Platform.OS === "android") {
    const tokens = await getNativeGoogleDriveTokens(true);
    await storeTokens(tokens);
    return tokens;
  }

  const state = bytesToBase64Url(await Crypto.getRandomBytesAsync(16));
  const { verifier, challenge } = await createPkcePair();
  const redirectUri = getGoogleDriveRedirectUri();
  const url = `${AUTH_URL}?${formEncode({
    access_type: "offline",
    client_id: getClientId(),
    code_challenge: challenge,
    code_challenge_method: "S256",
    include_granted_scopes: "true",
    prompt: forceAccountSelection ? "select_account" : "consent",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: `${PROFILE_SCOPE} ${DRIVE_SCOPE}`,
    state,
  })}`;

  const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);
  if (result.type !== "success") throw new Error("Início de sessão cancelado.");

  const parsed = parseQuery(result.url);
  if (parsed.error) throw new Error(parsed.error);
  if (!parsed.code || parsed.state !== state) throw new Error("Resposta Google inválida.");

  const tokens = await exchangeCodeForTokens(parsed.code, verifier);
  tokens.email = await fetchUserEmail(tokens.accessToken);
  await storeTokens(tokens);
  return tokens;
}

export async function signOutFromGoogleDrive() {
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  if (Platform.OS === "android") {
    try {
      const GoogleSignin = await loadGoogleSignin();
      await GoogleSignin.signOut();
    } catch {}
  }
}

export async function switchGoogleDriveAccount(): Promise<GoogleDriveTokens> {
  await signOutFromGoogleDrive();
  return signInToGoogleDrive(true);
}

async function findBackupFiles(accessToken: string): Promise<DriveBackupFile[]> {
  const params = new URLSearchParams({
    fields: "files(id,name,modifiedTime,size)",
    orderBy: "modifiedTime desc",
    q: `name='${BACKUP_FILE_NAME}' and trashed=false`,
    spaces: "appDataFolder",
  });
  const response = await fetch(`${DRIVE_FILES_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error(await response.text());
  const json = await response.json();
  return json.files ?? [];
}

async function deleteBackupFile(accessToken: string, fileId: string) {
  const response = await fetch(`${DRIVE_FILES_URL}/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(await response.text());
}

export async function getLatestDriveBackupInfo(): Promise<DriveBackupFile | null> {
  if (!isGoogleDriveBackupConfigured()) return null;
  const tokens = await getValidTokens();
  const files = await findBackupFiles(tokens.accessToken);
  return files[0] ?? null;
}

export async function uploadBackupToDrive(): Promise<DriveBackupFile | null> {
  const tokens = await getValidTokens();
  const payload = await createAppBackupPayload();
  const content = JSON.stringify(payload);

  const existingFiles = await findBackupFiles(tokens.accessToken);
  const response = await fetch(
    `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,modifiedTime,size`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "multipart/related; boundary=ecoeducacional_backup",
      },
      body: [
        "--ecoeducacional_backup",
        "Content-Type: application/json; charset=UTF-8",
        "",
        JSON.stringify({ name: BACKUP_FILE_NAME, parents: ["appDataFolder"] }),
        "--ecoeducacional_backup",
        "Content-Type: application/json",
        "",
        content,
        "--ecoeducacional_backup--",
      ].join("\r\n"),
    },
  );

  if (!response.ok) throw new Error(await response.text());
  const uploaded = (await response.json()) as DriveBackupFile;
  for (const file of existingFiles) {
    if (file.id !== uploaded.id) {
      await deleteBackupFile(tokens.accessToken, file.id);
    }
  }
  return uploaded;
}

export async function restoreBackupFromDrive(): Promise<void> {
  const tokens = await getValidTokens();
  const files = await findBackupFiles(tokens.accessToken);
  const file = files[0];
  if (!file) throw new Error("Nenhum backup encontrado no Google Drive.");

  const response = await fetch(`${DRIVE_FILES_URL}/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  if (!response.ok) throw new Error(await response.text());

  const payload = parseAppBackupPayload(await response.text());
  await restoreAppBackupPayload(payload);
}
