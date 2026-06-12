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
import Icon, { IconName } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import {
  getClasses,
  getGrades,
  getAttendance,
  getLessonPlans,
  getTeacherProfile,
  getExportHeader,
  ClassGroup,
  StudentGrade,
  AttendanceRecord,
} from "@/lib/storage";
import { useLanguage } from "@/lib/i18n";
import { getMacAverage, getNotaFinal } from "@/lib/gradeUtils";
import { usePeriod } from "@/lib/periodContext";
import { useYear } from "@/lib/yearContext";
import ExportMenu from "@/components/ExportMenu";
import { exportPdfFromHtml, exportExcel } from "@/lib/exports";
import { pautaCompletaHtml, pautaCompletaExcel, attendanceMapHtml, attendanceMapExcel } from "@/lib/exportTemplates";

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [allGrades, setAllGrades] = useState<StudentGrade[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [lessonPlansCount, setLessonPlansCount] = useState(0);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [exportTarget, setExportTarget] = useState<{ turma: ClassGroup; type: "pauta" | "attendance" } | null>(null);
  const { currentPeriod, currentPeriodLabel, periodKeys, periodLabels } = usePeriod();
  const { currentYear, years } = useYear();
  const defaultYear = years[0] ?? "";
  const { lang } = useLanguage();

  useFocusEffect(
    useCallback(() => {
      Promise.all([getClasses(), getGrades(), getAttendance(), getLessonPlans()]).then(
        ([c, g, a, plans]) => {
          const yearClasses = c.filter((cl) => (cl.anoLectivo ?? defaultYear) === currentYear);
          setClasses(yearClasses);
          setAllGrades(g);
          setAllAttendance(a);
          setGrades(g.filter((gr) => (gr.anoLectivo ?? defaultYear) === currentYear && (gr.periodo ?? "I") === currentPeriod));
          setAttendance(a.filter((ar) => (ar.anoLectivo ?? defaultYear) === currentYear && (ar.periodo ?? "I") === currentPeriod));
          setLessonPlansCount(
            plans.filter((p) => (p.anoLectivo ?? defaultYear) === currentYear && (p.periodo ?? "I") === currentPeriod).length,
          );
        },
      );
    }, [currentPeriod, currentYear, defaultYear]),
  );

  const handleExportPautaPdf = async () => {
    if (!exportTarget) return;
    const [profile, header] = await Promise.all([getTeacherProfile(), getExportHeader()]);
    const html = pautaCompletaHtml(exportTarget.turma, allGrades, profile, periodKeys, periodLabels, header, lang);
    await exportPdfFromHtml(html, `Pauta_Completa_${exportTarget.turma.designacao}`);
  };

  const handleExportPautaExcel = async () => {
    if (!exportTarget) return;
    const [profile, header] = await Promise.all([getTeacherProfile(), getExportHeader()]);
    const sheet = pautaCompletaExcel(exportTarget.turma, allGrades, profile, periodKeys, periodLabels, header, lang);
    await exportExcel(sheet.rows, `Pauta_Completa_${exportTarget.turma.designacao}`, sheet.name, {
      merges: sheet.merges,
      colWidths: sheet.colWidths,
    });
  };

  const handleExportAttendancePdf = async () => {
    if (!exportTarget) return;
    const [profile, header] = await Promise.all([getTeacherProfile(), getExportHeader()]);
    const html = attendanceMapHtml(exportTarget.turma, allAttendance, profile, "Todos os Períodos", header, lang);
    await exportPdfFromHtml(html, `Mapa_Presencas_${exportTarget.turma.designacao}`);
  };

  const handleExportAttendanceExcel = async () => {
    if (!exportTarget) return;
    const [profile, header] = await Promise.all([getTeacherProfile(), getExportHeader()]);
    const sheet = attendanceMapExcel(exportTarget.turma, allAttendance, profile, "Todos os Períodos", header, lang);
    await exportExcel(sheet.rows, `Mapa_Presencas_${exportTarget.turma.designacao}`, sheet.name, {
      merges: sheet.merges,
      colWidths: sheet.colWidths,
    });
  };

  const getStudentName = (alunoId: string): string => {
    for (const c of classes) {
      const s = c.alunos.find((a) => a.id === alunoId);
      if (s) return s.nome;
    }
    return "—";
  };

  const totalStudents = classes.reduce((acc, c) => acc + c.alunos.length, 0);
  const totalAulas = attendance.length;

  const gradesWithMac = grades.filter((g) => g.mac.length > 0);
  const globalMacAvg =
    gradesWithMac.length > 0
      ? Math.round(
          (gradesWithMac.reduce((acc, g) => acc + getMacAverage(g.mac), 0) /
            gradesWithMac.length) *
            10,
        ) / 10
      : null;

  const totalPresent = attendance.reduce(
    (acc, r) => acc + r.registos.filter((reg) => reg.presente).length,
    0,
  );
  const totalRegs = attendance.reduce((acc, r) => acc + r.registos.length, 0);
  const globalPresencaPct =
    totalRegs > 0 ? Math.round((totalPresent / totalRegs) * 100) : null;

  const getClassStats = (c: ClassGroup) => {
    const classGrades = grades.filter((g) => g.turmaId === c.id);
    const classRecords = attendance.filter((r) => r.turmaId === c.id);

    const grWithMac = classGrades.filter((g) => g.mac.length > 0);
    const macAvg =
      grWithMac.length > 0
        ? Math.round(
            (grWithMac.reduce((acc, g) => acc + getMacAverage(g.mac), 0) /
              grWithMac.length) *
              10,
          ) / 10
        : null;

    const grWithNF = classGrades.filter(
      (g) => getNotaFinal(g.mac, g.npt) !== null,
    );
    const nfAvg =
      grWithNF.length > 0
        ? Math.round(
            (grWithNF.reduce(
              (acc, g) => acc + (getNotaFinal(g.mac, g.npt) ?? 0),
              0,
            ) /
              grWithNF.length) *
              10,
          ) / 10
        : null;

    const totalP = classRecords.reduce(
      (acc, r) => acc + r.registos.filter((reg) => reg.presente).length,
      0,
    );
    const totalR = classRecords.reduce(
      (acc, r) => acc + r.registos.length,
      0,
    );
    const presencaPct =
      totalR > 0 ? Math.round((totalP / totalR) * 100) : null;
    const totalFaltas = totalR - totalP;

    return {
      classGrades,
      classRecords,
      macAvg,
      nfAvg,
      presencaPct,
      totalFaltas,
      numAulas: classRecords.length,
    };
  };

  const getStudentStats = (c: ClassGroup, alunoId: string) => {
    const grade = grades.find(
      (g) => g.alunoId === alunoId && g.turmaId === c.id,
    );
    const records = attendance.filter(
      (r) =>
        r.turmaId === c.id &&
        r.registos.some((reg) => reg.alunoId === alunoId),
    );
    const totalSessions = records.length;
    const present = records.filter((r) =>
      r.registos.find((reg) => reg.alunoId === alunoId && reg.presente),
    ).length;
    const faltas = totalSessions - present;
    const pct =
      totalSessions > 0
        ? Math.round((present / totalSessions) * 100)
        : null;
    const macAvg =
      grade && grade.mac.length > 0 ? getMacAverage(grade.mac) : null;
    const nf = grade ? getNotaFinal(grade.mac, grade.npt) : null;
    return { grade, macAvg, nf, faltas, pct, totalSessions };
  };

  const atRiskStudents: { nome: string; turma: string; macAvg: number }[] = [];
  const criticalAbsences: { nome: string; turma: string; pct: number }[] = [];

  classes.forEach((c) => {
    c.alunos.forEach((a) => {
      const stats = getStudentStats(c, a.id);
      if (stats.macAvg !== null && stats.macAvg < 10) {
        atRiskStudents.push({
          nome: a.nome,
          turma: c.designacao,
          macAvg: stats.macAvg,
        });
      }
      if (stats.pct !== null && stats.pct < 75 && stats.totalSessions >= 3) {
        criticalAbsences.push({
          nome: a.nome,
          turma: c.designacao,
          pct: stats.pct,
        });
      }
    });
  });

  const isEmpty =
    classes.length === 0 && grades.length === 0 && attendance.length === 0;

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
          style={({ pressed }) => [
            styles.backBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Icon name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Estatísticas</Text>
          <View style={styles.periodTag}>
            <Icon name="time" size={11} color="#34D399" />
            <Text style={styles.periodTagText}>{currentPeriodLabel}</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPadding + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty && (
          <View style={styles.emptyBox}>
            <Icon name="bar-chart-2" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Sem dados no {currentPeriodLabel}</Text>
            <Text style={styles.emptySubtitle}>
              Registe turmas, notas e presenças para ver a análise aqui.
            </Text>
          </View>
        )}

        {!isEmpty && (
          <>
            {/* ── Sumário geral ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resumo Geral</Text>
              <View style={styles.metricsGrid}>
                <View style={[styles.metricCard, { borderColor: "#6366F130" }]}>
                  <LinearGradient colors={["#6366F120", "#6366F105"]} style={styles.metricGrad} />
                  <Icon name="people" size={20} color="#818CF8" />
                  <Text style={styles.metricValue}>{totalStudents}</Text>
                  <Text style={styles.metricLabel}>Alunos</Text>
                </View>
                <View style={[styles.metricCard, { borderColor: "#14B8A630" }]}>
                  <LinearGradient colors={["#14B8A620", "#14B8A605"]} style={styles.metricGrad} />
                  <Icon name="school" size={20} color="#2DD4BF" />
                  <Text style={styles.metricValue}>{classes.length}</Text>
                  <Text style={styles.metricLabel}>Turmas</Text>
                </View>
                <View style={[styles.metricCard, { borderColor: "#F59E0B30" }]}>
                  <LinearGradient colors={["#F59E0B20", "#F59E0B05"]} style={styles.metricGrad} />
                  <Icon name="bar-chart-2" size={20} color="#FBBF24" />
                  <Text style={styles.metricValue}>
                    {globalMacAvg !== null ? globalMacAvg : "—"}
                  </Text>
                  <Text style={styles.metricLabel}>Média MAC</Text>
                </View>
                <View style={[styles.metricCard, { borderColor: "#10B98130" }]}>
                  <LinearGradient colors={["#10B98120", "#10B98105"]} style={styles.metricGrad} />
                  <Icon name="calendar" size={20} color="#34D399" />
                  <Text style={styles.metricValue}>{totalAulas}</Text>
                  <Text style={styles.metricLabel}>Aulas</Text>
                </View>
                <View style={[styles.metricCard, { borderColor: "#F4366030" }]}>
                  <LinearGradient colors={["#F4366020", "#F4366005"]} style={styles.metricGrad} />
                  <Icon name="account-check" size={20} color="#FB7185" />
                  <Text style={styles.metricValue}>
                    {globalPresencaPct !== null ? `${globalPresencaPct}%` : "—"}
                  </Text>
                  <Text style={styles.metricLabel}>Presença</Text>
                </View>
                <View style={[styles.metricCard, { borderColor: "#8B5CF630" }]}>
                  <LinearGradient colors={["#8B5CF620", "#8B5CF605"]} style={styles.metricGrad} />
                  <Icon name="book-open-variant" size={20} color="#A78BFA" />
                  <Text style={styles.metricValue}>{lessonPlansCount}</Text>
                  <Text style={styles.metricLabel}>Planos</Text>
                </View>
              </View>
            </View>

            {/* ── Por turma ── */}
            {classes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Por Turma</Text>
                {classes.map((c) => {
                  const stats = getClassStats(c);
                  const isExpanded = expandedClass === c.id;
                  const sortedStudents = [...c.alunos].sort((a, b) =>
                    a.nome.localeCompare(b.nome),
                  );

                  return (
                    <View key={c.id} style={styles.classCard}>
                      <Pressable
                        onPress={() =>
                          setExpandedClass(isExpanded ? null : c.id)
                        }
                        style={({ pressed }) => [
                          styles.classCardHeader,
                          { opacity: pressed ? 0.85 : 1 },
                        ]}
                      >
                        <View style={styles.classCardTitle}>
                          <Text style={styles.classCardName}>
                            {c.designacao}
                          </Text>
                          <Text style={styles.classCardDisciplina}>
                            {c.disciplina}
                          </Text>
                        </View>
                        <View style={styles.classCardActions}>
                          <Icon
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={18}
                            color={Colors.textMuted}
                          />
                        </View>
                      </Pressable>

                      <View style={styles.classMetaRow}>
                        <View style={styles.classMeta}>
                          <Icon name="people" size={13} color={Colors.textMuted} />
                          <Text style={styles.classMetaText}>{c.alunos.length} alunos</Text>
                        </View>
                        <View style={styles.classMeta}>
                          <Icon name="calendar" size={13} color={Colors.textMuted} />
                          <Text style={styles.classMetaText}>{stats.numAulas} aulas</Text>
                        </View>
                        <View style={styles.classMeta}>
                          <Icon name="close-circle" size={13} color={Colors.error} />
                          <Text style={[styles.classMetaText, { color: Colors.error }]}>
                            {stats.totalFaltas} faltas
                          </Text>
                        </View>
                      </View>

                      {/* Export buttons */}
                      <View style={styles.classExportRow}>
                        <Pressable
                          onPress={() => setExportTarget({ turma: c, type: "pauta" })}
                          style={({ pressed }) => [styles.classExportBtn, { opacity: pressed ? 0.7 : 1 }]}
                        >
                          <Icon name="document-text" size={15} color="#6366F1" />
                          <Text style={[styles.classExportBtnText, { color: "#6366F1" }]}>Pauta Completa</Text>
                        </Pressable>
                        <View style={styles.classStatDivider} />
                        <Pressable
                          onPress={() => setExportTarget({ turma: c, type: "attendance" })}
                          style={({ pressed }) => [styles.classExportBtn, { opacity: pressed ? 0.7 : 1 }]}
                        >
                          <Icon name="calendar" size={15} color="#14B8A6" />
                          <Text style={[styles.classExportBtnText, { color: "#14B8A6" }]}>Mapa Presenças</Text>
                        </Pressable>
                      </View>

                      <View style={styles.classStatsRow}>
                        <View style={styles.classStatBox}>
                          <Text style={styles.classStatLabel}>Presença</Text>
                          <Text
                            style={[
                              styles.classStatValue,
                              stats.presencaPct !== null &&
                                stats.presencaPct < 75 && { color: Colors.error },
                            ]}
                          >
                            {stats.presencaPct !== null
                              ? `${stats.presencaPct}%`
                              : "—"}
                          </Text>
                        </View>
                        <View style={styles.classStatDivider} />
                        <View style={styles.classStatBox}>
                          <Text style={styles.classStatLabel}>Média MAC</Text>
                          <Text
                            style={[
                              styles.classStatValue,
                              stats.macAvg !== null &&
                                stats.macAvg < 10 && { color: Colors.error },
                              stats.macAvg !== null &&
                                stats.macAvg >= 14 && { color: Colors.success },
                            ]}
                          >
                            {stats.macAvg !== null ? stats.macAvg : "—"}
                          </Text>
                        </View>
                        <View style={styles.classStatDivider} />
                        <View style={styles.classStatBox}>
                          <Text style={styles.classStatLabel}>Nota Final</Text>
                          <Text
                            style={[
                              styles.classStatValue,
                              stats.nfAvg !== null &&
                                stats.nfAvg >= 10 && { color: Colors.success },
                            ]}
                          >
                            {stats.nfAvg !== null ? stats.nfAvg : "—"}
                          </Text>
                        </View>
                      </View>

                      {isExpanded && (
                        <View style={styles.studentTable}>
                          <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Aluno</Text>
                            <Text style={styles.tableHeaderText}>MAC</Text>
                            <Text style={styles.tableHeaderText}>NPT</Text>
                            <Text style={styles.tableHeaderText}>NF</Text>
                            <Text style={styles.tableHeaderText}>Faltas</Text>
                            <Text style={styles.tableHeaderText}>Freq.</Text>
                          </View>
                          {sortedStudents.map((student, i) => {
                            const s = getStudentStats(c, student.id);
                            const isAtRisk =
                              (s.macAvg !== null && s.macAvg < 10) ||
                              (s.pct !== null && s.pct < 75);
                            return (
                              <View
                                key={student.id}
                                style={[
                                  styles.tableRow,
                                  i % 2 === 0 && styles.tableRowAlt,
                                  isAtRisk && styles.tableRowAtRisk,
                                ]}
                              >
                                <Text
                                  style={[styles.tableCell, styles.tableCellName]}
                                  numberOfLines={1}
                                >
                                  {student.nome}
                                </Text>
                                <Text
                                  style={[
                                    styles.tableCell,
                                    s.macAvg !== null && s.macAvg < 10 && { color: Colors.error },
                                  ]}
                                >
                                  {s.macAvg !== null ? s.macAvg : "—"}
                                </Text>
                                <Text style={styles.tableCell}>
                                  {s.grade?.npt !== null && s.grade?.npt !== undefined
                                    ? s.grade.npt
                                    : "—"}
                                </Text>
                                <Text
                                  style={[
                                    styles.tableCell,
                                    s.nf !== null && s.nf >= 10 && { color: Colors.success },
                                    s.nf !== null && s.nf < 10 && { color: Colors.error },
                                  ]}
                                >
                                  {s.nf !== null ? s.nf : "—"}
                                </Text>
                                <Text
                                  style={[
                                    styles.tableCell,
                                    s.faltas > 0 && { color: Colors.warning },
                                  ]}
                                >
                                  {s.faltas}
                                </Text>
                                <Text
                                  style={[
                                    styles.tableCell,
                                    s.pct !== null && s.pct < 75 && { color: Colors.error },
                                    s.pct !== null && s.pct >= 75 && { color: Colors.success },
                                  ]}
                                >
                                  {s.pct !== null ? `${s.pct}%` : "—"}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Alertas ── */}
            {(atRiskStudents.length > 0 || criticalAbsences.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Alertas Pedagógicos</Text>

                {atRiskStudents.length > 0 && (
                  <View style={[styles.alertCard, { borderLeftColor: Colors.error }]}>
                    <View style={styles.alertHeader}>
                      <Icon name="alert-triangle" size={16} color={Colors.error} />
                      <Text style={[styles.alertTitle, { color: Colors.error }]}>
                        Notas abaixo de 10 ({atRiskStudents.length})
                      </Text>
                    </View>
                    {atRiskStudents.map((s, i) => (
                      <View key={i} style={styles.alertRow}>
                        <Text style={styles.alertName}>{s.nome}</Text>
                        <Text style={styles.alertMeta}>{s.turma}</Text>
                        <View style={styles.alertBadge}>
                          <Text style={[styles.alertBadgeText, { color: Colors.error }]}>
                            {s.macAvg}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {criticalAbsences.length > 0 && (
                  <View style={[styles.alertCard, { borderLeftColor: Colors.warning }]}>
                    <View style={styles.alertHeader}>
                      <Icon name="alert-circle" size={16} color={Colors.warning} />
                      <Text style={[styles.alertTitle, { color: Colors.warning }]}>
                        Frequência crítica &lt;75% ({criticalAbsences.length})
                      </Text>
                    </View>
                    {criticalAbsences.map((s, i) => (
                      <View key={i} style={styles.alertRow}>
                        <Text style={styles.alertName}>{s.nome}</Text>
                        <Text style={styles.alertMeta}>{s.turma}</Text>
                        <View style={[styles.alertBadge, { backgroundColor: Colors.warning + "20" }]}>
                          <Text style={[styles.alertBadgeText, { color: Colors.warning }]}>
                            {s.pct}%
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <ExportMenu
        visible={!!exportTarget && exportTarget.type === "pauta"}
        title="Pauta Completa — Todos os Períodos"
        subtitle={exportTarget ? `${exportTarget.turma.designacao} · ${exportTarget.turma.disciplina}` : undefined}
        onClose={() => setExportTarget(null)}
        onPdf={handleExportPautaPdf}
        onExcel={handleExportPautaExcel}
      />
      <ExportMenu
        visible={!!exportTarget && exportTarget.type === "attendance"}
        title="Mapa de Presenças — Todos os Períodos"
        subtitle={exportTarget ? `${exportTarget.turma.designacao} · ${exportTarget.turma.disciplina}` : undefined}
        onClose={() => setExportTarget(null)}
        onPdf={handleExportAttendancePdf}
        onExcel={handleExportAttendanceExcel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: "rgba(15,23,42,0.7)",
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { alignItems: "center", gap: 4 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  periodTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(52,211,153,0.12)", borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: "rgba(52,211,153,0.25)",
  },
  periodTagText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#34D399" },

  content: { padding: 16, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, paddingHorizontal: 4 },

  emptyBox: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 8 },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center" },

  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: {
    width: "30%" as any, flexGrow: 1, minWidth: 96,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    alignItems: "center", gap: 4, borderWidth: 1, overflow: "hidden",
  },
  metricGrad: { ...StyleSheet.absoluteFillObject, borderRadius: 14 },
  metricValue: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  metricLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, textAlign: "center" },

  classCard: {
    backgroundColor: Colors.surface, borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.border,
  },
  classCardHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, paddingBottom: 8,
  },
  classCardTitle: { flex: 1, gap: 2 },
  classCardActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardExportBtn: {
    width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  classCardName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  classCardDisciplina: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },

  classMetaRow: {
    flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingBottom: 10,
  },
  classMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  classMetaText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },

  classExportRow: {
    flexDirection: "row", alignItems: "center",
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  classExportBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10,
  },
  classExportBtnText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  classStatsRow: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  classStatBox: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 3 },
  classStatDivider: { width: 1, backgroundColor: Colors.borderLight, marginVertical: 8 },
  classStatLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  classStatValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },

  studentTable: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  tableHeader: {
    flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tableHeaderText: {
    fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textMuted,
    textAlign: "center", width: 44,
  },
  tableRow: {
    flexDirection: "row", paddingHorizontal: 12, paddingVertical: 9,
    alignItems: "center",
  },
  tableRowAlt: { backgroundColor: "rgba(255,255,255,0.02)" },
  tableRowAtRisk: { backgroundColor: "rgba(239,68,68,0.04)" },
  tableCell: {
    fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.text,
    textAlign: "center", width: 44,
  },
  tableCellName: {
    flex: 1, textAlign: "left", width: "auto" as any,
    fontFamily: "Inter_500Medium", fontSize: 12,
  },

  alertCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderLeftWidth: 3,
    borderTopColor: Colors.border, borderRightColor: Colors.border, borderBottomColor: Colors.border,
    gap: 10,
  },
  alertHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  alertRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingLeft: 24,
  },
  alertName: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text },
  alertMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  alertBadge: {
    backgroundColor: Colors.error + "20", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  alertBadgeText: { fontFamily: "Inter_700Bold", fontSize: 12 },
});
