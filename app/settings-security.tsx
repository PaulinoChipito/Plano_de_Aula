import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  AuthSettings,
  disableAuth,
  getAuthSettings,
  isBiometricAvailable,
  setBiometricEnabled,
  setupPin,
  verifyPin,
} from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

export default function SettingsSecurityScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const { tr } = useLanguage();

  const [authSettings, setAuthSettings] = useState<AuthSettings | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinStep, setPinStep] = useState<"enter" | "confirm">("enter");
  const [pinValue, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinMode, setPinMode] = useState<"setup" | "disable">("setup");
  const [pinDisable, setPinDisable] = useState("");

  useEffect(() => {
    refreshAuth();
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  const refreshAuth = async () => {
    setAuthSettings(await getAuthSettings());
  };

  const openPinSetup = () => {
    setPinMode("setup");
    setPinValue(""); setPinConfirm(""); setPinDisable(""); setPinError("");
    setPinStep("enter");
    setShowPinModal(true);
  };

  const openPinDisable = () => {
    setPinMode("disable");
    setPinValue(""); setPinConfirm(""); setPinDisable(""); setPinError("");
    setShowPinModal(true);
  };

  const handlePinDigit = (d: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPinError("");

    if (pinMode === "disable") {
      if (d === "del") { setPinDisable((p) => p.slice(0, -1)); return; }
      if (pinDisable.length >= 6) return;
      const next = pinDisable + d;
      setPinDisable(next);
      if (next.length === 6) setTimeout(() => finalizeDisable(next), 100);
      return;
    }

    if (d === "del") {
      if (pinStep === "enter") setPinValue((p) => p.slice(0, -1));
      else setPinConfirm((p) => p.slice(0, -1));
      return;
    }
    if (pinStep === "enter") {
      if (pinValue.length >= 6) return;
      const next = pinValue + d;
      setPinValue(next);
      if (next.length === 6) setPinStep("confirm");
    } else {
      if (pinConfirm.length >= 6) return;
      const next = pinConfirm + d;
      setPinConfirm(next);
      if (next.length === 6) setTimeout(() => finalizePin(next), 100);
    }
  };

  const finalizePin = async (confirmed: string) => {
    if (confirmed !== pinValue) {
      setPinError(tr.pinMismatch);
      setPinStep("enter"); setPinValue(""); setPinConfirm("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    try {
      await setupPin(confirmed, !!authSettings?.biometricEnabled && bioAvailable);
      await refreshAuth();
      setShowPinModal(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(tr.pinConfigured, tr.pinConfiguredMsg);
    } catch (e: any) {
      setPinError(e.message || "Erro ao configurar o PIN.");
    }
  };

  const finalizeDisable = async (entered: string) => {
    const ok = await verifyPin(entered);
    if (!ok) {
      setPinError(tr.pinIncorrect);
      setPinDisable("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await disableAuth();
    await refreshAuth();
    setShowPinModal(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(tr.pinDisabled);
  };

  const toggleBiometric = async () => {
    if (!authSettings?.pinEnabled) {
      Alert.alert(tr.pinSetupFirst, tr.pinSetupFirstMsg);
      return;
    }
    if (!bioAvailable) {
      Alert.alert(tr.biometricUnavailable, tr.biometricUnavailableMsg);
      return;
    }
    await setBiometricEnabled(!authSettings.biometricEnabled);
    await refreshAuth();
    if (Platform.OS !== "web") Haptics.selectionAsync();
  };

  const pinDotsLen =
    pinMode === "disable" ? pinDisable.length
      : pinStep === "enter" ? pinValue.length
      : pinConfirm.length;

  const pinModalTitle =
    pinMode === "disable" ? tr.pinDisableTitle
      : pinStep === "enter" ? tr.pinSetupTitle
      : tr.pinConfirmTitle;

  const pinModalSub =
    pinMode === "disable" ? tr.pinEnterCurrent
      : pinStep === "enter" ? tr.pinChoose
      : tr.pinRepeat;

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
        <Text style={styles.headerTitle}>{tr.securityTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: "#8b5cf618" }]}>
              <Icon name="shield" size={20} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{tr.securityTitle}</Text>
              <Text style={styles.sectionSubtitle}>{tr.securitySubtitle}</Text>
            </View>
          </View>

          {/* PIN row */}
          <View style={styles.securityRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityLabel}>{tr.pin}</Text>
              <Text style={styles.securityHint}>
                {authSettings?.pinEnabled ? tr.pinActive : tr.pinInactive}
              </Text>
            </View>
            <Pressable
              onPress={authSettings?.pinEnabled ? openPinDisable : openPinSetup}
              style={({ pressed }) => [
                styles.securityBtn,
                authSettings?.pinEnabled && styles.securityBtnActive,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.securityBtnText, authSettings?.pinEnabled && { color: Colors.error }]}>
                {authSettings?.pinEnabled ? tr.pinDisable : tr.pinSetup}
              </Text>
            </Pressable>
          </View>

          {authSettings?.pinEnabled && (
            <Pressable
              onPress={openPinSetup}
              style={({ pressed }) => [styles.securityRowSecondary, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.securitySecondaryText}>{tr.pinChange}</Text>
              <Icon name="chevron-forward" size={16} color={Colors.textMuted} />
            </Pressable>
          )}

          {/* Biometric row */}
          <View style={[styles.securityRow, { marginTop: 8 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityLabel}>{tr.biometric}</Text>
              <Text style={styles.securityHint}>
                {Platform.OS === "web"
                  ? tr.biometricMobileOnly
                  : !bioAvailable
                    ? tr.biometricNotConfigured
                    : authSettings?.biometricEnabled
                      ? tr.biometricActive
                      : tr.biometricInactive}
              </Text>
            </View>
            <Pressable
              onPress={toggleBiometric}
              disabled={Platform.OS === "web" || !bioAvailable || !authSettings?.pinEnabled}
              style={({ pressed }) => [
                styles.toggle,
                authSettings?.biometricEnabled && styles.toggleOn,
                (Platform.OS === "web" || !bioAvailable || !authSettings?.pinEnabled) && { opacity: 0.4 },
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.toggleDot, authSettings?.biometricEnabled && styles.toggleDotOn]} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* PIN Modal */}
      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPinModal(false)}>
          <Pressable style={[styles.modalContent, { alignItems: "center" }]} onPress={() => {}}>
            <Text style={styles.modalTitle}>{pinModalTitle}</Text>
            <Text style={[styles.sectionSubtitle, { textAlign: "center", marginBottom: 16 }]}>
              {pinModalSub}
            </Text>
            <View style={styles.pinDots}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={[styles.pinDot, pinDotsLen > i && styles.pinDotFilled]} />
              ))}
            </View>
            {pinError ? (
              <Text style={[styles.fieldHint, { color: Colors.error, marginTop: 10 }]}>{pinError}</Text>
            ) : null}
            <View style={styles.pinPad}>
              {[["1","2","3"],["4","5","6"],["7","8","9"],["","0","del"]].map((row, ri) => (
                <View key={ri} style={styles.pinRow}>
                  {row.map((k, ki) => {
                    if (k === "") return <View key={ki} style={styles.pinKeyEmpty} />;
                    return (
                      <Pressable
                        key={ki}
                        onPress={() => handlePinDigit(k)}
                        style={({ pressed }) => [styles.pinKey, { opacity: pressed ? 0.7 : 1 }]}
                      >
                        {k === "del" ? (
                          <Icon name="chevron-back" size={20} color={Colors.text} />
                        ) : (
                          <Text style={styles.pinKeyText}>{k}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
            <Pressable
              onPress={() => setShowPinModal(false)}
              style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.cancelBtnText}>{tr.cancel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 16, backgroundColor: "rgba(15,23,42,0.7)",
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  content: { padding: 20, gap: 20 },
  section: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: Colors.border },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  sectionIconContainer: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary + "15",
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  sectionSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  fieldHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  securityRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 },
  securityLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  securityHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  securityBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.primary },
  securityBtnActive: { backgroundColor: Colors.error + "18", borderWidth: 1, borderColor: Colors.error + "40" },
  securityBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  securityRowSecondary: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)", marginTop: 6,
  },
  securitySecondaryText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.primaryLight },
  toggle: {
    width: 50, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: Colors.primary },
  toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", alignSelf: "flex-start" },
  toggleDotOn: { alignSelf: "flex-end" },
  pinDots: { flexDirection: "row", gap: 12, marginTop: 4 },
  pinDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)" },
  pinDotFilled: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryLight },
  pinPad: { gap: 12, marginTop: 18 },
  pinRow: { flexDirection: "row", gap: 14, justifyContent: "center" },
  pinKey: {
    width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: Colors.border,
  },
  pinKeyEmpty: { width: 60, height: 60 },
  pinKeyText: { fontFamily: "Inter_600SemiBold", fontSize: 22, color: Colors.text },
  cancelBtn: { marginTop: 16, paddingVertical: 8, paddingHorizontal: 18, alignSelf: "center" },
  cancelBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", paddingHorizontal: 24 },
  modalContent: {
    backgroundColor: Colors.modalBg, borderRadius: 20, padding: 24, gap: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text, marginBottom: 6 },
});
