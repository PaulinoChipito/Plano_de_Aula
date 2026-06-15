import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "@/components/Icon";
import Colors from "@/constants/colors";
import {
  getGoogleDriveBackupStatus,
  getGoogleDriveRedirectUri,
  getLatestDriveBackupInfo,
  GoogleDriveBackupStatus,
  signInToGoogleDrive,
  signOutFromGoogleDrive,
  uploadBackupToDrive,
  restoreBackupFromDrive,
  DriveBackupFile,
} from "@/lib/googleDriveBackup";
import { useLanguage } from "@/lib/i18n";

export default function SettingsBackupScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const { tr } = useLanguage();
  const [status, setStatus] = useState<GoogleDriveBackupStatus>({
    configured: false,
    connected: false,
  });
  const [latest, setLatest] = useState<DriveBackupFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"signin" | "backup" | "restore" | "signout" | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextStatus = await getGoogleDriveBackupStatus();
      setStatus(nextStatus);
      if (nextStatus.configured && nextStatus.connected) {
        setLatest(await getLatestDriveBackupInfo());
      } else {
        setLatest(null);
      }
    } catch {
      setLatest(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runAction = async (action: typeof busy, fn: () => Promise<void>, success?: string) => {
    setBusy(action);
    try {
      await fn();
      await refresh();
      if (success) Alert.alert(success);
    } catch (error: any) {
      Alert.alert(tr.backupError, error?.message ?? tr.genericSaveErrorMessage);
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = () => {
    Alert.alert(tr.backupRestoreConfirmTitle, tr.backupRestoreConfirmMessage, [
      { text: tr.cancel, style: "cancel" },
      {
        text: tr.confirm,
        style: "destructive",
        onPress: () =>
          runAction("restore", restoreBackupFromDrive, `${tr.backupRestored}\n${tr.backupRestartHint}`),
      },
    ]);
  };

  const lastBackupText = latest?.modifiedTime
    ? new Date(latest.modifiedTime).toLocaleString()
    : tr.backupNever;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0F1729", "#581C87", "#0F1729"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{tr.backupTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Icon name="download" size={20} color="#22c55e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{tr.backupTitle}</Text>
              <Text style={styles.sectionSubtitle}>{tr.backupSubtitle}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.primaryLight} />
            </View>
          ) : (
            <>
              <View style={styles.statusBox}>
                <Text style={styles.statusLabel}>{status.connected ? tr.backupConnected : tr.backupNotConnected}</Text>
                {status.email ? <Text style={styles.statusSub}>{status.email}</Text> : null}
                <Text style={styles.statusSub}>
                  {tr.backupLastBackup}: {lastBackupText}
                </Text>
              </View>

              {!status.configured ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>{tr.backupGoogleNotConfigured}</Text>
                  <Text style={styles.warningText}>{tr.backupConfigHint}</Text>
                  <Text style={styles.redirectText}>{getGoogleDriveRedirectUri()}</Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                <ActionButton
                  label={status.connected ? tr.backupSignOut : tr.backupSignIn}
                  icon={status.connected ? "close" : "account-check"}
                  variant={status.connected ? "secondary" : "primary"}
                  disabled={!status.configured || busy !== null}
                  loading={busy === "signin" || busy === "signout"}
                  onPress={() =>
                    status.connected
                      ? runAction("signout", signOutFromGoogleDrive)
                      : runAction("signin", async () => {
                          await signInToGoogleDrive();
                        })
                  }
                />
                <ActionButton
                  label={tr.backupNow}
                  icon="save"
                  disabled={!status.configured || !status.connected || busy !== null}
                  loading={busy === "backup"}
                  onPress={() =>
                    runAction("backup", async () => {
                      await uploadBackupToDrive();
                    }, tr.backupSaved)
                  }
                />
                <ActionButton
                  label={tr.backupRestore}
                  icon="refresh-cw"
                  variant="secondary"
                  disabled={!status.configured || !status.connected || busy !== null}
                  loading={busy === "restore"}
                  onPress={handleRestore}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

interface ActionButtonProps {
  label: string;
  icon: "account-check" | "close" | "save" | "refresh-cw";
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  variant?: "primary" | "secondary";
}

function ActionButton({ label, icon, disabled, loading, onPress, variant = "primary" }: ActionButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        variant === "secondary" && styles.actionButtonSecondary,
        disabled && styles.actionButtonDisabled,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Icon name={icon} size={18} color="#fff" />}
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "rgba(15,23,42,0.7)",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  content: { padding: 20, gap: 20 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#22c55e18",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  sectionSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  loadingRow: { paddingVertical: 28, alignItems: "center" },
  statusBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  statusLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  statusSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  warningBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f59e0b14",
    borderWidth: 1,
    borderColor: "#f59e0b35",
    gap: 6,
  },
  warningTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fbbf24" },
  warningText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  redirectText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  actions: { gap: 10, marginTop: 18 },
  actionButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  actionButtonSecondary: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonDisabled: { opacity: 0.45 },
  actionText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
});
