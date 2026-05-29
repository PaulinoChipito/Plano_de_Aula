import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  SectionList,
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
  ClassGroup,
  Student,
  AttendanceRecord,
} from "@/lib/storage";

type Tab = "hoje" | "historico";

function formatDateLabel(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function AttendanceMarkScreen() {
  const { turmaId } = useLocalSearchParams<{ turmaId: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [activeTab, setActiveTab] = useState<Tab>("hoje");
  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null);
  const [attendance, setAttendanceState] = useState<Map<string, boolean>>(new Map());
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(() => {
    Promise.all([getClasses(), getAttendance()]).then(([classes, records]) => {
      const found = classes.find((c) => c.id === turmaId);
      if (found) {
        setClassGroup(found);
        const todayRecord = records.find(
          (r) => r.turmaId === turmaId && r.data === today,
        );
        const map = new Map<string, boolean>();
        found.alunos.forEach((a) => {
          const existing = todayRecord?.registos.find((r) => r.alunoId === a.id);
          map.set(a.id, existing ? existing.presente : true);
        });
        setAttendanceState(map);
        setAllRecords(records.filter((r) => r.turmaId === turmaId));
      }
    });
  }, [turmaId]);

  useEffect(() => { load(); }, [load]);

  const toggleAttendance = (alunoId: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAttendanceState((prev) => {
      const next = new Map(prev);
      next.set(alunoId, !next.get(alunoId));
      return next;
    });
  };

  const handleSave = async () => {
    if (!classGroup) return;
    const record: AttendanceRecord = {
      turmaId: turmaId!,
      data: today,
      registos: classGroup.alunos.map((a) => ({
        alunoId: a.id,
        presente: attendance.get(a.id) ?? true,
      })),
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

  const getStudentStats = (alunoId: string) => {
    const records = allRecords.filter((r) =>
      r.registos.some((reg) => reg.alunoId === alunoId),
    );
    const total = records.length;
    const present = records.filter((r) =>
      r.registos.find((reg) => reg.alunoId === alunoId && reg.presente),
    ).length;
    return { total, present, pct: total > 0 ? Math.round((present / total) * 100) : 0 };
  };

  const pastRecords = allRecords
    .filter((r) => r.data !== today)
    .sort((a, b) => b.data.localeCompare(a.data));

  const renderStudent = ({ item, index }: { item: Student; index: number }) => {
    const isPresent = attendance.get(item.id) ?? true;
    const stats = getStudentStats(item.id);

    return (
      <Pressable
        onPress={() => toggleAttendance(item.id)}
        style={({ pressed }) => [
          styles.studentCard,
          { opacity: pressed ? 0.95 : 1 },
          !isPresent && styles.studentCardAbsent,
        ]}
      >
        <View style={styles.studentNum}>
          <Text style={styles.studentNumText}>{index + 1}</Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={[styles.studentName, !isPresent && styles.studentNameAbsent]}>
            {item.nome}
          </Text>
          {stats.total > 0 && (
            <Text style={styles.studentStats}>
              {stats.pct}% freq. ({stats.present}/{stats.total})
            </Text>
          )}
        </View>
        <View style={[styles.toggleBtn, isPresent ? styles.togglePresent : styles.toggleAbsent]}>
          <Icon name={isPresent ? "checkmark" : "close"} size={18} color="#fff" />
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
              <Text style={styles.historyDateLabel}>{formatDateLabel(record.data)}</Text>
              <Text style={styles.historyDateSub}>{record.data}</Text>
            </View>
          </View>
          <View style={styles.historyBadgeRow}>
            <View style={[styles.historyBadge, { backgroundColor: Colors.success + "20" }]}>
              <Text style={[styles.historyBadgeText, { color: Colors.success }]}>
                P: {presentRegistos.length}
              </Text>
            </View>
            <View style={[styles.historyBadge, { backgroundColor: Colors.error + "20" }]}>
              <Text style={[styles.historyBadgeText, { color: Colors.error }]}>
                F: {absentRegistos.length}
              </Text>
            </View>
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
            {absentRegistos.length > 0 && (
              <View style={styles.historyGroup}>
                <Text style={styles.historyGroupTitle}>
                  <Icon name="close" size={12} color={Colors.error} /> Faltas ({absentRegistos.length})
                </Text>
                {absentRegistos.map((r) => (
                  <View key={r.alunoId} style={styles.historyRow}>
                    <View style={[styles.historyDot, { backgroundColor: Colors.error }]} />
                    <Text style={styles.historyRowName}>{getStudentName(r.alunoId)}</Text>
                  </View>
                ))}
              </View>
            )}
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
        </View>
        {activeTab === "hoje" ? (
          <Pressable onPress={handleSave} style={({ pressed }) => [styles.saveHeaderBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Icon name="check" size={20} color={Colors.success} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab("hoje")}
          style={[styles.tab, activeTab === "hoje" && styles.tabActive]}
        >
          <Icon name="checkmark-circle" size={15} color={activeTab === "hoje" ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === "hoje" && styles.tabTextActive]}>
            Hoje
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("historico")}
          style={[styles.tab, activeTab === "historico" && styles.tabActive]}
        >
          <Icon name="time" size={15} color={activeTab === "historico" ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === "historico" && styles.tabTextActive]}>
            Histórico {pastRecords.length > 0 ? `(${pastRecords.length})` : ""}
          </Text>
        </Pressable>
      </View>

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
              <Text style={styles.emptyHistoryTitle}>Sem histórico</Text>
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
  studentNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary + "12", alignItems: "center", justifyContent: "center" },
  studentNumText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.primary },
  studentInfo: { flex: 1 },
  studentName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  studentNameAbsent: { color: Colors.textMuted },
  studentStats: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  toggleBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  togglePresent: { backgroundColor: Colors.success },
  toggleAbsent: { backgroundColor: Colors.error },
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
  historyRowName: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text },
  historyHeader2: { marginBottom: 4, paddingHorizontal: 4 },
  historyHeader2Text: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
  emptyHistory: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyHistoryTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 8 },
  emptyHistorySubtitle: {
    fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary,
    textAlign: "center", paddingHorizontal: 32,
  },
});
