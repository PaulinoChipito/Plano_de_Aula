import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { Language, LANGUAGE_NAMES, useLanguage } from "@/lib/i18n";

const LANGS: { code: Language; flag: string; nativeName: string }[] = [
  { code: "pt", flag: "🇵🇹", nativeName: "Português" },
  { code: "en", flag: "🇬🇧", nativeName: "English" },
  { code: "fr", flag: "🇫🇷", nativeName: "Français" },
];

export default function SettingsIdiomaScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const { lang, setLang, tr } = useLanguage();

  const handleSelect = async (code: Language) => {
    if (code === lang) return;
    await setLang(code);
    if (Platform.OS !== "web") Haptics.selectionAsync();
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
        <Text style={styles.headerTitle}>{tr.languageTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{tr.languageSubtitle}</Text>

        <View style={styles.list}>
          {LANGS.map((l, i) => {
            const isSelected = l.code === lang;
            return (
              <Pressable
                key={l.code}
                onPress={() => handleSelect(l.code)}
                style={({ pressed }) => [
                  styles.row,
                  isSelected && styles.rowSelected,
                  i === LANGS.length - 1 && styles.rowLast,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.flag}>{l.flag}</Text>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}>
                    {l.nativeName}
                  </Text>
                </View>
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Icon name="check" size={16} color="#fff" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.infoCard}>
          <Icon name="info" size={16} color="#06b6d4" />
          <Text style={styles.infoText}>
            {tr.languageSubtitle}
          </Text>
        </View>
      </ScrollView>
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
  content: { padding: 20, gap: 16 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  list: {
    backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  row: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16,
    gap: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowSelected: { backgroundColor: "#06b6d410", borderBottomColor: Colors.border },
  rowLast: { borderBottomWidth: 0 },
  flag: { fontSize: 28 },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: "Inter_500Medium", fontSize: 16, color: Colors.text },
  rowLabelSelected: { color: "#06b6d4", fontFamily: "Inter_600SemiBold" },
  checkBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#06b6d4", alignItems: "center", justifyContent: "center",
  },
  infoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#06b6d410", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#06b6d425",
  },
  infoText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
});
