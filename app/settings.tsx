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
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  getTeacherProfile,
  saveTeacherProfile,
  TeacherProfile,
} from "@/lib/storage";
import { isModelCachedWeb, resetModel } from "@/lib/localAI";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [profileSaved, setProfileSaved] = useState(false);
  const [modelCached, setModelCached] = useState(false);

  const [profile, setProfile] = useState<TeacherProfile>({
    nome: "",
    instituicao: "",
    disciplina: "",
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
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Definicoes</Text>
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
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Feather name="user" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Perfil do Professor</Text>
                <Text style={styles.sectionSubtitle}>
                  Os seus dados pessoais e profissionais
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome do Professor</Text>
              <TextInput
                style={styles.profileInput}
                value={profile.nome}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, nome: text }))
                }
                placeholder="Ex: Joao Silva"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome da Instituicao</Text>
              <TextInput
                style={styles.profileInput}
                value={profile.instituicao}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, instituicao: text }))
                }
                placeholder="Ex: Escola Secundaria de Luanda"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Disciplina que Lecciona</Text>
              <TextInput
                style={styles.profileInput}
                value={profile.disciplina}
                onChangeText={(text) =>
                  setProfile((prev) => ({ ...prev, disciplina: text }))
                }
                placeholder="Ex: Matematica"
                placeholderTextColor={Colors.textMuted}
              />
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
                  {Platform.OS === "web" ? "Modelo neural (web)" : "Geração por modelos (nativo)"}
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
                    {modelCached ? "Carregado" : "Será descarregado"}
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
    backgroundColor: Colors.surface,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
  },
  inputLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
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
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 14,
  },
  eyeBtn: {
    padding: 8,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  saveBtn: {
    flex: 1,
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
  clearBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error + "30",
    backgroundColor: Colors.error + "10",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.success + "10",
    borderRadius: 12,
    padding: 16,
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
});
