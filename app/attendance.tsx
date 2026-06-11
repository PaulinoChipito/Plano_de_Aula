import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { getClasses, getAttendance, getTeacherProfile, ClassGroup, AttendanceRecord } from "@/lib/storage";
import { usePeriod } from "@/lib/periodContext";
import { useYear } from "@/lib/yearContext";
import ExportMenu from "@/components/ExportMenu";
import { exportPdfFromHtml, exportExcel } from "@/lib/exports";
import { attendanceMapHtml, attendanceMapExcel } from "@/lib/exportTemplates";

export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [exportTarget, setExportTarget] = useState<ClassGroup | null>(null);
  const { currentPeriod, currentPeriodLabel } = usePeriod();
  const { currentYear, years } = useYear();
  const defaultYear = years[0] ?? "";

  useFocusEffect(
    useCallback(() => {
      Promise.all([getClasses(), getAttendance()]).then(([c, a]) => {
        setClasses(c.filter((cl) => (cl.anoLectivo ?? defaultYear) === currentYear));
        setAttendance(a.filter((r) => (r.anoLectivo ?? defaultYear) === currentYear && (r.periodo ?? "I") === currentPeriod));
      });
    }, [currentPeriod, currentYear, defaultYear]),
  );

  const getAttendanceStats = (turmaId: string) => {
    const records = attendance.filter((r) => r.turmaId === turmaId);
    const totalSessions = records.length;
    if (totalSessions === 0) return null;
    const totalPresent = records.reduce(
      (acc, r) => acc + r.registos.filter((reg) => reg.presente).length,
      0,
    );
    const totalStudents = records.reduce((acc, r) => acc + r.registos.length, 0);
    const pct = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
    return { totalSessions, pct };
  };

  const handleExportPdf = async () => {
    if (!exportTarget) return;
    const profile = await getTeacherProfile();
    const html = attendanceMapHtml(exportTarget, attendance, profile, currentPeriodLabel);
    await exportPdfFromHtml(html, `Mapa_Presencas_${exportTarget.designacao}_${currentPeriodLabel}`);
  };

  const handleExportExcel = async () => {
    if (!exportTarget) return;
    const profile = await getTeacherProfile();
    const sheet = attendanceMapExcel(exportTarget, attendance, profile, currentPeriodLabel);
    await exportExcel(sheet.rows, `Mapa_Presencas_${exportTarget.designacao}_${currentPeriodLabel}`, sheet.name, {
      merges: sheet.merges,
      colWidths: sheet.colWidths,
    });
  };

  const renderClass = ({ item }: { item: ClassGroup }) => {
    const stats = getAttendanceStats(item.id);
    return (
      <Pressable
        onPress={() => router.push({ pathname: "/attendance-mark", params: { turmaId: item.id } })}
        style={({ pressed }) => [styles.card, { opacity: pressed ? 0.95 : 1 }]}
      >
        <View style={styles.cardIcon}>
          <Icon name="account-check" size={22} color="#15803D" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.designacao}</Text>
          <Text style={styles.cardSubtitle}>{item.disciplina} - {item.alunos.length} alunos</Text>
        </View>
        {stats && (
          <View style={styles.statBadge}>
            <Text style={styles.statText}>{stats.pct}%</Text>
            <Text style={styles.statLabel}>{stats.totalSessions} aulas</Text>
          </View>
        )}
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            const has = attendance.some((r) => r.turmaId === item.id);
            if (!has) {
              Alert.alert("Sem registos", "Marque presenças antes de exportar o mapa.");
              return;
            }
            setExportTarget(item);
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.downloadBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name="download" size={18} color="#15803D" />
        </Pressable>
        <Icon name="chevron-forward" size={18} color={Colors.textMuted} />
      </Pressable>
    );
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
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <Icon name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Controlo de Presenca</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={renderClass}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-check-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Sem turmas</Text>
            <Text style={styles.emptySubtitle}>Crie turmas para marcar presenca</Text>
          </View>
        }
      />

      <ExportMenu
        visible={!!exportTarget}
        title="Exportar mapa de presenças"
        subtitle={exportTarget ? `${exportTarget.designacao} · ${exportTarget.disciplina}` : undefined}
        onClose={() => setExportTarget(null)}
        onPdf={handleExportPdf}
        onExcel={handleExportExcel}
      />
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
  list: { padding: 20, gap: 12 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    borderRadius: 14, padding: 16, gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(34,197,94,0.15)", alignItems: "center", justifyContent: "center" },
  downloadBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(21,128,61,0.15)", borderWidth: 1, borderColor: "rgba(21,128,61,0.3)",
  },
  cardContent: { flex: 1 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  cardSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  statBadge: { alignItems: "center" },
  statText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.success },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary },
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 8 },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
});
