import React, { useEffect, useState, useCallback } from "react";
import { AppState, AppStateStatus, View, Platform } from "react-native";
import LockScreen from "@/components/LockScreen";
import { AuthSettings, getAuthSettings } from "@/lib/auth";

const RELOCK_AFTER_MS = 60_000;

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AuthSettings | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [lastActive, setLastActive] = useState<number>(Date.now());

  const refresh = useCallback(async () => {
    const s = await getAuthSettings();
    setSettings(s);
    if (!s.pinEnabled) setUnlocked(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "background" || state === "inactive") {
        setLastActive(Date.now());
      }
      if (state === "active" && settings?.pinEnabled) {
        if (Date.now() - lastActive > RELOCK_AFTER_MS) {
          setUnlocked(false);
        }
      }
    });
    return () => sub.remove();
  }, [settings, lastActive]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.hidden) {
        setLastActive(Date.now());
      } else if (settings?.pinEnabled && Date.now() - lastActive > RELOCK_AFTER_MS) {
        setUnlocked(false);
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
      return () => document.removeEventListener("visibilitychange", handleVisibility);
    }
    return undefined;
  }, [settings, lastActive]);

  if (!settings) return <View style={{ flex: 1, backgroundColor: "#0F1729" }} />;

  if (settings.pinEnabled && !unlocked) {
    return (
      <LockScreen
        settings={settings}
        onUnlock={() => {
          setUnlocked(true);
          setLastActive(Date.now());
        }}
      />
    );
  }

  return <>{children}</>;
}
