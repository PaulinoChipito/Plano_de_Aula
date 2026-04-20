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
import { Ionicons, Feather } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [profileSaved, setProfileSaved] = useState(false);
  const [modelCached, setModelCached] = useState(false);
  const [showNivelModal, setShowNivelModal] = useState(false);

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
  }, []);

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
          <Ionicons name="chevron-back" size={24} color="#fff" />
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
                <Feather name="user" size={20} color={Colors.primary} />
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
                <Feather name="chevron-down" size={16} color={profile.nivelEnsino ? Colors.primary : Colors.textMuted} />
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
              <Feather
                name={profileSaved ? "check" : "save"}
                size={18}
                color="#fff"
              />
              <Text style={styles.saveBtnText}>
                {profileSaved ? "Guardado!" : "Guardar Perfil"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconContainer,
                  { backgroundColor: Colors.primary + "15" },
                ]}
              >
                <MaterialCommunityIcons name="chip" size={20} color={Colors.primary} />
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
                <Feather
                  name={Platform.OS === "web" ? "cpu" : "smartphone"}
                  size={14}
                  color={Platform.OS === "web" ? Colors.success : Colors.primary}
                />
                <Text style={[styles.modelBadgeText, { color: Platform.OS === "web" ? Colors.success : Colors.primary }]}>
                  {Platform.OS === "web" ? "Modelo neural (web)" : "Modelos pedagógicos (nativo)"}
                </Text>
              </View>
              {Platform.OS === "web" && (
                <View style={[styles.modelBadge, { backgroundColor: modelCached ? Colors.success + "15" : Colors.warning + "15" }]}>
                  <Feather
                    name={modelCached ? "check-circle" : "download"}
                    size={14}
                    color={modelCached ? Colors.success : Colors.warning}
                  />
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
                <Feather name="refresh-cw" size={16} color={Colors.error} />
                <Text style={styles.resetBtnText}>Limpar modelo da memória</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.infoCard}>
            <Feather name="shield" size={18} color={Colors.success} />
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
                {profile.nivelEnsino === opt && <Feather name="check" size={16} color={Colors.primary} />}
              </Pressable>
            ))}
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
});
