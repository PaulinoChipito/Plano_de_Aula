import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  getClasses,
  getAttendance,
  saveAttendance,
  saveClass,
  ClassGroup,
  Student,
  AttendanceRecord,
} from "@/lib/storage";
import { usePeriod } from "@/lib/periodContext";
import { useYear } from "@/lib/yearContext";
import { useLanguage } from "@/lib/i18n";

type Tab = "hoje" | "historico";

function formatDateLabel(isoDate: string, locale = "pt-PT"): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

export default function AttendanceMarkScreen() {
  const { turmaId } = useLocalSearchParams<{ turmaId: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [activeTab, setActiveTab] = useState<Tab>("hoje");
  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null);
  const [attendance, setAttendanceState] = useState<Map<string, boolean>>(new Map());
  const [justificadas, setJustificadas] = useState<Set<string>>(new Set());
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInput, setLimitInput] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const { currentPeriod, currentPeriodLabel } = usePeriod();
  const { currentYear, years } = useYear();
  const defaultYear = years[0] ?? "";
  const { lang, tr } = useLanguage();
  const localeMap: Record<string, string> = { pt: "pt-PT", en: "en-GB", fr: "fr-FR" };
  const dateLocale = localeMap[lang] ?? "pt-PT";

  const load = useCallback(() => {
    Promise.all([getClasses(), getAttendance()]).then(([classes, records]) => {
      const found = classes.find((c) => c.id === turmaId);
      if (found) {
        setClassGroup(found);
        const periodRecords = records.filter(
          (r) => r.turmaId === turmaId && (r.anoLectivo ?? defaultYear) === currentYear && (r.periodo ?? "I") === currentPeriod,
        );
        const todayRecord = periodRecords.find((r) => r.data === today);
        const map = new Map<string, boolean>();
        const justSet = new Set<string>();
        found.alunos.forEach((a) => {
          const existing = todayRecord?.registos.find((r) => r.alunoId === a.id);
          map.set(a.id, existing ? existing.presente : true);
          if (existing && !existing.presente && existing.justificada) justSet.add(a.id);
        });
        setAttendanceState(map);
        setJustificadas(justSet);
        setAllRecords(periodRecords);
      }
    });
  }, [turmaId, currentPeriod]);

  useEffect(() => { load(); }, [load]);

  const toggleAttendance = (alunoId: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAttendanceState((prev) => {
      const next = new Map(prev);
      next.set(alunoId, !next.get(alunoId));
      return next;
    });
  };

  const toggleJustificada = (alunoId: string) => {
    const isAbsent = !(attendance.get(alunoId) ?? true);
    if (!isAbsent) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJustificadas((prev) => {
      const next = new Set(prev);
      if (next.has(alunoId)) next.delete(alunoId);
      else next.add(alunoId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!classGroup) return;
    const record: AttendanceRecord = {
      turmaId: turmaId!,
      data: today,
      registos: classGroup.alunos.map((a) => {
        const presente = attendance.get(a.id) ?? true;
        return {
          alunoId: a.id,
          presente,
          justificada: !presente && justificadas.has(a.id) ? true : undefined,
        };
      }),
      periodo: currentPeriod,
      anoLectivo: currentYear,
    };
    await saveAttendance(record);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    load();
    router.back();
  };

  const sortedStudents = classGroup
    ? [...classGroup.alunos].sort((a, b) => a.nome.localeCompare(b.nome))
    : [];

  const presentCount = Array.from(attendance.values()).filter(Boolean).length;
  const absentCount = attendance.size - presentCount;
  const faltasLimite = classGroup?.faltasLimite ?? null;

  const handleSaveLimit = async () => {
    if (!classGroup) return;
    const val = parseInt(limitInput.trim(), 10);
    const updated = { ...classGroup, faltasLimite: isNaN(val) || val <= 0 ? undefined : val };
    await saveClass(updated);
    setClassGroup(updated);
    setShowLimitModal(false);
  };

  const openLimitModal = () => {
    setLimitInput(faltasLimite !== null ? String(faltasLimite) : "");
    setShowLimitModal(true);
  };

  const getStudentStats = (alunoId: string) => {
    const records = allRecords.filter((r) =>
      r.registos.some((reg) => reg.alunoId === alunoId),
    );
    const total = records.length;
    const present = records.filter((r) =>
      r.registos.find((reg) => reg.alunoId === alunoId && reg.presente),
    ).length;
    const faltas = total - present;
    const reprovado = faltasLimite !== null && faltas > faltasLimite;
    return { total, present, faltas, pct: total > 0 ? Math.round((present / total) * 100) : 0, reprovado };
  };

  const pastRecords = allRecords
    .filter((r) => r.data !== today)
    .sort((a, b) => b.data.localeCompare(a.data));

  const renderStudent = ({ item, index }: { item: Student; index: number }) => {
    const isPresent = attendance.get(item.id) ?? true;
    const isJustificada = !isPresent && justificadas.has(item.id);
    const stats = getStudentStats(item.id);

    return (
      <Pressable
        onPress={() => toggleAttendance(item.id)}
        onLongPress={() => toggleJustificada(item.id)}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.studentCard,
          { opacity: pressed ? 0.95 : 1 },
          !isPresent && (isJustificada ? styles.studentCardJustificada : styles.studentCardAbsent),
          stats.reprovado && styles.studentCardReprovado,
        ]}
      >
        <View style={styles.studentNum}>
          <Text style={styles.studentNumText}>{index + 1}</Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={[styles.studentName, !isPresent && styles.studentNameAbsent]}>
            {item.nome}
          </Text>
          {!isPresent && isJustificada && (
            <View style={styles.justificadaBadge}>
              <Text style={styles.justificadaBadgeText}>{tr.justifiedAbsence}</Text>
            </View>
          )}
          {stats.total > 0 && (
            <Text style={styles.studentStats}>
              {stats.pct}% freq. · {stats.faltas} falta{stats.faltas !== 1 ? "s" : ""}
              {faltasLimite !== null ? ` / lim. ${faltasLimite}` : ""}
            </Text>
          )}
          {stats.reprovado && (
            <View style={styles.reprovadoBadge}>
              <Icon name="warning" size={10} color="#fff" />
              <Text style={styles.reprovadoBadgeText}>{tr.failedDueToAbsences}</Text>
            </View>
          )}
        </View>
        <View style={[styles.toggleBtn, isPresent ? styles.togglePresent : isJustificada ? styles.toggleJustificada : styles.toggleAbsent]}>
          <Text style={styles.toggleBtnText}>{isPresent ? "P" : isJustificada ? "FJ" : "F"}</Text>
        </View>
      </Pressable>
    );
  };

  const renderHistoryRecord = ({ item: record }: { item: AttendanceRecord }) => {
    const isExpanded = expandedDate === record.data;
    const presentRegistos = record.registos.filter((r) => r.presente);
    const absentRegistos = record.registos.filter((r) => !r.presente);
    const total = record.registos.length;
    const pct = total > 0 ? Math.round((presentRegistos.length / total) * 100) : 0;

    const getStudentName = (alunoId: string) =>
      classGroup?.alunos.find((a) => a.id === alunoId)?.nome ?? alunoId;

    return (
      <View style={styles.historyCard}>
        <Pressable
          onPress={() => setExpandedDate(isExpanded ? null : record.data)}
          style={({ pressed }) => [styles.historyHeader, { opacity: pressed ? 0.8 : 1 }]}
        >
          <View style={styles.historyDateRow}>
            <View style={styles.historyDateIcon}>
              <Icon name="calendar" size={14} color={Colors.primary} />
            </View>
            <View style={styles.historyDateInfo}>
              <Text style={styles.historyDateLabel}>{formatDateLabel(record.data, dateLocale)}</Text>
              <Text style={styles.historyDateSub}>{record.data}</Text>
            </View>
          </View>
          <View style={styles.historyBadgeRow}>
            <View style={[styles.historyBadge, { backgroundColor: Colors.success + "20" }]}>
              <Text style={[styles.historyBadgeText, { color: Colors.success }]}>
                P: {presentRegistos.length}
              </Text>
            </View>
            {(() => {
              const justCount = absentRegistos.filter((r) => r.justificada).length;
              const unjustCount = absentRegistos.length - justCount;
              return (
                <>
                  {unjustCount > 0 && (
                    <View style={[styles.historyBadge, { backgroundColor: Colors.error + "20" }]}>
                      <Text style={[styles.historyBadgeText, { color: Colors.error }]}>F: {unjustCount}</Text>
                    </View>
                  )}
                  {justCount > 0 && (
                    <View style={[styles.historyBadge, { backgroundColor: "#F59E0B20" }]}>
                      <Text style={[styles.historyBadgeText, { color: "#F59E0B" }]}>FJ: {justCount}</Text>
                    </View>
                  )}
                </>
              );
            })()}
            <Text style={styles.historyPct}>{pct}%</Text>
            <Icon
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.textMuted}
            />
          </View>
        </Pressable>

        {isExpanded && (
          <View style={styles.historyDetail}>
            {absentRegistos.length > 0 && (() => {
              const justRegistos = absentRegistos.filter((r) => r.justificada);
              const unjustRegistos = absentRegistos.filter((r) => !r.justificada);
              return (
                <View style={styles.historyGroup}>
                  {unjustRegistos.length > 0 && (
                    <>
                      <Text style={styles.historyGroupTitle}>
                        Faltas ({unjustRegistos.length})
                      </Text>
                      {unjustRegistos.map((r) => (
                        <View key={r.alunoId} style={styles.historyRow}>
                          <View style={[styles.historyDot, { backgroundColor: Colors.error }]} />
                          <Text style={styles.historyRowName}>{getStudentName(r.alunoId)}</Text>
                        </View>
                      ))}
                    </>
                  )}
                  {justRegistos.length > 0 && (
                    <>
                      <Text style={[styles.historyGroupTitle, { color: "#F59E0B", marginTop: unjustRegistos.length > 0 ? 8 : 0 }]}>
                        Faltas Justificadas ({justRegistos.length})
                      </Text>
                      {justRegistos.map((r) => (
                        <View key={r.alunoId} style={styles.historyRow}>
                          <View style={[styles.historyDot, { backgroundColor: "#F59E0B" }]} />
                          <Text style={styles.historyRowName}>{getStudentName(r.alunoId)}</Text>
                          <View style={styles.fjBadge}><Text style={styles.fjBadgeText}>FJ</Text></View>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              );
            })()}
            {presentRegistos.length > 0 && (
              <View style={styles.historyGroup}>
                <Text style={styles.historyGroupTitle}>
                  <Icon name="checkmark" size={12} color={Colors.success} /> Presentes ({presentRegistos.length})
                </Text>
                {presentRegistos.map((r) => (
                  <View key={r.alunoId} style={styles.historyRow}>
                    <View style={[styles.historyDot, { backgroundColor: Colors.success }]} />
                    <Text style={styles.historyRowName}>{getStudentName(r.alunoId)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (!classGroup) return null;

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
          <Text style={styles.headerTitle}>{classGroup.designacao}</Text>
          <Text style={styles.headerSubtitle}>{classGroup.disciplina}</Text>
          {faltasLimite !== null && (
            <View style={styles.limitBadgeHeader}>
              <Icon name="warning" size={10} color="#FBBF24" />
              <Text style={styles.limitBadgeHeaderText}>Lim. {faltasLimite} faltas</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={openLimitModal} style={({ pressed }) => [styles.limitBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Icon name="settings" size={17} color={faltasLimite !== null ? "#FBBF24" : Colors.textMuted} />
          </Pressable>
          {activeTab === "hoje" ? (
            <Pressable onPress={handleSave} style={({ pressed }) => [styles.saveHeaderBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <Icon name="check" size={20} color={Colors.success} />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </View>

      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab("hoje")}
          style={[styles.tab, activeTab === "hoje" && styles.tabActive]}
        >
          <Icon name="checkmark-circle" size={15} color={activeTab === "hoje" ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === "hoje" && styles.tabTextActive]}>
            {tr.todayTab}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("historico")}
          style={[styles.tab, activeTab === "historico" && styles.tabActive]}
        >
          <Icon name="time" size={15} color={activeTab === "historico" ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === "historico" && styles.tabTextActive]}>
            {tr.historyTab}{pastRecords.length > 0 ? ` (${pastRecords.length})` : ""}
          </Text>
        </Pressable>
      </View>

      {/* Modal: Limite de faltas */}
      <Modal visible={showLimitModal} transparent animationType="fade" onRequestClose={() => setShowLimitModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.limitModalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowLimitModal(false)} />
          <View style={styles.limitModalContent}>
            <Text style={styles.limitModalTitle}>{tr.attendanceLimitTitle}</Text>
            <Text style={styles.limitModalSubtitle}>
              Alunos que ultrapassem este número de faltas serão marcados como reprovados por faltas.
            </Text>
            <TextInput
              style={styles.limitModalInput}
              value={limitInput}
              onChangeText={setLimitInput}
              placeholder="Ex: 10"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              autoFocus
            />
            {faltasLimite !== null && (
              <Pressable
                onPress={async () => {
                  if (!classGroup) return;
                  const updated = { ...classGroup, faltasLimite: undefined };
                  await saveClass(updated);
                  setClassGroup(updated);
                  setShowLimitModal(false);
                }}
                style={({ pressed }) => [styles.limitRemoveBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Icon name="trash-2" size={14} color={Colors.error} />
                <Text style={styles.limitRemoveBtnText}>Remover limite</Text>
              </Pressable>
            )}
            <View style={styles.limitModalBtnRow}>
              <Pressable
                onPress={() => setShowLimitModal(false)}
                style={({ pressed }) => [styles.limitCancelBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={styles.limitCancelBtnText}>{tr.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveLimit}
                disabled={!limitInput.trim()}
                style={({ pressed }) => [styles.limitSaveBtn, !limitInput.trim() && styles.limitSaveBtnDisabled, { opacity: pressed ? 0.9 : 1 }]}
              >
                <Icon name="check" size={16} color="#fff" />
                <Text style={styles.limitSaveBtnText}>{tr.save}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {activeTab === "hoje" ? (
        <>
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.statItemText}>Presentes: {presentCount}</Text>
            </View>
            <Text style={styles.statSep}>·</Text>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: Colors.error }]} />
              <Text style={styles.statItemText}>Ausentes: {absentCount}</Text>
            </View>
            <Text style={styles.statSep}>·</Text>
            <Text style={styles.statDate}>{today}</Text>
          </View>
          <FlatList
            data={sortedStudents}
            keyExtractor={(item) => item.id}
            renderItem={renderStudent}
            contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 20 }]}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <FlatList
          data={pastRecords}
          keyExtractor={(item) => item.data}
          renderItem={renderHistoryRecord}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyHistory}>
              <Icon name="time" size={44} color={Colors.textMuted} />
              <Text style={styles.emptyHistoryTitle}>{tr.noHistory}</Text>
              <Text style={styles.emptyHistorySubtitle}>
                As chamadas registadas aparecerão aqui por data
              </Text>
            </View>
          }
          ListHeaderComponent={
            pastRecords.length > 0 ? (
              <View style={styles.historyHeader2}>
                <Text style={styles.historyHeader2Text}>
                  {pastRecords.length} chamada{pastRecords.length !== 1 ? "s" : ""} registada{pastRecords.length !== 1 ? "s" : ""}
                </Text>
              </View>
            ) : null
          }
        />
      )}
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
  headerCenter: { alignItems: "center", flex: 1 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  headerSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  saveHeaderBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(52,211,153,0.15)" },
  tabBar: {
    flexDirection: "row", backgroundColor: "rgba(15,23,42,0.5)",
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  statsBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 10, backgroundColor: "rgba(15,23,42,0.4)",
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  statDot: { width: 7, height: 7, borderRadius: 4 },
  statItemText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  statSep: { color: Colors.border, fontSize: 14 },
  statDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  list: { padding: 16, gap: 8 },
  studentCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14, gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  studentCardAbsent: { backgroundColor: "rgba(248,113,113,0.1)", borderColor: "rgba(248,113,113,0.3)" },
  studentCardJustificada: { backgroundColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)" },
  studentNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary + "12", alignItems: "center", justifyContent: "center" },
  studentNumText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.primary },
  studentInfo: { flex: 1 },
  studentName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  studentNameAbsent: { color: Colors.textMuted },
  studentStats: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  toggleBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  togglePresent: { backgroundColor: Colors.success },
  toggleAbsent: { backgroundColor: Colors.error },
  toggleJustificada: { backgroundColor: "#F59E0B" },
  toggleBtnText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },
  justificadaBadge: {
    alignSelf: "flex-start", backgroundColor: "#F59E0B20",
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, marginTop: 2,
  },
  justificadaBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#F59E0B" },
  historyCard: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  historyHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 14, gap: 10,
  },
  historyDateRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  historyDateIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primary + "15",
    alignItems: "center", justifyContent: "center",
  },
  historyDateInfo: { flex: 1 },
  historyDateLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  historyDateSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  historyBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  historyBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  historyBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  historyPct: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary, minWidth: 36, textAlign: "right" },
  historyDetail: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    padding: 14, gap: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  historyGroup: { gap: 6 },
  historyGroupTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 12,
    color: Colors.textSecondary, marginBottom: 2,
    textTransform: "uppercase", letterSpacing: 0.4,
  },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  historyDot: { width: 6, height: 6, borderRadius: 3 },
  historyRowName: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text, flex: 1 },
  fjBadge: { backgroundColor: "#F59E0B20", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  fjBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#F59E0B" },
  historyHeader2: { marginBottom: 4, paddingHorizontal: 4 },
  historyHeader2Text: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
  emptyHistory: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyHistoryTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 8 },
  emptyHistorySubtitle: {
    fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary,
    textAlign: "center", paddingHorizontal: 32,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  limitBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    borderRadius: 10,
  },
  limitBadgeHeader: {
    flexDirection: "row", alignItems: "center", gap: 3,
    marginTop: 3,
  },
  limitBadgeHeaderText: {
    fontFamily: "Inter_500Medium", fontSize: 11, color: "#FBBF24",
  },
  studentCardReprovado: {
    backgroundColor: "rgba(251,191,36,0.08)",
    borderColor: "rgba(251,191,36,0.35)",
  },
  reprovadoBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginTop: 4, backgroundColor: "#DC2626", borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start",
  },
  reprovadoBadgeText: {
    fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#fff",
  },
  limitModalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center", paddingHorizontal: 24,
  },
  limitModalContent: {
    backgroundColor: Colors.modalBg, borderRadius: 20, padding: 24, gap: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  limitModalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  limitModalSubtitle: {
    fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19,
  },
  limitModalInput: {
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_500Medium",
    fontSize: 18, color: Colors.text, textAlign: "center",
  },
  limitRemoveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.error + "30", backgroundColor: Colors.error + "08",
  },
  limitRemoveBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.error },
  limitModalBtnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  limitCancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center",
    borderWidth: 1, borderColor: Colors.border, backgroundColor: "rgba(255,255,255,0.05)",
  },
  limitCancelBtnText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textSecondary },
  limitSaveBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13,
  },
  limitSaveBtnDisabled: { backgroundColor: Colors.textMuted + "60" },
  limitSaveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
