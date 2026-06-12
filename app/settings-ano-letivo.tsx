import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Modal,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useYear } from "@/lib/yearContext";
import { useLanguage } from "@/lib/i18n";

export default function SettingsAnoLetivoScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const { tr } = useLanguage();
  const { currentYear, years, setYear, addYear, isLatestYear } = useYear();
  const [showYearModal, setShowYearModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState("");
  const [yearError, setYearError] = useState("");

  const openYearModal = () => {
    const latestYear = years.length > 0 ? years[years.length - 1] : "";
    const suggestion = latestYear
      ? (() => {
          const parts = latestYear.split("/");
          if (parts.length === 2) {
            const y2 = parseInt(parts[1]);
            return !isNaN(y2) ? `${y2}/${y2 + 1}` : "";
          }
          return "";
        })()
      : "";
    setNewYearInput(suggestion);
    setYearError("");
    setShowYearModal(true);
  };

  const handleCreateYear = async () => {
    const label = newYearInput.trim();
    if (!label) { setYearError(tr.yearEmpty); return; }
    if (years.includes(label)) { setYearError(tr.yearExists); return; }
    await addYear(label);
    setShowYearModal(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        <Text style={styles.headerTitle}>{tr.yearTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: "#f59e0b15" }]}>
              <Icon name="calendar" size={20} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{tr.yearTitle}</Text>
              <Text style={styles.sectionSubtitle}>{tr.yearSubtitle}</Text>
            </View>
          </View>

          {!isLatestYear && (
            <View style={styles.yearHistoryBanner}>
              <Icon name="history" size={15} color="#f59e0b" />
              <Text style={styles.yearHistoryBannerText}>
                {tr.yearViewing} {currentYear}
              </Text>
            </View>
          )}

          <View style={{ gap: 8 }}>
            {[...years].reverse().map((y) => {
              const isActive = y === currentYear;
              const isLatest = y === years[years.length - 1];
              return (
                <Pressable
                  key={y}
                  onPress={() => {
                    if (!isActive) {
                      setYear(y);
                      if (Platform.OS !== "web") Haptics.selectionAsync();
                    }
                  }}
                  style={({ pressed }) => [
                    styles.yearRow,
                    isActive && styles.yearRowActive,
                    pressed && !isActive && { opacity: 0.75 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.yearLabel, isActive && styles.yearLabelActive]}>{y}</Text>
                    {isLatest && <Text style={styles.yearSubLabel}>{tr.yearLatest}</Text>}
                  </View>
                  {isActive ? (
                    <View style={styles.yearActiveBadge}>
                      <Icon name="check" size={13} color="#fff" />
                      <Text style={styles.yearActiveBadgeText}>{tr.yearCurrent}</Text>
                    </View>
                  ) : (
                    <Text style={styles.yearSelectText}>{tr.yearViewData}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={openYearModal}
            style={({ pressed }) => [styles.yearNewBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Icon name="plus" size={17} color="#f59e0b" />
            <Text style={styles.yearNewBtnText}>{tr.yearNew}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={showYearModal} transparent animationType="fade" onRequestClose={() => setShowYearModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowYearModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>{tr.yearNew}</Text>
            <Text style={[styles.sectionSubtitle, { marginBottom: 12 }]}>{tr.yearArchiveNote}</Text>
            <Text style={styles.inputLabel}>{tr.yearLabel}</Text>
            <TextInput
              style={[styles.profileInput, { marginTop: 6, marginBottom: 4 }]}
              value={newYearInput}
              onChangeText={(t) => { setNewYearInput(t); setYearError(""); }}
              placeholder={tr.yearPlaceholder}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
            {yearError ? (
              <Text style={[styles.fieldHint, { color: Colors.error }]}>{yearError}</Text>
            ) : (
              <Text style={styles.fieldHint}>{tr.yearHint}</Text>
            )}
            <Pressable
              onPress={handleCreateYear}
              style={({ pressed }) => [styles.yearCreateBtn, { opacity: pressed ? 0.85 : 1, marginTop: 16 }]}
            >
              <Icon name="plus" size={17} color="#fff" />
              <Text style={styles.saveBtnText}>{tr.yearCreate}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowYearModal(false)}
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
  inputLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  fieldHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  profileInput: {
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text,
  },
  yearHistoryBanner: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f59e0b15",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
    borderWidth: 1, borderColor: "#f59e0b30",
  },
  yearHistoryBannerText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#f59e0b", flex: 1 },
  yearRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: "rgba(255,255,255,0.04)",
  },
  yearRowActive: { borderColor: "#f59e0b80", backgroundColor: "#f59e0b12" },
  yearLabel: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textSecondary },
  yearLabelActive: { color: "#f59e0b", fontFamily: "Inter_600SemiBold" },
  yearSubLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  yearActiveBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#f59e0b", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  yearActiveBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
  yearSelectText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.primary },
  yearNewBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1,
    borderColor: "#f59e0b40", backgroundColor: "#f59e0b10",
  },
  yearNewBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#f59e0b" },
  yearCreateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#f59e0b", borderRadius: 12, paddingVertical: 14,
  },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", paddingHorizontal: 24 },
  modalContent: { backgroundColor: Colors.modalBg, borderRadius: 20, padding: 24, gap: 10, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text, marginBottom: 6 },
  cancelBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 18, alignSelf: "center" },
  cancelBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textSecondary },
});
