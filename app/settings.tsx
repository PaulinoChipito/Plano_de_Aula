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
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  getApiKey,
  setApiKey,
  getTeacherProfile,
  saveTeacherProfile,
  TeacherProfile,
} from "@/lib/storage";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [apiKey, setApiKeyState] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [profile, setProfile] = useState<TeacherProfile>({
    nome: "",
    instituicao: "",
    disciplina: "",
  });

  useEffect(() => {
    getApiKey().then((key) => {
      if (key) setApiKeyState(key);
    });
    getTeacherProfile().then(setProfile);
  }, []);

  const handleSaveApiKey = async () => {
    await setApiKey(apiKey.trim());
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveProfile = async () => {
    await saveTeacherProfile(profile);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleClear = () => {
    Alert.alert(
      "Limpar Chave API",
      "Tem a certeza que deseja remover a chave API?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: async () => {
            setApiKeyState("");
            await setApiKey("");
          },
        },
      ],
    );
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
                  { backgroundColor: "#6366F115" },
                ]}
              >
                <Feather name="key" size={20} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Chave API (Gemini)</Text>
                <Text style={styles.sectionSubtitle}>
                  Necessaria para gerar planos com IA
                </Text>
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKeyState}
                placeholder="AIza..."
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowKey(!showKey)}
                style={styles.eyeBtn}
              >
                <Feather
                  name={showKey ? "eye-off" : "eye"}
                  size={20}
                  color={Colors.textSecondary}
                />
              </Pressable>
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={handleSaveApiKey}
                style={({ pressed }) => [
                  styles.saveBtn,
                  saved && styles.savedBtn,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Feather
                  name={saved ? "check" : "save"}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.saveBtnText}>
                  {saved ? "Guardado!" : "Guardar"}
                </Text>
              </Pressable>

              {apiKey.length > 0 && (
                <Pressable
                  onPress={handleClear}
                  style={({ pressed }) => [
                    styles.clearBtn,
                    { opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <Feather name="trash-2" size={18} color={Colors.error} />
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <Feather name="info" size={18} color={Colors.info} />
            <Text style={styles.infoText}>
              A chave API e guardada localmente no seu dispositivo e nunca e
              partilhada. Obtenha a sua chave em aistudio.google.com/apikey
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
    backgroundColor: Colors.info + "10",
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
});
