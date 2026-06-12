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
import { useLanguage } from "@/lib/i18n";

export default function SettingsProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const { tr } = useLanguage();

  const [profile, setProfile] = useState<TeacherProfile>({
    nome: "",
    email: "",
    instituicao: "",
    nivelEnsino: "",
    disciplinas: "",
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [showNivelModal, setShowNivelModal] = useState(false);

  useEffect(() => {
    getTeacherProfile().then(setProfile);
  }, []);

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
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{tr.profileTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Icon name="user" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{tr.profileTitle}</Text>
                <Text style={styles.sectionSubtitle}>{tr.settingsProfileSub}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{tr.fullName}</Text>
              <TextInput
                style={styles.profileInput}
                value={profile.nome}
                onChangeText={(text) => setProfile((p) => ({ ...p, nome: text }))}
                placeholder={tr.fullNamePlaceholder}
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{tr.email}</Text>
              <TextInput
                style={styles.profileInput}
                value={profile.email}
                onChangeText={(text) => setProfile((p) => ({ ...p, email: text }))}
                placeholder={tr.emailPlaceholder}
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{tr.institution}</Text>
              <TextInput
                style={styles.profileInput}
                value={profile.instituicao}
                onChangeText={(text) => setProfile((p) => ({ ...p, instituicao: text }))}
                placeholder={tr.institutionPlaceholder}
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{tr.level}</Text>
              <Pressable
                onPress={() => setShowNivelModal(true)}
                style={({ pressed }) => [
                  styles.selectBtn,
                  pressed && { opacity: 0.8 },
                  profile.nivelEnsino ? styles.selectBtnFilled : null,
                ]}
              >
                <Text style={profile.nivelEnsino ? styles.selectBtnText : styles.selectBtnPlaceholder}>
                  {profile.nivelEnsino || tr.levelPlaceholder}
                </Text>
                <Icon name="chevron-down" size={16} color={profile.nivelEnsino ? Colors.primary : Colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{tr.subjects}</Text>
              <TextInput
                style={[styles.profileInput, { minHeight: 60, textAlignVertical: "top" }]}
                value={profile.disciplinas}
                onChangeText={(text) => setProfile((p) => ({ ...p, disciplinas: text }))}
                placeholder={tr.subjectsPlaceholder}
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={2}
              />
              <Text style={styles.fieldHint}>{tr.subjectsHint}</Text>
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
                {profileSaved ? tr.saved : tr.saveProfile}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showNivelModal} transparent animationType="fade" onRequestClose={() => setShowNivelModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowNivelModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>{tr.level}</Text>
            {NIVEL_ENSINO_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  setProfile((p) => ({ ...p, nivelEnsino: opt }));
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
    </View>
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
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primary + "15",
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  sectionSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  inputGroup: { marginBottom: 14, gap: 6 },
  inputLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  fieldHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
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
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1,
    borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 13,
  },
  selectBtnFilled: { borderColor: Colors.primary + "60", backgroundColor: Colors.primary + "08" },
  selectBtnText: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text, flex: 1 },
  selectBtnPlaceholder: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textMuted, flex: 1 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, marginTop: 4,
  },
  savedBtn: { backgroundColor: Colors.success },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", paddingHorizontal: 24 },
  modalContent: { backgroundColor: Colors.modalBg, borderRadius: 20, padding: 24, gap: 10, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text, marginBottom: 6 },
  nivelOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: "rgba(255,255,255,0.04)",
  },
  nivelOptionSelected: { borderColor: Colors.primary + "80", backgroundColor: Colors.primary + "12" },
  nivelOptionText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, flex: 1 },
  nivelOptionTextSelected: { color: Colors.primary, fontFamily: "Inter_500Medium" },
});
