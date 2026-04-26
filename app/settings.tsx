import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  Alert,
  KeyboardAvoidingView,
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
  getTeacherProfile,
  saveTeacherProfile,
  TeacherProfile,
  NIVEL_ENSINO_OPTIONS,
} from "@/lib/storage";
import { isModelCachedWeb, resetModel } from "@/lib/localAI";
import {
  AuthSettings,
  disableAuth,
  getAuthSettings,
  isBiometricAvailable,
  setBiometricEnabled,
  setupPin,
  verifyPin,
} from "@/lib/auth";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [profileSaved, setProfileSaved] = useState(false);
  const [modelCached, setModelCached] = useState(false);
  const [showNivelModal, setShowNivelModal] = useState(false);
  const [authSettings, setAuthSettings] = useState<AuthSettings | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinStep, setPinStep] = useState<"enter" | "confirm">("enter");
  const [pinValue, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinMode, setPinMode] = useState<"setup" | "disable">("setup");
  const [pinDisable, setPinDisable] = useState("");

  const [profile, setProfile] = useState<TeacherProfile>({
    nome: "",
    email: "",
    instituicao: "",
    nivelEnsino: "",
    disciplinas: "",
  });

  useEffect(() => {
    getTeacherProfile().then(setProfile);
    setModelCached(isModelCachedWeb());
    refreshAuth();
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  const refreshAuth = async () => {
    setAuthSettings(await getAuthSettings());
  };

  const openPinSetup = () => {
    setPinMode("setup");
    setPinValue("");
    setPinConfirm("");
    setPinDisable("");
    setPinError("");
    setPinStep("enter");
    setShowPinModal(true);
  };

  const openPinDisable = () => {
    setPinMode("disable");
    setPinValue("");
    setPinConfirm("");
    setPinDisable("");
    setPinError("");
    setShowPinModal(true);
  };

  const handlePinDigit = (d: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPinError("");

    if (pinMode === "disable") {
      if (d === "del") {
        setPinDisable((p) => p.slice(0, -1));
        return;
      }
      if (pinDisable.length >= 6) return;
      const next = pinDisable + d;
      setPinDisable(next);
      if (next.length === 6) {
        setTimeout(() => finalizeDisable(next), 100);
      }
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
      setPinError("Os PINs não coincidem. Recomece.");
      setPinStep("enter");
      setPinValue("");
      setPinConfirm("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    try {
      await setupPin(confirmed, !!authSettings?.biometricEnabled && bioAvailable);
      await refreshAuth();
      setShowPinModal(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("PIN configurado", "A aplicação ficará protegida ao iniciar.");
    } catch (e: any) {
      setPinError(e.message || "Erro ao configurar o PIN.");
    }
  };

  const finalizeDisable = async (entered: string) => {
    const ok = await verifyPin(entered);
    if (!ok) {
      setPinError("PIN incorreto. Tente novamente.");
      setPinDisable("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await disableAuth();
    await refreshAuth();
    setShowPinModal(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Bloqueio desactivado");
  };

  const handleDisableAuth = () => openPinDisable();

  const toggleBiometric = async () => {
    if (!authSettings?.pinEnabled) {
      Alert.alert("Configure o PIN primeiro", "É necessário definir um PIN antes de activar a biometria.");
      return;
    }
    if (!bioAvailable) {
      Alert.alert("Biometria indisponível", "O dispositivo não tem biometria configurada.");
      return;
    }
    await setBiometricEnabled(!authSettings.biometricEnabled);
    await refreshAuth();
    if (Platform.OS !== "web") Haptics.selectionAsync();
  };

  const handleResetModel = () => {
    Alert.alert(
      "Limpar modelo da memória",
      "O modelo será descarregado novamente na próxima utilização. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: () => {
            resetModel();
            setModelCached(false);
          },
        },
      ],
    );
  };

  const handleSaveProfile = async () => {
    await saveTeacherProfile(profile);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

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
          style={({ pressed }) => [
            styles.backBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Icon name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Definições</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: bottomPadding + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Icon name="user" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Perfil do Professor</Text>
                <Text style={styles.sectionSubtitle}>
                  Os seus dados pessoais e profissionais
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome completo</Text>
              <TextInput
                style={styles.profileInput}
                value={profile.nome}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, nome: text }))
                }
                placeholder="Ex: Maria João Silva"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Endereço de e-mail</Text>
              <TextInput
                style={styles.profileInput}
                value={profile.email}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, email: text }))
                }
                placeholder="Ex: joao.silva@escola.ao"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome da Instituição</Text>
              <TextInput
                style={styles.profileInput}
                value={profile.instituicao}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, instituicao: text }))
                }
                placeholder="Ex: Escola Secundária do Rangel"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nível de Ensino</Text>
              <Pressable
                onPress={() => setShowNivelModal(true)}
                style={({ pressed }) => [
                  styles.selectBtn,
                  pressed && { opacity: 0.8 },
                  profile.nivelEnsino ? styles.selectBtnFilled : null,
                ]}
              >
                <Text style={profile.nivelEnsino ? styles.selectBtnText : styles.selectBtnPlaceholder}>
                  {profile.nivelEnsino || "Selecionar nível de ensino"}
                </Text>
                <Icon name="chevron-down" size={16} color={profile.nivelEnsino ? Colors.primary : Colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Disciplinas que Lecciona</Text>
              <TextInput
                style={[styles.profileInput, { minHeight: 60, textAlignVertical: "top" }]}
                value={profile.disciplinas}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, disciplinas: text }))
                }
                placeholder="Ex: Matemática, Física"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={2}
              />
              <Text style={styles.fieldHint}>Separe por vírgulas se leccionar mais de uma</Text>
            </View>

            <Pressable
              onPress={handleSaveProfile}
              style={({ pressed }) => [
                styles.saveBtn,
                profileSaved && styles.savedBtn,
                { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Icon name={profileSaved ? "check" : "save"} size={18} color="#fff" />
              <Text style={styles.saveBtnText}>
                {profileSaved ? "Guardado!" : "Guardar Perfil"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: Colors.primaryLight + "20" }]}>
                <Icon name="shield" size={20} color={Colors.primaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Segurança</Text>
                <Text style={styles.sectionSubtitle}>
                  Proteja a aplicação com PIN e biometria
                </Text>
              </View>
            </View>

            <View style={styles.securityRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.securityLabel}>PIN de bloqueio</Text>
                <Text style={styles.securityHint}>
                  {authSettings?.pinEnabled ? "Activo · 6 dígitos" : "Desactivado"}
                </Text>
              </View>
              <Pressable
                onPress={authSettings?.pinEnabled ? handleDisableAuth : openPinSetup}
                style={({ pressed }) => [
                  styles.securityBtn,
                  authSettings?.pinEnabled && styles.securityBtnActive,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.securityBtnText, authSettings?.pinEnabled && { color: Colors.error }]}>
                  {authSettings?.pinEnabled ? "Desactivar" : "Configurar"}
                </Text>
              </Pressable>
            </View>

            {authSettings?.pinEnabled && (
              <Pressable onPress={openPinSetup} style={({ pressed }) => [styles.securityRowSecondary, { opacity: pressed ? 0.85 : 1 }]}>
                <Text style={styles.securitySecondaryText}>Alterar PIN</Text>
                <Icon name="chevron-forward" size={16} color={Colors.textMuted} />
              </Pressable>
            )}

            <View style={[styles.securityRow, { marginTop: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.securityLabel}>Biometria</Text>
                <Text style={styles.securityHint}>
                  {Platform.OS === "web"
                    ? "Apenas em dispositivos móveis"
                    : !bioAvailable
                      ? "Não configurada no dispositivo"
                      : authSettings?.biometricEnabled
                        ? "Activa · usar impressão/face"
                        : "Inactiva"}
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

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconContainer,
                  { backgroundColor: Colors.primary + "15" },
                ]}
              >
                <Icon name="chip" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>IA Local — Qwen2.5-0.5B</Text>
                <Text style={styles.sectionSubtitle}>
                  Geração de planos sem internet nem custos de API
                </Text>
              </View>
            </View>

            <View style={styles.modelInfoRow}>
              <View style={[styles.modelBadge, { backgroundColor: Platform.OS === "web" ? Colors.success + "15" : Colors.primary + "15" }]}>
                <Icon name={Platform.OS === "web" ? "cpu" : "smartphone"} size={14} color={Platform.OS === "web" ? Colors.success : Colors.primary} />
                <Text style={[styles.modelBadgeText, { color: Platform.OS === "web" ? Colors.success : Colors.primary }]}>
                  {Platform.OS === "web" ? "Modelo neural (web)" : "Modelos pedagógicos (nativo)"}
                </Text>
              </View>
              {Platform.OS === "web" && (
                <View style={[styles.modelBadge, { backgroundColor: modelCached ? Colors.success + "15" : Colors.warning + "15" }]}>
                  <Icon name={modelCached ? "check-circle" : "download"} size={14} color={modelCached ? Colors.success : Colors.warning} />
                  <Text style={[styles.modelBadgeText, { color: modelCached ? Colors.success : Colors.warning }]}>
                    {modelCached ? "Carregado em cache" : "Será descarregado"}
                  </Text>
                </View>
              )}
            </View>

            {Platform.OS === "web" ? (
              <Text style={styles.modelDescription}>
                O modelo Qwen2.5-0.5B-Instruct é executado directamente no browser usando WebAssembly. Na primeira utilização é descarregado (~300 MB) e guardado localmente. As utilizações seguintes são totalmente offline.
              </Text>
            ) : (
              <Text style={styles.modelDescription}>
                No dispositivo móvel, os planos são gerados usando modelos pedagógicos estruturados — sem necessidade de internet, API key ou processamento pesado.
              </Text>
            )}

            {Platform.OS === "web" && modelCached && (
              <Pressable
                onPress={handleResetModel}
                style={({ pressed }) => [styles.resetBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Icon name="refresh-cw" size={16} color={Colors.error} />
                <Text style={styles.resetBtnText}>Limpar modelo da memória</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.infoCard}>
            <Icon name="shield" size={18} color={Colors.success} />
            <Text style={styles.infoText}>
              Toda a geração de planos ocorre localmente no seu dispositivo. Nenhum dado é enviado para servidores externos.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showNivelModal} transparent animationType="fade" onRequestClose={() => setShowNivelModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowNivelModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Nível de Ensino</Text>
            {NIVEL_ENSINO_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  setProfile((prev) => ({ ...prev, nivelEnsino: opt }));
                  setShowNivelModal(false);
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                }}
                style={({ pressed }) => [
                  styles.nivelOption,
                  profile.nivelEnsino === opt && styles.nivelOptionSelected,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.nivelOptionText, profile.nivelEnsino === opt && styles.nivelOptionTextSelected]}>
                  {opt}
                </Text>
                {profile.nivelEnsino === opt && <Icon name="check" size={16} color={Colors.primary} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPinModal(false)}>
          <Pressable style={[styles.modalContent, { alignItems: "center" }]} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {pinMode === "disable"
                ? "Confirmar PIN"
                : pinStep === "enter"
                  ? "Definir PIN"
                  : "Confirmar PIN"}
            </Text>
            <Text style={[styles.sectionSubtitle, { textAlign: "center", marginBottom: 16 }]}>
              {pinMode === "disable"
                ? "Introduza o PIN actual para desactivar"
                : pinStep === "enter"
                  ? "Escolha um PIN de 6 dígitos"
                  : "Repita o PIN para confirmar"}
            </Text>
            <View style={styles.pinDots}>
              {Array.from({ length: 6 }).map((_, i) => {
                const len =
                  pinMode === "disable"
                    ? pinDisable.length
                    : pinStep === "enter"
                      ? pinValue.length
                      : pinConfirm.length;
                return <View key={i} style={[styles.pinDot, len > i && styles.pinDotFilled]} />;
              })}
            </View>
            {pinError ? <Text style={[styles.fieldHint, { color: Colors.error, marginTop: 10 }]}>{pinError}</Text> : null}
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
              style={({ pressed }) => [styles.pinCancel, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.pinCancelText}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 14,
    gap: 6,
  },
  inputLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  fieldHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  profileInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  selectBtnFilled: {
    borderColor: Colors.primary + "60",
    backgroundColor: Colors.primary + "08",
  },
  selectBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  selectBtnPlaceholder: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textMuted,
    flex: 1,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  savedBtn: {
    backgroundColor: Colors.success,
  },
  saveBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.success + "10",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.success + "25",
  },
  infoText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  modelInfoRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  modelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modelBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  modelDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.error + "30",
    backgroundColor: Colors.error + "08",
    alignSelf: "flex-start",
  },
  resetBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: Colors.modalBg,
    borderRadius: 20,
    padding: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 6,
  },
  nivelOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  nivelOptionSelected: {
    borderColor: Colors.primary + "80",
    backgroundColor: Colors.primary + "12",
  },
  nivelOptionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  nivelOptionTextSelected: {
    color: Colors.primary,
    fontFamily: "Inter_500Medium",
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  securityLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  securityHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  securityBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  securityBtnActive: {
    backgroundColor: Colors.error + "18",
    borderWidth: 1,
    borderColor: Colors.error + "40",
  },
  securityBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  securityRowSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginTop: 6,
  },
  securitySecondaryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.primaryLight,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: Colors.primary },
  toggleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
  },
  toggleDotOn: { alignSelf: "flex-end" },
  pinDots: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
  },
  pinDotFilled: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryLight,
  },
  pinPad: { gap: 12, marginTop: 18 },
  pinRow: { flexDirection: "row", gap: 14, justifyContent: "center" },
  pinKey: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pinKeyEmpty: { width: 60, height: 60 },
  pinKeyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 22,
    color: Colors.text,
  },
  pinCancel: { marginTop: 16, paddingVertical: 8, paddingHorizontal: 18 },
  pinCancelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
