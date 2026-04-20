import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
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

export default function AttendanceMarkScreen() {
  const { turmaId } = useLocalSearchParams<{ turmaId: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null);
  const [attendance, setAttendanceState] = useState<Map<string, boolean>>(new Map());
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
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
          <Ionicons
            name={isPresent ? "checkmark" : "close"}
            size={18}
            color={isPresent ? "#fff" : "#fff"}
          />
        </View>
      </Pressable>
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
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{classGroup.designacao}</Text>
          <Text style={styles.headerSubtitle}>{today}</Text>
        </View>
        <Pressable onPress={handleSave} style={({ pressed }) => [styles.saveHeaderBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Feather name="check" size={20} color={Colors.success} />
        </Pressable>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: Colors.success }]} />
          <Text style={styles.statItemText}>Presentes: {presentCount}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: Colors.error }]} />
          <Text style={styles.statItemText}>Ausentes: {absentCount}</Text>
        </View>
      </View>

      <FlatList
        data={sortedStudents}
        keyExtractor={(item) => item.id}
        renderItem={renderStudent}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
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
  headerCenter: { alignItems: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  headerSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  saveHeaderBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(52,211,153,0.15)" },
  statsBar: {
    flexDirection: "row", justifyContent: "center", gap: 24,
    paddingVertical: 12, backgroundColor: "rgba(15,23,42,0.5)",
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statItemText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  list: { padding: 20, gap: 8 },
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
});
