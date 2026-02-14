import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

interface GridItem {
  icon: React.ReactNode;
  label: string;
  route: string;
  gradient: [string, string];
}

const GRID_ITEMS: GridItem[] = [
  {
    icon: <MaterialCommunityIcons name="file-document-edit" size={28} color="#fff" />,
    label: "Plano de Aula",
    route: "/lesson-plans",
    gradient: [Colors.primary, Colors.primaryDark],
  },
  {
    icon: <Ionicons name="people" size={28} color="#fff" />,
    label: "Turmas",
    route: "/classes",
    gradient: ["#6366F1", "#4338CA"],
  },
  {
    icon: <MaterialCommunityIcons name="clipboard-check" size={28} color="#fff" />,
    label: "Avaliacoes",
    route: "/assessments",
    gradient: ["#F59E0B", "#D97706"],
  },
  {
    icon: <Ionicons name="calendar" size={28} color="#fff" />,
    label: "Agenda",
    route: "/agenda",
    gradient: ["#EC4899", "#BE185D"],
  },
  {
    icon: <MaterialCommunityIcons name="account-check" size={28} color="#fff" />,
    label: "Presenca",
    route: "/attendance",
    gradient: ["#22C55E", "#15803D"],
  },
  {
    icon: <Ionicons name="stats-chart" size={28} color="#fff" />,
    label: "Estatisticas",
    route: "/statistics",
    gradient: ["#3B82F6", "#1D4ED8"],
  },
  {
    icon: <Ionicons name="settings-sharp" size={28} color="#fff" />,
    label: "Definicoes",
    route: "/settings",
    gradient: ["#6B7280", "#374151"],
  },
];

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handlePress = (route: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark, "#0A3D5C"]}
        style={[styles.header, { paddingTop: topPadding + 16 }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Lesson Planner</Text>
            <Text style={styles.subtitle}>Pro</Text>
          </View>
          <Pressable
            onPress={() => handlePress("/settings")}
            style={({ pressed }) => [
              styles.settingsBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="settings" size={22} color="rgba(255,255,255,0.9)" />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.gridContainer,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {GRID_ITEMS.map((item, index) => (
            <Pressable
              key={index}
              onPress={() => handlePress(item.route)}
              style={({ pressed }) => [
                styles.gridItem,
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={item.gradient}
                style={styles.gridItemGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.iconContainer}>{item.icon}</View>
                <Text style={styles.gridLabel}>{item.label}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#fff",
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    padding: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  gridItem: {
    width: "47%" as any,
    flexGrow: 1,
    minWidth: 150,
  },
  gridItemGradient: {
    borderRadius: 20,
    padding: 20,
    minHeight: 130,
    justifyContent: "space-between",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  gridLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
    marginTop: 12,
  },
});
