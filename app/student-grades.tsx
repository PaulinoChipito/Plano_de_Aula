import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  TextInput,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  getClasses,
  getGrades,
  saveGrade,
  generateId,
  ClassGroup,
  Student,
  StudentGrade,
  GradeEntry,
} from "@/lib/storage";

export default function StudentGradesScreen() {
  const { turmaId } = useLocalSearchParams<{ turmaId: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newMacNota, setNewMacNota] = useState("");
  const [nptValue, setNptValue] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    Promise.all([getClasses(), getGrades()]).then(([classes, allGrades]) => {
      const found = classes.find((c) => c.id === turmaId);
      if (found) setClassGroup(found);
      setGrades(allGrades.filter((g) => g.turmaId === turmaId));
    });
  }, [turmaId]);

  const getStudentGrade = (alunoId: string): StudentGrade | undefined => {
    return grades.find((g) => g.alunoId === alunoId);
  };

  const getMacAverage = (mac: GradeEntry[]): number => {
    if (mac.length === 0) return 0;
    const sum = mac.reduce((acc, e) => acc + e.nota, 0);
    return Math.round((sum / mac.length) * 10) / 10;
  };

  const openGradeModal = (student: Student) => {
    setSelectedStudent(student);
    const grade = getStudentGrade(student.id);
    if (grade) {
      setNptValue(grade.npt !== null ? String(grade.npt) : "");
      setObservacao(grade.observacao || "");
    } else {
      setNptValue("");
      setObservacao("");
    }
    setNewMacNota("");
    setShowModal(true);
  };

  const handleAddMac = async () => {
    if (!selectedStudent || !newMacNota.trim()) return;
    const nota = parseFloat(newMacNota);
    if (isNaN(nota) || nota < 0 || nota > 20) {
      Alert.alert("Nota invalida", "A nota deve estar entre 0 e 20.");
      return;
    }

    const existing = getStudentGrade(selectedStudent.id);
    const newEntry: GradeEntry = {
      id: generateId(),
      nota,
      data: new Date().toISOString(),
    };

    const updatedGrade: StudentGrade = {
      alunoId: selectedStudent.id,
      turmaId: turmaId!,
      mac: existing ? [...existing.mac, newEntry] : [newEntry],
      npt: existing?.npt ?? null,
      observacao: existing?.observacao || "",
    };

    await saveGrade(updatedGrade);
    setGrades((prev) => {
      const idx = prev.findIndex((g) => g.alunoId === selectedStudent.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedGrade;
        return copy;
      }
      return [...prev, updatedGrade];
    });
    setNewMacNota("");
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveNptObs = async () => {
    if (!selectedStudent) return;
    const existing = getStudentGrade(selectedStudent.id);
    const npt = nptValue.trim() ? parseFloat(nptValue) : null;

    const updatedGrade: StudentGrade = {
      alunoId: selectedStudent.id,
      turmaId: turmaId!,
      mac: existing?.mac || [],
      npt: npt !== null && !isNaN(npt) ? npt : null,
      observacao: observacao.trim(),
    };

    await saveGrade(updatedGrade);
    setGrades((prev) => {
      const idx = prev.findIndex((g) => g.alunoId === selectedStudent.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedGrade;
        return copy;
      }
      return [...prev, updatedGrade];
    });
    setShowModal(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const sortedStudents = classGroup
    ? [...classGroup.alunos].sort((a, b) => a.nome.localeCompare(b.nome))
    : [];

  const selectedGrade = selectedStudent ? getStudentGrade(selectedStudent.id) : undefined;

  const renderStudent = ({ item, index }: { item: Student; index: number }) => {
    const grade = getStudentGrade(item.id);
    const macAvg = grade ? getMacAverage(grade.mac) : null;

    return (
      <Pressable
        onPress={() => openGradeModal(item)}
        style={({ pressed }) => [styles.studentCard, { opacity: pressed ? 0.95 : 1 }]}
      >
        <View style={styles.studentNum}>
          <Text style={styles.studentNumText}>{index + 1}</Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.nome}</Text>
        </View>
        <View style={styles.gradeInfo}>
          {macAvg !== null && (
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeLabel}>MAC</Text>
              <Text style={styles.gradeValue}>{macAvg}</Text>
            </View>
          )}
          {grade?.npt !== null && grade?.npt !== undefined && (
            <View style={[styles.gradeBadge, styles.nptBadge]}>
              <Text style={[styles.gradeLabel, { color: "#6366F1" }]}>NPT</Text>
              <Text style={[styles.gradeValue, { color: "#6366F1" }]}>{grade.npt}</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </Pressable>
    );
  };

  if (!classGroup) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{classGroup.designacao}</Text>
          <Text style={styles.headerSubtitle}>Avaliacoes</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={sortedStudents}
        keyExtractor={(item) => item.id}
        renderItem={renderStudent}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="users" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Sem alunos</Text>
          </View>
        }
      />

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{selectedStudent?.nome}</Text>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>MAC (Media Avaliacoes Continuas)</Text>
                {selectedGrade && selectedGrade.mac.length > 0 && (
                  <View style={styles.macHistory}>
                    {selectedGrade.mac.map((entry, i) => (
                      <View key={entry.id} style={styles.macEntry}>
                        <Text style={styles.macEntryNum}>AC{i + 1}</Text>
                        <Text style={styles.macEntryValue}>{entry.nota}</Text>
                      </View>
                    ))}
                    <View style={[styles.macEntry, styles.macAvgEntry]}>
                      <Text style={[styles.macEntryNum, { color: Colors.primary }]}>Media</Text>
                      <Text style={[styles.macEntryValue, { color: Colors.primary, fontFamily: "Inter_700Bold" as const }]}>
                        {getMacAverage(selectedGrade.mac)}
                      </Text>
                    </View>
                  </View>
                )}
                <View style={styles.addMacRow}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    placeholder="Nova nota (0-20)"
                    placeholderTextColor={Colors.textMuted}
                    value={newMacNota}
                    onChangeText={setNewMacNota}
                    keyboardType="numeric"
                  />
                  <Pressable onPress={handleAddMac} style={({ pressed }) => [styles.addMacBtn, { opacity: pressed ? 0.9 : 1 }]}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>NPT (Nota Prova Trimestral)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Nota NPT (0-20)"
                  placeholderTextColor={Colors.textMuted}
                  value={nptValue}
                  onChangeText={setNptValue}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Observacao</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: 60, textAlignVertical: "top" }]}
                  placeholder="Notas sobre o aluno..."
                  placeholderTextColor={Colors.textMuted}
                  value={observacao}
                  onChangeText={setObservacao}
                  multiline
                />
              </View>

              <Pressable onPress={handleSaveNptObs} style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.9 : 1 }]}>
                <Text style={styles.saveBtnText}>Guardar</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  headerCenter: { alignItems: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  headerSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  list: { padding: 20, gap: 10 },
  studentCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  studentNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F59E0B15", alignItems: "center", justifyContent: "center" },
  studentNumText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#D97706" },
  studentInfo: { flex: 1 },
  studentName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  gradeInfo: { flexDirection: "row", gap: 6 },
  gradeBadge: { backgroundColor: Colors.primary + "12", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignItems: "center" },
  nptBadge: { backgroundColor: "#6366F112" },
  gradeLabel: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.primary },
  gradeValue: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.primary },
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", paddingHorizontal: 24 },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, maxHeight: "80%" },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text, marginBottom: 16 },
  modalSection: { marginBottom: 20 },
  modalSectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 8 },
  macHistory: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  macEntry: { backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
  macAvgEntry: { backgroundColor: Colors.primary + "12" },
  macEntryNum: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary },
  macEntryValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  addMacRow: { flexDirection: "row", gap: 10 },
  modalInput: {
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text,
  },
  addMacBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
