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
import { getClasses, getGrades, getTeacherProfile, getExportHeader, ClassGroup } from "@/lib/storage";
import { useLanguage } from "@/lib/i18n";
import ExportMenu from "@/components/ExportMenu";
import { exportPdfFromHtml, exportExcel } from "@/lib/exports";
import { miniPautaHtml, miniPautaExcel } from "@/lib/exportTemplates";
import { usePeriod } from "@/lib/periodContext";
import { useYear } from "@/lib/yearContext";

export default function AssessmentsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [exportTarget, setExportTarget] = useState<ClassGroup | null>(null);
  const { currentPeriod, currentPeriodLabel } = usePeriod();
  const { currentYear, years } = useYear();
  const defaultYear = years[0] ?? "";
  const { lang, tr } = useLanguage();

  useFocusEffect(
    useCallback(() => {
      getClasses().then((c) => setClasses(c.filter((cl) => (cl.anoLectivo ?? defaultYear) === currentYear)));
    }, [currentYear, defaultYear]),
  );

  const handleExportPdf = async () => {
    if (!exportTarget) return;
    const [allGrades, profile, header] = await Promise.all([getGrades(), getTeacherProfile(), getExportHeader()]);
    const grades = allGrades.filter((g) => (g.anoLectivo ?? defaultYear) === currentYear && (g.periodo ?? "I") === currentPeriod && g.turmaId === exportTarget.id);
    const html = miniPautaHtml(exportTarget, grades, profile, currentPeriodLabel, header, lang);
    await exportPdfFromHtml(html, `Mini_Pauta_${currentPeriodLabel}`);
  };

  const handleExportExcel = async () => {
    if (!exportTarget) return;
    const [allGrades, profile, header] = await Promise.all([getGrades(), getTeacherProfile(), getExportHeader()]);
    const grades = allGrades.filter((g) => (g.anoLectivo ?? defaultYear) === currentYear && (g.periodo ?? "I") === currentPeriod && g.turmaId === exportTarget.id);
    const sheet = miniPautaExcel(exportTarget, grades, profile, currentPeriodLabel, header, lang);
    await exportExcel(sheet.rows, `Mini_Pauta_${currentPeriodLabel}`, sheet.name, {
      merges: sheet.merges,
      colWidths: sheet.colWidths,
      cellStyles: sheet.cellStyles,
    });
  };

  const renderClass = ({ item }: { item: ClassGroup }) => (
    <Pressable
      onPress={() => router.push({ pathname: "/student-grades", params: { turmaId: item.id } })}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.95 : 1 }]}
    >
      <View style={styles.cardIcon}>
        <Icon name="clipboard-check" size={22} color="#D97706" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.designacao}</Text>
        <Text style={styles.cardSubtitle}>{item.disciplina} - {item.alunos.length} {tr.studentsCount}</Text>
      </View>
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          if (item.alunos.length === 0) {
            Alert.alert(tr.noStudentsEmpty, tr.noStudentsExportMsg);
            return;
          }
          setExportTarget(item);
        }}
        hitSlop={8}
        style={({ pressed }) => [styles.downloadBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Icon name="download" size={18} color="#D97706" />
      </Pressable>
      <Icon name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );

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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{tr.assessmentsTitle}</Text>
          <Text style={styles.headerPeriod}>{currentPeriodLabel}</Text>
        </View>
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
            <Icon name="clipboard-text-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{tr.noClassesYet}</Text>
            <Text style={styles.emptySubtitle}>{tr.createClassesFirst}</Text>
          </View>
        }
      />

      <ExportMenu
        visible={!!exportTarget}
        title={`${tr.exportMiniPauta} · ${currentPeriodLabel}`}
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
  headerCenter: { alignItems: "center", gap: 2 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  headerPeriod: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  list: { padding: 20, gap: 12 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    borderRadius: 14, padding: 16, gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.15)", alignItems: "center", justifyContent: "center" },
  downloadBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(217,119,6,0.15)", borderWidth: 1, borderColor: "rgba(217,119,6,0.3)",
  },
  cardContent: { flex: 1 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  cardSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 8 },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
});
