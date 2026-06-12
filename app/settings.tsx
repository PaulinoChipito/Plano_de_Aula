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
import Colors from "@/constants/colors";
import { useLanguage } from "@/lib/i18n";

interface SettingsItem {
  labelKey: string;
  subKey: string;
  icon: string;
  color: string;
  bg: string;
  route: string;
}

const ITEMS: SettingsItem[] = [
  {
    labelKey: "settingsProfile",
    subKey: "settingsProfileSub",
    icon: "user",
    color: Colors.primary,
    bg: Colors.primary + "18",
    route: "/settings-profile",
  },
  {
    labelKey: "settingsYear",
    subKey: "settingsYearSub",
    icon: "calendar",
    color: "#f59e0b",
    bg: "#f59e0b18",
    route: "/settings-ano-letivo",
  },
  {
    labelKey: "settingsSecurity",
    subKey: "settingsSecuritySub",
    icon: "shield",
    color: "#8b5cf6",
    bg: "#8b5cf618",
    route: "/settings-security",
  },
  {
    labelKey: "settingsLanguage",
    subKey: "settingsLanguageSub",
    icon: "globe",
    color: "#06b6d4",
    bg: "#06b6d418",
    route: "/settings-idioma",
  },
  {
    labelKey: "settingsHeader",
    subKey: "settingsHeaderSub",
    icon: "file-text",
    color: "#10b981",
    bg: "#10b98118",
    route: "/settings-cabecalho",
  },
  {
    labelKey: "settingsAbout",
    subKey: "settingsAboutSub",
    icon: "info",
    color: "#94a3b8",
    bg: "#94a3b818",
    route: "/settings-sobre",
  },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const { tr } = useLanguage();

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
        <Text style={styles.headerTitle}>{tr.settings}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.list}>
          {ITEMS.map((item, i) => {
            const label = (tr as any)[item.labelKey] ?? item.labelKey;
            const sub = (tr as any)[item.subKey] ?? "";
            return (
              <Pressable
                key={item.route}
                onPress={() => router.push(item.route as any)}
                style={({ pressed }) => [
                  styles.row,
                  i === ITEMS.length - 1 && styles.rowLast,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                  <Icon name={item.icon} size={20} color={item.color} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text>
                </View>
                <Icon name="chevron-forward" size={18} color={Colors.textMuted} />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.infoCard}>
          <Icon name="shield" size={16} color={Colors.success} />
          <Text style={styles.infoText}>{tr.aboutOffline}</Text>
        </View>
      </ScrollView>
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
  content: { padding: 20, gap: 16 },
  list: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.success + "10",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.success + "25",
  },
  infoText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
});
