import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import {
  getClasses,
  getGrades,
  getAttendance,
  ClassGroup,
  StudentGrade,
  AttendanceRecord,
  GradeEntry,
} from "@/lib/storage";

interface Insight {
  type: "warning" | "success" | "info";
  icon: string;
  message: string;
}

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getClasses(), getGrades(), getAttendance()]).then(
        ([c, g, a]) => {
          setClasses(c);
          setGrades(g);
          setAttendance(a);
        },
      );
    }, []),
  );

  const getMacAvg = (mac: GradeEntry[]) => {
    if (mac.length === 0) return 0;
    return Math.round((mac.reduce((s, e) => s + e.nota, 0) / mac.length) * 10) / 10;
  };

  const getStudentName = (alunoId: string): string => {
    for (const c of classes) {
      const s = c.alunos.find((a) => a.id === alunoId);
      if (s) return s.nome;
    }
    return "Desconhecido";
  };

  const getClassName = (turmaId: string): string => {
    return classes.find((c) => c.id === turmaId)?.designacao || "";
  };

  const totalStudents = classes.reduce((acc, c) => acc + c.alunos.length, 0);
  const totalSessions = attendance.length;

  const globalAvg = grades.length > 0
    ? Math.round(
        (grades
          .filter((g) => g.mac.length > 0)
          .reduce((acc, g) => acc + getMacAvg(g.mac), 0) /
          Math.max(grades.filter((g) => g.mac.length > 0).length, 1)) * 10,
      ) / 10
    : 0;

  const insights: Insight[] = [];

  const lowPerformers = grades
    .filter((g) => g.mac.length > 0 && getMacAvg(g.mac) < 10)
    .map((g) => ({
      nome: getStudentName(g.alunoId),
      turma: getClassName(g.turmaId),
      avg: getMacAvg(g.mac),
    }));
  if (lowPerformers.length > 0) {
    insights.push({
      type: "warning",
      icon: "alert-triangle",
      message: `${lowPerformers.length} aluno(s) com rendimento abaixo de 10: ${lowPerformers
        .slice(0, 3)
        .map((p) => `${p.nome} (${p.avg})`)
        .join(", ")}`,
    });
  }

  const topPerformers = grades
    .filter((g) => g.mac.length >= 2)
    .map((g) => {
      const macs = g.mac.sort(
        (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
      );
      const first = macs[0].nota;
      const last = macs[macs.length - 1].nota;
      return { nome: getStudentName(g.alunoId), evolution: last - first };
    })
    .filter((s) => s.evolution > 2)
    .sort((a, b) => b.evolution - a.evolution);
  if (topPerformers.length > 0) {
    insights.push({
      type: "success",
      icon: "trending-up",
      message: `Melhor evolucao: ${topPerformers
        .slice(0, 3)
        .map((p) => `${p.nome} (+${p.evolution.toFixed(1)})`)
        .join(", ")}`,
    });
  }

  const criticalAttendance: { nome: string; pct: number }[] = [];
  classes.forEach((c) => {
    c.alunos.forEach((a) => {
      const records = attendance.filter(
        (r) =>
          r.turmaId === c.id &&
          r.registos.some((reg) => reg.alunoId === a.id),
      );
      if (records.length >= 3) {
        const present = records.filter((r) =>
          r.registos.find((reg) => reg.alunoId === a.id && reg.presente),
        ).length;
        const pct = Math.round((present / records.length) * 100);
        if (pct < 75) {
          criticalAttendance.push({ nome: a.nome, pct });
        }
      }
    });
  });
  if (criticalAttendance.length > 0) {
    insights.push({
      type: "info",
      icon: "alert-circle",
      message: `Frequencia critica: ${criticalAttendance
        .slice(0, 3)
        .map((s) => `${s.nome} (${s.pct}%)`)
        .join(", ")}`,
    });
  }

  if (insights.length === 0 && (classes.length === 0 || grades.length === 0)) {
    insights.push({
      type: "info",
      icon: "info",
      message: "Adicione turmas, alunos e notas para ver insights automaticos.",
    });
  }

  const getInsightColor = (type: string) => {
    if (type === "warning") return Colors.warning;
    if (type === "success") return Colors.success;
    return Colors.info;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Estatisticas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="people" size={22} color={Colors.primary} />
            <Text style={styles.metricValue}>{totalStudents}</Text>
            <Text style={styles.metricLabel}>Alunos</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="school" size={22} color="#6366F1" />
            <Text style={styles.metricValue}>{classes.length}</Text>
            <Text style={styles.metricLabel}>Turmas</Text>
          </View>
          <View style={styles.metricCard}>
            <Feather name="bar-chart-2" size={22} color={Colors.accent} />
            <Text style={styles.metricValue}>{globalAvg || "-"}</Text>
            <Text style={styles.metricLabel}>Media MAC</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="calendar" size={22} color={Colors.success} />
            <Text style={styles.metricValue}>{totalSessions}</Text>
            <Text style={styles.metricLabel}>Aulas</Text>
          </View>
        </View>

        <View style={styles.insightsSection}>
          <Text style={styles.insightsTitle}>Insights Pedagogicos</Text>
          {insights.map((insight, i) => (
            <View
              key={i}
              style={[
                styles.insightCard,
                { borderLeftColor: getInsightColor(insight.type) },
              ]}
            >
              <Feather
                name={insight.icon as any}
                size={18}
                color={getInsightColor(insight.type)}
              />
              <Text style={styles.insightText}>{insight.message}</Text>
            </View>
          ))}
        </View>

        {classes.map((c) => {
          const classGrades = grades.filter((g) => g.turmaId === c.id);
          if (classGrades.length === 0) return null;

          const classAvg =
            Math.round(
              (classGrades
                .filter((g) => g.mac.length > 0)
                .reduce((acc, g) => acc + getMacAvg(g.mac), 0) /
                Math.max(
                  classGrades.filter((g) => g.mac.length > 0).length,
                  1,
                )) * 10,
            ) / 10;

          const classRecords = attendance.filter((r) => r.turmaId === c.id);
          const classTotalPresent = classRecords.reduce(
            (acc, r) => acc + r.registos.filter((reg) => reg.presente).length,
            0,
          );
          const classTotalRegs = classRecords.reduce(
            (acc, r) => acc + r.registos.length,
            0,
          );
          const classPct = classTotalRegs > 0 ? Math.round((classTotalPresent / classTotalRegs) * 100) : 0;

          return (
            <View key={c.id} style={styles.classStatCard}>
              <Text style={styles.classStatTitle}>{c.designacao}</Text>
              <Text style={styles.classStatSubtitle}>{c.disciplina}</Text>
              <View style={styles.classStatRow}>
                <View style={styles.classStatItem}>
                  <Text style={styles.classStatValue}>{classAvg}</Text>
                  <Text style={styles.classStatLabel}>Media MAC</Text>
                </View>
                <View style={styles.classStatItem}>
                  <Text style={styles.classStatValue}>{classPct}%</Text>
                  <Text style={styles.classStatLabel}>Presenca</Text>
                </View>
                <View style={styles.classStatItem}>
                  <Text style={styles.classStatValue}>{c.alunos.length}</Text>
                  <Text style={styles.classStatLabel}>Alunos</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 16, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  content: { padding: 20, gap: 20 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: {
    width: "47%" as any, flexGrow: 1, minWidth: 140,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16, alignItems: "center", gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  metricValue: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.text },
  metricLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  insightsSection: { gap: 12 },
  insightsTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  insightCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderLeftWidth: 3,
  },
  insightText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  classStatCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  classStatTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  classStatSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  classStatRow: { flexDirection: "row", justifyContent: "space-around" },
  classStatItem: { alignItems: "center", gap: 2 },
  classStatValue: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.primary },
  classStatLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
});
