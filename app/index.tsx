import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";

const USE_NATIVE_DRIVER = Platform.OS !== "web";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 16;
const CARD_PADDING = 20;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

interface GridItem {
  icon: React.ReactNode;
  label: string;
  route: string;
  gradient: [string, string, string];
}

const GRID_ITEMS: GridItem[] = [
  {
    icon: <MaterialCommunityIcons name="book-open-variant" size={32} color="#fff" />,
    label: "Plano de Aula",
    route: "/lesson-plans",
    gradient: ["#34D399", "#14B8A6", "#0891B2"],
  },
  {
    icon: <Ionicons name="people" size={32} color="#fff" />,
    label: "Turmas",
    route: "/classes",
    gradient: ["#60A5FA", "#6366F1", "#9333EA"],
  },
  {
    icon: <MaterialCommunityIcons name="clipboard-check" size={32} color="#fff" />,
    label: "Avaliações",
    route: "/assessments",
    gradient: ["#A78BFA", "#A855F7", "#C026D3"],
  },
  {
    icon: <Ionicons name="calendar" size={32} color="#fff" />,
    label: "Agenda",
    route: "/agenda",
    gradient: ["#FBBF24", "#F97316", "#DC2626"],
  },
  {
    icon: <MaterialCommunityIcons name="account-check" size={32} color="#fff" />,
    label: "Presenças",
    route: "/attendance",
    gradient: ["#22D3EE", "#0EA5E9", "#2563EB"],
  },
  {
    icon: <Ionicons name="stats-chart" size={32} color="#fff" />,
    label: "Estatísticas",
    route: "/statistics",
    gradient: ["#F472B6", "#F43F5E", "#DC2626"],
  },
];

function AnimatedBlob({
  style,
  xRange,
  yRange,
  duration,
}: {
  style: object;
  xRange: [number, number];
  yRange: [number, number];
  duration: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: duration / 2,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    ).start();
  }, []);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: xRange,
  });
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: yRange,
  });

  return (
    <Animated.View
      style={[style, { transform: [{ translateX }, { translateY }] }]}
    />
  );
}

function WaveSvg() {
  return (
    <Svg viewBox="0 0 1440 48" width="100%" height={48} style={{ marginTop: -1 }}>
      <Path
        d="M0 48H1440V0C1440 0 1080 48 720 48C360 48 0 0 0 0V48Z"
        fill="rgba(15,23,42,0.5)"
      />
    </Svg>
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;

  const cardScales = useRef(GRID_ITEMS.map(() => new Animated.Value(1))).current;

  const handlePressIn = (index: number) => {
    Animated.spring(cardScales[index], {
      toValue: 0.95,
      useNativeDriver: USE_NATIVE_DRIVER,
      speed: 50,
    }).start();
  };

  const handlePressOut = (index: number) => {
    Animated.spring(cardScales[index], {
      toValue: 1,
      useNativeDriver: USE_NATIVE_DRIVER,
      speed: 20,
    }).start();
  };

  const handlePress = (route: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route as any);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0F1729", "#581C87", "#0F1729"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <AnimatedBlob
        style={styles.blobPurple}
        xRange={[0, 100]}
        yRange={[0, 50]}
        duration={20000}
      />
      <AnimatedBlob
        style={styles.blobTeal}
        xRange={[0, -100]}
        yRange={[0, -50]}
        duration={15000}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#10B981", "#14B8A6", "#06B6D4"]}
          style={[styles.header, { paddingTop: topPadding + 20 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerSpacer} />
            <View style={styles.headerInner}>
              <MaterialCommunityIcons name="school" size={22} color="rgba(255,255,255,0.9)" />
              <View style={styles.headerTitleBlock}>
                <Text style={styles.headerTitle}>EcoEducacional</Text>
                <Text style={styles.headerSubtitle}>Gestão Pedagógica</Text>
              </View>
            </View>
            <Pressable
              onPress={() => handlePress("/settings")}
              style={({ pressed }) => [
                styles.settingsBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="settings" size={20} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>
          <WaveSvg />
        </LinearGradient>

        <View style={styles.gridContainer}>
          <View style={styles.grid}>
            {GRID_ITEMS.map((item, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.cardWrapper,
                  { transform: [{ scale: cardScales[index] }] },
                ]}
              >
                <Pressable
                  onPress={() => handlePress(item.route)}
                  onPressIn={() => handlePressIn(index)}
                  onPressOut={() => handlePressOut(index)}
                  style={styles.card}
                >
                  <View style={styles.cardBorder}>
                    <View style={styles.cardContent}>
                      <LinearGradient
                        colors={item.gradient}
                        style={styles.iconContainer}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {item.icon}
                      </LinearGradient>
                      <Text style={styles.cardLabel}>{item.label}</Text>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>

          <View style={styles.footer}>
            <View style={styles.footerBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.footerText}>Sistema Activo · INIDE Angola</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0F1729",
  },
  blobPurple: {
    position: "absolute",
    top: 80,
    left: -80,
    width: 288,
    height: 288,
    borderRadius: 144,
    backgroundColor: "rgba(168,85,247,0.2)",
  },
  blobTeal: {
    position: "absolute",
    bottom: 80,
    right: -80,
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: "rgba(20,184,166,0.2)",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 0,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 20,
  },
  headerSpacer: {
    width: 40,
  },
  headerInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  headerTitleBlock: {
    alignItems: "center",
    gap: 1,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#fff",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.5,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  gridContainer: {
    padding: CARD_PADDING,
    paddingTop: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    borderRadius: 24,
    overflow: "hidden",
  },
  cardBorder: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cardContent: {
    padding: 20,
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
  },
  footer: {
    marginTop: 32,
    alignItems: "center",
  },
  footerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34D399",
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
});
