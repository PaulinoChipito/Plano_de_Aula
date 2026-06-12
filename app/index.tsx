import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Animated,
  useWindowDimensions,
  Modal,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";
import { usePeriod } from "@/lib/periodContext";
import { useYear } from "@/lib/yearContext";
import { getClasses, getGrades, getAttendance } from "@/lib/storage";
import Colors from "@/constants/colors";
import { useLanguage } from "@/lib/i18n";

interface AlertStudent {
  nome: string;
  turma: string;
  motivo: "sem_notas" | "reprovado_faltas";
  alunoId: string;
  turmaId: string;
}

const USE_NATIVE_DRIVER = Platform.OS !== "web";
const CARD_GAP = 16;
const CARD_PADDING = 20;

interface GridItem {
  iconName: string;
  label: string;
  route: string;
  gradient: [string, string, string];
}

const GRID_ITEMS: GridItem[] = [
  {
    iconName: "book-open-variant",
    label: "Plano de Aula",
    route: "/lesson-plans",
    gradient: ["#34D399", "#14B8A6", "#0891B2"],
  },
  {
    iconName: "people",
    label: "Turmas",
    route: "/classes",
    gradient: ["#60A5FA", "#6366F1", "#9333EA"],
  },
  {
    iconName: "clipboard-check",
    label: "Avaliações",
    route: "/assessments",
    gradient: ["#A78BFA", "#A855F7", "#C026D3"],
  },
  {
    iconName: "calendar",
    label: "Agenda",
    route: "/agenda",
    gradient: ["#FBBF24", "#F97316", "#DC2626"],
  },
  {
    iconName: "account-check",
    label: "Presenças",
    route: "/attendance",
    gradient: ["#22D3EE", "#0EA5E9", "#2563EB"],
  },
  {
    iconName: "stats-chart",
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

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: xRange });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: yRange });

  return (
    <Animated.View style={[style, { transform: [{ translateX }, { translateY }] }]} />
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
  const { width: screenWidth } = useWindowDimensions();
  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const { currentPeriod, setPeriod, periodLabels, periodKeys, currentPeriodLabel, refreshProfile } = usePeriod();
  const { currentYear, years } = useYear();
  const defaultYear = years[0] ?? "";
  const { tr } = useLanguage();

  const gridItems = [
    { ...GRID_ITEMS[0], label: tr.homeLessonPlans },
    { ...GRID_ITEMS[1], label: tr.homeClasses },
    { ...GRID_ITEMS[2], label: tr.homeAssessments },
    { ...GRID_ITEMS[3], label: tr.homeAgenda },
    { ...GRID_ITEMS[4], label: tr.homeAttendance },
    { ...GRID_ITEMS[5], label: tr.homeStatistics },
  ];

  const cardWidth = (screenWidth - CARD_PADDING * 2 - CARD_GAP) / 2;
  const iconContainerSize = Math.min(64, Math.max(44, Math.round(cardWidth * 0.36)));
  const iconSize = Math.min(28, Math.max(20, Math.round(iconContainerSize * 0.44)));
  const iconBorderRadius = Math.round(iconContainerSize * 0.28);
  const cardMinHeight = iconContainerSize + 60;

  const cardScales = useRef(GRID_ITEMS.map(() => new Animated.Value(1))).current;
  const [atencaoAlunos, setAtencaoAlunos] = useState<AlertStudent[]>([]);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [tickerIdx, setTickerIdx] = useState(0);
  const tickerY = useRef(new Animated.Value(0)).current;
  const tickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerIdxRef = useRef(0);

  const loadAlerts = useCallback(async () => {
    try {
      const [classes, grades, attendance] = await Promise.all([
        getClasses(),
        getGrades(),
        getAttendance(),
      ]);
      const alerts: AlertStudent[] = [];

      const yearClasses = classes.filter((c) => (c.anoLectivo ?? defaultYear) === currentYear);
      for (const turma of yearClasses) {
        for (const aluno of turma.alunos) {
          const grade = grades.find(
            (g) => g.alunoId === aluno.id && g.turmaId === turma.id && (g.anoLectivo ?? defaultYear) === currentYear && (g.periodo ?? "I") === currentPeriod
          );
          const semNotas = !grade || (grade.mac.length === 0 && grade.npt === null);
          if (semNotas) {
            alerts.push({ nome: aluno.nome, turma: turma.designacao, motivo: "sem_notas", alunoId: aluno.id, turmaId: turma.id });
          }
        }

        if (turma.faltasLimite) {
          const periodRecords = attendance.filter(
            (r) => r.turmaId === turma.id && (r.anoLectivo ?? defaultYear) === currentYear && (r.periodo ?? "I") === currentPeriod
          );
          for (const aluno of turma.alunos) {
            const faltas = periodRecords.filter(
              (r) => r.registos.find((reg) => reg.alunoId === aluno.id && !reg.presente)
            ).length;
            if (faltas > turma.faltasLimite!) {
              const alreadyAdded = alerts.some(
                (a) => a.alunoId === aluno.id && a.turmaId === turma.id && a.motivo === "reprovado_faltas"
              );
              if (!alreadyAdded) {
                alerts.push({ nome: aluno.nome, turma: turma.designacao, motivo: "reprovado_faltas", alunoId: aluno.id, turmaId: turma.id });
              }
            }
          }
        }
      }

      tickerIdxRef.current = 0;
      setTickerIdx(0);
      tickerY.setValue(0);
      setAtencaoAlunos(alerts);
    } catch {
      // silent fail
    }
  }, [currentPeriod, currentYear, defaultYear, tickerY]);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      loadAlerts();
    }, [refreshProfile, loadAlerts])
  );

  useEffect(() => {
    if (atencaoAlunos.length <= 1) return;
    const ITEM_H = 58;
    const animate = () => {
      Animated.timing(tickerY, {
        toValue: -ITEM_H,
        duration: 500,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (!finished) return;
        const next = (tickerIdxRef.current + 1) % atencaoAlunos.length;
        tickerIdxRef.current = next;
        setTickerIdx(next);
        tickerY.setValue(0);
        tickerTimer.current = setTimeout(animate, 3000);
      });
    };
    tickerTimer.current = setTimeout(animate, 3000);
    return () => {
      if (tickerTimer.current) clearTimeout(tickerTimer.current);
      tickerTimer.current = null;
    };
  }, [atencaoAlunos, tickerY]);

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

  const handleAlertPress = (a: AlertStudent) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (a.motivo === "sem_notas") {
      router.push({ pathname: "/student-grades", params: { turmaId: a.turmaId, alunoId: a.alunoId } } as any);
    } else {
      router.push({ pathname: "/attendance-mark", params: { turmaId: a.turmaId } } as any);
    }
  };

  const handlePeriodPress = (key: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync?.();
    setPeriod(key);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0F1729", "#581C87", "#0F1729"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <AnimatedBlob style={styles.blobPurple} xRange={[0, 100]} yRange={[0, 50]} duration={20000} />
      <AnimatedBlob style={styles.blobTeal} xRange={[0, -100]} yRange={[0, -50]} duration={15000} />

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
              <Icon name="school" size={22} color="rgba(255,255,255,0.9)" />
              <View style={styles.headerTitleBlock}>
                <Text style={styles.headerTitle}>EcoEducacional</Text>
                <Text style={styles.headerSubtitle}>Gestão Pedagógica</Text>
              </View>
            </View>
            <Pressable
              onPress={() => handlePress("/settings")}
              style={({ pressed }) => [styles.settingsBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Icon name="settings" size={20} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>
          <WaveSvg />
        </LinearGradient>

        {/* ── Period Selector ── */}
        <View style={styles.periodBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.periodBarContent}
          >
            {periodKeys.map((key, i) => {
              const active = currentPeriod === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => handlePeriodPress(key)}
                  style={({ pressed }) => [
                    styles.periodChip,
                    active && styles.periodChipActive,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={[styles.periodChipText, active && styles.periodChipTextActive]}>
                    {periodLabels[i]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.periodBadge}>
            <Icon name="time" size={11} color="rgba(255,255,255,0.45)" />
            <Text style={styles.periodBadgeText}>{currentPeriodLabel} activo</Text>
          </View>
        </View>

        <View style={[styles.gridContainer, { padding: CARD_PADDING, paddingTop: 20 }]}>
          <View style={styles.grid}>
            {gridItems.map((item, index) => (
              <Animated.View
                key={index}
                style={[
                  { width: cardWidth },
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
                    <View style={[styles.cardContent, { minHeight: cardMinHeight }]}>
                      <LinearGradient
                        colors={item.gradient}
                        style={[
                          styles.iconContainer,
                          {
                            width: iconContainerSize,
                            height: iconContainerSize,
                            borderRadius: iconBorderRadius,
                          },
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Icon name={item.iconName} size={iconSize} color="#fff" />
                      </LinearGradient>
                      <Text style={styles.cardLabel}>{item.label}</Text>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>

          {/* ── Alert Banner ── */}
          {atencaoAlunos.length > 0 && (() => {
            const cur = atencaoAlunos[tickerIdx];
            const nxt = atencaoAlunos[(tickerIdx + 1) % atencaoAlunos.length];
            const ITEM_H = 58;
            const renderItem = (a: AlertStudent) => (
              <Pressable
                onPress={() => handleAlertPress(a)}
                style={({ pressed }) => [styles.alertTickerItem, { opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={styles.alertTickerDot}>
                  <Icon
                    name={a.motivo === "reprovado_faltas" ? "close-circle" : "alert-circle"}
                    size={14}
                    color={a.motivo === "reprovado_faltas" ? "#FCA5A5" : "#FDE68A"}
                  />
                </View>
                <View style={styles.alertTickerInfo}>
                  <Text style={styles.alertTickerName} numberOfLines={1}>{a.nome}</Text>
                  <Text style={styles.alertTickerMeta} numberOfLines={1}>
                    {a.turma} · {a.motivo === "reprovado_faltas" ? "Reprovado por faltas" : "Sem avaliações — toque para avaliar"}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" />
              </Pressable>
            );
            return (
              <View style={styles.alertBanner}>
                <View style={styles.alertBannerHeader}>
                  <View style={styles.alertBannerTitleRow}>
                    <View style={styles.alertBannerIcon}>
                      <Icon name="warning" size={13} color="#FBBF24" />
                    </View>
                    <Text style={styles.alertBannerTitle}>
                      {atencaoAlunos.length} aluno{atencaoAlunos.length !== 1 ? "s" : ""} precisam de atenção
                    </Text>
                  </View>
                  <Text style={styles.alertBannerPeriod}>{currentPeriodLabel}</Text>
                </View>
                <View style={[styles.alertTickerViewport, { height: ITEM_H }]}>
                  <Animated.View style={{ transform: [{ translateY: tickerY }] }}>
                    {renderItem(cur)}
                    {renderItem(nxt)}
                  </Animated.View>
                </View>
                {atencaoAlunos.length > 1 && (
                  <Pressable
                    onPress={() => setShowAllAlerts(true)}
                    style={({ pressed }) => [styles.verTodosBtn, { opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Icon name="users" size={13} color="#FBBF24" />
                    <Text style={styles.verTodosText}>Ver todos ({atencaoAlunos.length})</Text>
                    <Icon name="chevron-forward" size={13} color="rgba(253,230,138,0.6)" />
                  </Pressable>
                )}
              </View>
            );
          })()}

          {/* Modal: full alert list */}
          <Modal visible={showAllAlerts} transparent animationType="slide" onRequestClose={() => setShowAllAlerts(false)}>
            <Pressable style={styles.allAlertsOverlay} onPress={() => setShowAllAlerts(false)}>
              <Pressable style={styles.allAlertsSheet} onPress={() => {}}>
                <View style={styles.allAlertsHandle} />
                <View style={styles.allAlertsHeader}>
                  <Icon name="warning" size={16} color="#FBBF24" />
                  <Text style={styles.allAlertsTitle}>{atencaoAlunos.length} alunos a precisar de atenção</Text>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                  {atencaoAlunos.map((a) => (
                    <Pressable
                      key={`${a.turmaId}-${a.alunoId}`}
                      onPress={() => { setShowAllAlerts(false); setTimeout(() => handleAlertPress(a), 100); }}
                      style={({ pressed }) => [styles.allAlertsRow, { opacity: pressed ? 0.8 : 1 }]}
                    >
                      <View style={styles.allAlertsRowIcon}>
                        <Icon
                          name={a.motivo === "reprovado_faltas" ? "close-circle" : "alert-circle"}
                          size={16}
                          color={a.motivo === "reprovado_faltas" ? "#FCA5A5" : "#FDE68A"}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.allAlertsRowName}>{a.nome}</Text>
                        <Text style={styles.allAlertsRowMeta}>
                          {a.turma} · {a.motivo === "reprovado_faltas" ? "Reprovado por faltas" : "Sem avaliações"}
                        </Text>
                      </View>
                      <Icon name="chevron-forward" size={16} color={Colors.textMuted} />
                    </Pressable>
                  ))}
                </ScrollView>
                <Pressable onPress={() => setShowAllAlerts(false)} style={styles.allAlertsCancelBtn}>
                  <Text style={styles.allAlertsCancelText}>Fechar</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>

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
  root: { flex: 1, backgroundColor: "#0F1729" },
  blobPurple: {
    position: "absolute", top: 80, left: -80, width: 288, height: 288,
    borderRadius: 144, backgroundColor: "rgba(168,85,247,0.2)",
  },
  blobTeal: {
    position: "absolute", bottom: 80, right: -80, width: 384, height: 384,
    borderRadius: 192, backgroundColor: "rgba(20,184,166,0.2)",
  },
  scrollView: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 0, overflow: "hidden" },
  headerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingBottom: 20,
  },
  headerSpacer: { width: 40 },
  headerInner: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
  },
  headerTitleBlock: { alignItems: "center", gap: 1 },
  headerTitle: {
    fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff", letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular", fontSize: 11,
    color: "rgba(255,255,255,0.75)", letterSpacing: 0.5,
  },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },

  /* ── Period selector ── */
  periodBar: {
    backgroundColor: "rgba(15,23,42,0.85)",
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
    paddingVertical: 10,
  },
  periodBarContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  periodChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  periodChipActive: {
    backgroundColor: "rgba(20,184,166,0.25)",
    borderColor: "#14B8A6",
  },
  periodChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.2,
  },
  periodChipTextActive: {
    color: "#34D399",
  },
  periodBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 16, paddingTop: 6,
  },
  periodBadgeText: {
    fontFamily: "Inter_400Regular", fontSize: 11,
    color: "rgba(255,255,255,0.35)",
  },

  /* ── Grid ── */
  gridContainer: {},
  grid: { flexDirection: "row", flexWrap: "wrap", gap: CARD_GAP },
  card: { borderRadius: 24, overflow: "hidden" },
  cardBorder: {
    borderRadius: 24, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cardContent: { padding: 16, alignItems: "center", justifyContent: "center", gap: 12 },
  iconContainer: { alignItems: "center", justifyContent: "center" },
  cardLabel: {
    fontFamily: "Inter_500Medium", fontSize: 13, color: "#fff", textAlign: "center",
  },
  /* ── Alert Banner ── */
  alertBanner: {
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 18,
    backgroundColor: "rgba(251,191,36,0.07)",
    overflow: "hidden",
  },
  alertBannerHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6,
  },
  alertBannerTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  alertBannerIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(251,191,36,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  alertBannerTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FDE68A",
  },
  alertBannerPeriod: {
    fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(253,230,138,0.6)",
  },
  alertTickerViewport: {
    overflow: "hidden",
    marginHorizontal: 0,
  },
  alertTickerItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, height: 58,
  },
  alertTickerDot: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  alertTickerInfo: { flex: 1 },
  alertTickerName: {
    fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff",
  },
  alertTickerMeta: {
    fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1,
  },
  verTodosBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 9, paddingHorizontal: 14,
    borderTopWidth: 1, borderTopColor: "rgba(251,191,36,0.2)",
  },
  verTodosText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#FDE68A" },
  allAlertsOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end",
  },
  allAlertsSheet: {
    backgroundColor: Colors.modalBg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32, borderWidth: 1, borderColor: Colors.border,
  },
  allAlertsHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center", marginBottom: 16,
  },
  allAlertsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  allAlertsTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#FDE68A" },
  allAlertsRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  allAlertsRowIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  allAlertsRowName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  allAlertsRowMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  allAlertsCancelBtn: { alignSelf: "center", marginTop: 16, paddingVertical: 8, paddingHorizontal: 20 },
  allAlertsCancelText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textSecondary },

  footer: { marginTop: 32, alignItems: "center" },
  footerBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#34D399" },
  footerText: {
    fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.7)",
  },
});
