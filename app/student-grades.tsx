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
import Icon from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
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
import { getMacAverage, getNotaFinal, MAC_PESO, NPT_PESO } from "@/lib/gradeUtils";
import { usePeriod } from "@/lib/periodContext";

export default function StudentGradesScreen() {
  const { turmaId, alunoId: autoAlunoId } = useLocalSearchParams<{ turmaId: string; alunoId?: string }>();
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
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryValue, setEditingEntryValue] = useState("");

  const { currentPeriod } = usePeriod();

  useEffect(() => {
    Promise.all([getClasses(), getGrades()]).then(([classes, allGrades]) => {
      const found = classes.find((c) => c.id === turmaId);
      if (found) {
        setClassGroup(found);
        if (autoAlunoId) {
          const targetStudent = found.alunos.find((a) => a.id === autoAlunoId);
          if (targetStudent) {
            const existingGrade = allGrades.find(
              (g) => g.alunoId === autoAlunoId && g.turmaId === turmaId && (g.periodo ?? "I") === currentPeriod,
            );
            setNptValue(existingGrade?.npt !== null && existingGrade?.npt !== undefined ? String(existingGrade.npt) : "");
            setObservacao(existingGrade?.observacao || "");
            setNewMacNota("");
            setEditingEntryId(null);
            setSelectedStudent(targetStudent);
            setShowModal(true);
          }
        }
      }
      setGrades(
        allGrades.filter(
          (g) => g.turmaId === turmaId && (g.periodo ?? "I") === currentPeriod,
        ),
      );
    });
  }, [turmaId, currentPeriod, autoAlunoId]);

  const getStudentGrade = (alunoId: string): StudentGrade | undefined => {
    return grades.find((g) => g.alunoId === alunoId);
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
    setEditingEntryId(null);
    setShowModal(true);
  };

  const updateGradesState = (updatedGrade: StudentGrade) => {
    setGrades((prev) => {
      const idx = prev.findIndex((g) => g.alunoId === updatedGrade.alunoId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedGrade;
        return copy;
      }
      return [...prev, updatedGrade];
    });
  };

  const isPrimario = classGroup?.nivelEnsino === "Ensino Primário";
  const maxNota = isPrimario ? 10 : 20;

  const handleAddMac = async () => {
    if (!selectedStudent || !newMacNota.trim()) return;
    const notaStr = newMacNota.replace(",", ".");
    const nota = parseFloat(notaStr);
    if (isNaN(nota) || nota < 0 || nota > maxNota) {
      if (Platform.OS === "web") {
        window.alert(`Nota inválida. Deve estar entre 0 e ${maxNota}.`);
      } else {
        Alert.alert("Nota inválida", `A nota deve estar entre 0 e ${maxNota}.`);
      }
      return;
    }

    const existing = getStudentGrade(selectedStudent.id);
    const newEntry: GradeEntry = {
      id: generateId(),
      nota: Math.round(nota * 10) / 10,
      data: new Date().toISOString(),
    };

    const updatedGrade: StudentGrade = {
      alunoId: selectedStudent.id,
      turmaId: turmaId!,
      mac: existing ? [...existing.mac, newEntry] : [newEntry],
      npt: existing?.npt ?? null,
      observacao: existing?.observacao || "",
      periodo: currentPeriod,
    };

    try {
      await saveGrade(updatedGrade);
      updateGradesState(updatedGrade);
      setNewMacNota("");
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      if (Platform.OS === "web") {
        window.alert("Erro ao guardar a nota. Tente novamente.");
      } else {
        Alert.alert("Erro", "Não foi possível guardar a nota.");
      }
    }
  };

  const handleEditMac = (entry: GradeEntry) => {
    setEditingEntryId(entry.id);
    setEditingEntryValue(String(entry.nota));
  };

  const handleSaveEditMac = async () => {
    if (!selectedStudent || !editingEntryId) return;
    const nota = parseFloat(editingEntryValue.replace(",", "."));
    if (isNaN(nota) || nota < 0 || nota > maxNota) {
      if (Platform.OS === "web") {
        window.alert(`Nota inválida. Deve estar entre 0 e ${maxNota}.`);
      } else {
        Alert.alert("Nota inválida", `A nota deve estar entre 0 e ${maxNota}.`);
      }
      return;
    }

    const existing = getStudentGrade(selectedStudent.id);
    if (!existing) return;

    const roundedNota = Math.round(nota * 10) / 10;
    const updatedGrade: StudentGrade = {
      ...existing,
      mac: existing.mac.map((e) =>
        e.id === editingEntryId ? { ...e, nota: roundedNota } : e,
      ),
      periodo: currentPeriod,
    };

    try {
      await saveGrade(updatedGrade);
      updateGradesState(updatedGrade);
      setEditingEntryId(null);
      setEditingEntryValue("");
    } catch (e) {
      if (Platform.OS === "web") window.alert("Erro ao guardar. Tente novamente.");
      else Alert.alert("Erro", "Não foi possível guardar a nota.");
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteMac = (entryId: string) => {
    if (!selectedStudent) return;
    Alert.alert("Eliminar Nota", "Tem a certeza que deseja remover esta nota?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          const existing = getStudentGrade(selectedStudent.id);
          if (!existing) return;

          const updatedGrade: StudentGrade = {
            ...existing,
            mac: existing.mac.filter((e) => e.id !== entryId),
          };

          await saveGrade(updatedGrade);
          updateGradesState(updatedGrade);
        },
      },
    ]);
  };

  const handleSaveNptObs = async () => {
    if (!selectedStudent) return;
    const existing = getStudentGrade(selectedStudent.id);
    const npt = nptValue.trim() ? parseFloat(nptValue.replace(",", ".")) : null;

    if (npt !== null && (isNaN(npt) || npt < 0 || npt > maxNota)) {
      if (Platform.OS === "web") {
        window.alert(`NPT inválida. A nota deve estar entre 0 e ${maxNota}.`);
      } else {
        Alert.alert("NPT inválida", `A nota da prova trimestral deve estar entre 0 e ${maxNota}.`);
      }
      return;
    }

    const updatedGrade: StudentGrade = {
      alunoId: selectedStudent.id,
      turmaId: turmaId!,
      mac: existing?.mac || [],
      npt: npt !== null && !isNaN(npt) ? npt : null,
      observacao: observacao.trim(),
      periodo: currentPeriod,
    };

    try {
      await saveGrade(updatedGrade);
      updateGradesState(updatedGrade);
      setShowModal(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      if (Platform.OS === "web") window.alert("Erro ao guardar. Tente novamente.");
      else Alert.alert("Erro", "Não foi possível guardar.");
    }
  };

  const sortedStudents = classGroup
    ? [...classGroup.alunos].sort((a, b) => a.nome.localeCompare(b.nome))
    : [];

  const selectedGrade = selectedStudent ? getStudentGrade(selectedStudent.id) : undefined;
  const selectedNotaFinal = selectedGrade
    ? getNotaFinal(selectedGrade.mac, selectedGrade.npt)
    : null;

  const renderStudent = ({ item, index }: { item: Student; index: number }) => {
    const grade = getStudentGrade(item.id);
    const macAvg = grade ? getMacAverage(grade.mac) : null;
    const notaFinal = grade ? getNotaFinal(grade.mac, grade.npt) : null;

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
          {macAvg !== null && grade && grade.mac.length > 0 && (
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
          {notaFinal !== null && grade && (grade.mac.length > 0 || grade.npt !== null) && (
            <View style={[styles.gradeBadge, styles.nfBadge]}>
              <Text style={[styles.gradeLabel, { color: Colors.success }]}>NF</Text>
              <Text style={[styles.gradeValue, { color: Colors.success }]}>{notaFinal}</Text>
            </View>
          )}
        </View>
        <Icon name="chevron-forward" size={16} color={Colors.textMuted} />
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
          <Icon name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{classGroup.designacao}</Text>
          <Text style={styles.headerSubtitle}>Avaliações</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={sortedStudents}
        keyExtractor={(item) => item.id}
        renderItem={renderStudent}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.formulaNote}>
            <Icon name="info" size={13} color={Colors.textMuted} />
            <Text style={styles.formulaNoteText}>
              Nota Final = MAC × {MAC_PESO * 100}% + NPT × {NPT_PESO * 100}% (INIDE)
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="users" size={48} color={Colors.textMuted} />
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
                <Text style={styles.modalSectionTitle}>MAC — Médias de Avaliação Contínua</Text>
                {selectedGrade && selectedGrade.mac.length > 0 && (
                  <View style={styles.macHistory}>
                    {selectedGrade.mac.map((entry, i) => (
                      <Pressable
                        key={entry.id}
                        onPress={() => handleEditMac(entry)}
                        onLongPress={() => handleDeleteMac(entry.id)}
                        style={({ pressed }) => [
                          styles.macEntry,
                          editingEntryId === entry.id && styles.macEntryEditing,
                          { opacity: pressed ? 0.8 : 1 },
                        ]}
                      >
                        {editingEntryId === entry.id ? (
                          <View style={styles.macEditContainer}>
                            <TextInput
                              style={styles.macEditInput}
                              value={editingEntryValue}
                              onChangeText={setEditingEntryValue}
                              keyboardType="numeric"
                              autoFocus
                              selectTextOnFocus
                            />
                            <View style={styles.macEditButtons}>
                              <Pressable onPress={handleSaveEditMac} style={styles.macEditSave}>
                                <Icon name="checkmark" size={14} color={Colors.success} />
                              </Pressable>
                              <Pressable onPress={() => setEditingEntryId(null)} style={styles.macEditCancel}>
                                <Icon name="close" size={14} color={Colors.error} />
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <>
                            <Text style={styles.macEntryNum}>AC{i + 1}</Text>
                            <Text style={styles.macEntryValue}>{entry.nota}</Text>
                            <Icon name="edit-2" size={10} color={Colors.textMuted} />
                          </>
                        )}
                      </Pressable>
                    ))}
                    <View style={[styles.macEntry, styles.macAvgEntry]}>
                      <Text style={[styles.macEntryNum, { color: Colors.primary }]}>Média</Text>
                      <Text style={[styles.macEntryValue, { color: Colors.primary, fontFamily: "Inter_700Bold" as const }]}>
                        {getMacAverage(selectedGrade.mac)}
                      </Text>
                    </View>
                  </View>
                )}
                {selectedGrade && selectedGrade.mac.length > 0 && (
                  <Text style={styles.macHint}>Toque para editar, mantenha premido para eliminar</Text>
                )}
                <View style={styles.addMacRow}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    placeholder={`Nova nota (0–${maxNota})`}
                    placeholderTextColor={Colors.textMuted}
                    value={newMacNota}
                    onChangeText={setNewMacNota}
                    keyboardType="numeric"
                  />
                  <Pressable onPress={handleAddMac} style={({ pressed }) => [styles.addMacBtn, { opacity: pressed ? 0.9 : 1 }]}>
                    <Icon name="add" size={20} color="#fff" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>NPT — Nota da Prova Trimestral</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={`Nota NPT (0–${maxNota})`}
                  placeholderTextColor={Colors.textMuted}
                  value={nptValue}
                  onChangeText={setNptValue}
                  keyboardType="numeric"
                />
              </View>

              {selectedNotaFinal !== null && (
                <View style={styles.notaFinalBox}>
                  <Text style={styles.notaFinalLabel}>
                    Nota Final (MAC×{MAC_PESO * 100}% + NPT×{NPT_PESO * 100}%)
                  </Text>
                  <Text style={styles.notaFinalValue}>{selectedNotaFinal}</Text>
                </View>
              )}

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Observação</Text>
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
    paddingHorizontal: 16, paddingBottom: 16, backgroundColor: "rgba(15,23,42,0.7)",
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  headerSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  list: { padding: 20, gap: 10 },
  formulaNote: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 4,
  },
  formulaNoteText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, flex: 1 },
  studentCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  studentNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F59E0B15", alignItems: "center", justifyContent: "center" },
  studentNumText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#D97706" },
  studentInfo: { flex: 1 },
  studentName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  gradeInfo: { flexDirection: "row", gap: 5 },
  gradeBadge: { backgroundColor: Colors.primary + "12", paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, alignItems: "center" },
  nptBadge: { backgroundColor: "#6366F112" },
  nfBadge: { backgroundColor: Colors.success + "12" },
  gradeLabel: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.primary },
  gradeValue: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.primary },
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", paddingHorizontal: 24 },
  modalContent: { backgroundColor: Colors.modalBg, borderRadius: 20, padding: 24, maxHeight: "80%", borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text, marginBottom: 16 },
  modalSection: { marginBottom: 16 },
  modalSectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 8 },
  macHistory: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  macEntry: {
    backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: "center", minWidth: 52, gap: 2,
  },
  macEntryEditing: { borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primary + "08" },
  macEditContainer: { alignItems: "center", gap: 4 },
  macEditInput: {
    fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text,
    textAlign: "center", width: 50, paddingVertical: 2,
    borderBottomWidth: 1, borderBottomColor: Colors.primary,
  },
  macEditButtons: { flexDirection: "row", gap: 8 },
  macEditSave: { padding: 2 },
  macEditCancel: { padding: 2 },
  macAvgEntry: { backgroundColor: Colors.primary + "12" },
  macEntryNum: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary },
  macEntryValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  macHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, fontStyle: "italic" as const, marginBottom: 8 },
  addMacRow: { flexDirection: "row", gap: 10 },
  modalInput: {
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text,
  },
  addMacBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  notaFinalBox: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.success + "12", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.success + "30", marginBottom: 16,
  },
  notaFinalLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.success, flex: 1 },
  notaFinalValue: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.success },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
