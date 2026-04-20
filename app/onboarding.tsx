import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  saveTeacherProfile,
  markOnboardingDone,
  NIVEL_ENSINO_OPTIONS,
  TeacherProfile,
} from "@/lib/storage";

const USE_NATIVE_DRIVER = Platform.OS !== "web";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 24 : insets.top + 16;
  const bottomPadding = Platform.OS === "web" ? 40 : insets.bottom + 20;

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [instituicao, setInstituicao] = useState("");
  const [nivelEnsino, setNivelEnsino] = useState("");
  const [disciplinas, setDisciplinas] = useState("");
  const [showNivelModal, setShowNivelModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const canContinue = nome.trim() && instituicao.trim() && nivelEnsino && disciplinas.trim();

  const handleContinue = async () => {
    if (!canContinue) return;
    setSaving(true);
    const profile: TeacherProfile = {
      nome: nome.trim(),
      email: email.trim(),
      instituicao: instituicao.trim(),
      nivelEnsino,
      disciplinas: disciplinas.trim(),
    };
    await saveTeacherProfile(profile);
    await markOnboardingDone();
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.replace("/");
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0F1729", "#3B1066", "#0F1729"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <View style={[styles.blob1]} />
      <View style={[styles.blob2]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: topPadding, paddingBottom: bottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandBlock}>
            <LinearGradient
              colors={["#10B981", "#14B8A6", "#06B6D4"]}
              style={styles.logoCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="school" size={36} color="#fff" />
            </LinearGradient>
            <Text style={styles.brandName}>EcoEducacional</Text>
            <Text style={styles.brandSub}>Gestão Pedagógica</Text>
            <Text style={styles.welcomeText}>
              Bem-vindo! Para começar, diga-nos um pouco sobre si.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabel}>
                <Icon name="user" size={14} color={Colors.primary} />
                <Text style={styles.labelText}>Nome completo <Text style={styles.required}>*</Text></Text>
              </View>
              <TextInput
                style={styles.input}
                value={nome}
                onChangeText={setNome}
                placeholder="Ex: Maria João Silva"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabel}>
                <Icon name="mail" size={14} color={Colors.primary} />
                <Text style={styles.labelText}>Endereço de e-mail</Text>
              </View>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Ex: joao.silva@escola.ao"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabel}>
                <Icon name="home" size={14} color={Colors.primary} />
                <Text style={styles.labelText}>Instituição de ensino <Text style={styles.required}>*</Text></Text>
              </View>
              <TextInput
                style={styles.input}
                value={instituicao}
                onChangeText={setInstituicao}
                placeholder="Ex: Escola Secundária do Rangel"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabel}>
                <Icon name="layers" size={14} color={Colors.primary} />
                <Text style={styles.labelText}>Nível de ensino <Text style={styles.required}>*</Text></Text>
              </View>
              <Pressable
                onPress={() => setShowNivelModal(true)}
                style={({ pressed }) => [
                  styles.selectBtn,
                  pressed && { opacity: 0.8 },
                  nivelEnsino ? styles.selectBtnFilled : null,
                ]}
              >
                <Text style={nivelEnsino ? styles.selectBtnText : styles.selectBtnPlaceholder}>
                  {nivelEnsino || "Selecionar nível de ensino"}
                </Text>
                <Icon name="chevron-down" size={16} color={nivelEnsino ? Colors.primary : Colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabel}>
                <Icon name="book-open-variant" size={14} color={Colors.primary} />
                <Text style={styles.labelText}>Disciplinas que lecciona <Text style={styles.required}>*</Text></Text>
              </View>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={disciplinas}
                onChangeText={setDisciplinas}
                placeholder="Ex: Matemática, Física"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="sentences"
                multiline
                numberOfLines={2}
              />
              <Text style={styles.fieldHint}>Separe por vírgulas se leccionar mais de uma disciplina</Text>
            </View>
          </View>

          <Pressable
            onPress={handleContinue}
            disabled={!canContinue || saving}
            style={({ pressed }) => [
              styles.continueBtn,
              (!canContinue || saving) && styles.continueBtnDisabled,
              pressed && canContinue && { opacity: 0.9 },
            ]}
          >
            <LinearGradient
              colors={canContinue ? ["#10B981", "#14B8A6"] : ["#374151", "#374151"]}
              style={styles.continueBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.continueBtnText}>
                {saving ? "A guardar..." : "Começar a usar"}
              </Text>
              {!saving && <Icon name="arrow-right" size={18} color="#fff" />}
            </LinearGradient>
          </Pressable>

          <Text style={styles.footerNote}>
            Estes dados serão usados automaticamente nos planos de aula e podem ser editados nas Definições.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showNivelModal} transparent animationType="fade" onRequestClose={() => setShowNivelModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowNivelModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Nível de Ensino</Text>
            <Text style={styles.modalSubtitle}>Selecione o nível em que lecciona</Text>
            {NIVEL_ENSINO_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  setNivelEnsino(opt);
                  setShowNivelModal(false);
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                }}
                style={({ pressed }) => [
                  styles.nivelOption,
                  nivelEnsino === opt && styles.nivelOptionSelected,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.nivelOptionText, nivelEnsino === opt && styles.nivelOptionTextSelected]}>
                  {opt}
                </Text>
                {nivelEnsino === opt && <Icon name="check" size={16} color={Colors.primary} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F1729" },
  blob1: {
    position: "absolute", top: 60, left: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: "rgba(168,85,247,0.15)",
  },
  blob2: {
    position: "absolute", bottom: 100, right: -60,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: "rgba(20,184,166,0.12)",
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 20,
  },
  brandBlock: {
    alignItems: "center",
    gap: 6,
    paddingBottom: 4,
  },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  brandName: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#fff",
    letterSpacing: -0.5,
  },
  brandSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 20,
    gap: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  fieldGroup: { gap: 6 },
  fieldLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  labelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  required: { color: Colors.error },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#fff",
  },
  inputMulti: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  fieldHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  selectBtnFilled: {
    borderColor: Colors.primary + "60",
    backgroundColor: Colors.primary + "10",
  },
  selectBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#fff",
    flex: 1,
  },
  selectBtnPlaceholder: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textMuted,
    flex: 1,
  },
  continueBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  continueBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  footerNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: Colors.modalBg,
    borderRadius: 20,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  modalSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  nivelOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
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
