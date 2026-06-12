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

const FEATURES_KEYS = [
  "aboutFeature1",
  "aboutFeature2",
  "aboutFeature3",
  "aboutFeature4",
  "aboutFeature5",
  "aboutFeature6",
  "aboutFeature7",
] as const;

const FEATURE_ICONS = ["clipboard-text-outline", "people", "clipboard-check", "calendar-check", "calendar", "bar-chart", "shield"];

export default function SettingsSobreScreen() {
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
        <Text style={styles.headerTitle}>{tr.aboutTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* App identity */}
        <View style={styles.appCard}>
          <LinearGradient
            colors={["#6366f1", "#8b5cf6"]}
            style={styles.appIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name="school" size={36} color="#fff" />
          </LinearGradient>
          <Text style={styles.appName}>{tr.aboutApp}</Text>
          <Text style={styles.appSubtitle}>{tr.aboutSubtitle}</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>{tr.aboutVersion}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{tr.aboutTitle}</Text>
          <Text style={styles.descText}>{tr.aboutDescription}</Text>
          <Text style={[styles.descText, { marginTop: 10 }]}>{tr.aboutTarget}</Text>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{tr.aboutFeatures}</Text>
          <View style={styles.featureList}>
            {FEATURES_KEYS.map((key, i) => (
              <View key={key} style={styles.featureRow}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>{(tr as any)[key]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Offline badge */}
        <View style={styles.offlineCard}>
          <Icon name="shield" size={20} color={Colors.success} />
          <Text style={styles.offlineText}>{tr.aboutOffline}</Text>
        </View>

        {/* Developer */}
        <View style={styles.devCard}>
          <Text style={styles.devLabel}>{tr.aboutDeveloper}</Text>
          <Text style={styles.devName}>{tr.aboutDeveloperName}</Text>
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
  appCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 28,
    alignItems: "center", gap: 8, borderWidth: 1, borderColor: Colors.border,
  },
  appIcon: {
    width: 80, height: 80, borderRadius: 22,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  appName: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.text },
  appSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  versionBadge: {
    marginTop: 6, paddingHorizontal: 14, paddingVertical: 5,
    backgroundColor: Colors.primary + "18", borderRadius: 20,
    borderWidth: 1, borderColor: Colors.primary + "30",
  },
  versionText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.primary },
  section: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text },
  descText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  featureList: { gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  featureDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.primary, marginTop: 7,
  },
  featureText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
  offlineCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.success + "10", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.success + "25",
  },
  offlineText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  devCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.border,
  },
  devLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  devName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
});
