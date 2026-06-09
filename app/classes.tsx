import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getClasses, saveClass, deleteClass, generateId, ClassGroup, getTeacherProfile, NIVEL_ENSINO_OPTIONS } from "@/lib/storage";
import ExportMenu from "@/components/ExportMenu";
import { exportPdfFromHtml, exportExcel } from "@/lib/exports";
import { studentsListHtml, studentsListExcel } from "@/lib/exportTemplates";

export default function ClassesScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newDesignacao, setNewDesignacao] = useState("");
  const [newDisciplina, setNewDisciplina] = useState("");
  const [newNivel, setNewNivel] = useState(NIVEL_ENSINO_OPTIONS[1]);
  const [exportTarget, setExportTarget] = useState<ClassGroup | null>(null);

  useFocusEffect(
    useCallback(() => {
      getClasses().then(setClasses);
    }, []),
  );

  const handleCreate = async () => {
    if (!newDesignacao.trim() || !newDisciplina.trim()) return;
    const newClass: ClassGroup = {
      id: generateId(),
      designacao: newDesignacao.trim(),
      disciplina: newDisciplina.trim(),
      nivelEnsino: newNivel,
      alunos: [],
      createdAt: new Date().toISOString(),
    };
    await saveClass(newClass);
    setClasses((prev) => [newClass, ...prev]);
    setNewDesignacao("");
    setNewDisciplina("");
    setNewNivel(NIVEL_ENSINO_OPTIONS[1]);
    setShowModal(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar Turma", "Todos os alunos serao removidos. Continuar?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteClass(id);
          setClasses((prev) => prev.filter((c) => c.id !== id));
        },
      },
    ]);
  };

  const handleExportPdf = async () => {
    if (!exportTarget) return;
    const profile = await getTeacherProfile();
    const html = studentsListHtml(exportTarget, profile);
    await exportPdfFromHtml(html, `Lista_Alunos_${exportTarget.designacao}`);
  };

  const handleExportExcel = async () => {
    if (!exportTarget) return;
    const profile = await getTeacherProfile();
    const sheet = studentsListExcel(exportTarget, profile);
    await exportExcel(sheet.rows, `Lista_Alunos_${exportTarget.designacao}`, sheet.name, {
      merges: sheet.merges,
      colWidths: sheet.colWidths,
    });
  };

  const renderClass = ({ item }: { item: ClassGroup }) => (
    <Pressable
      onPress={() => router.push({ pathname: "/class-detail", params: { id: item.id } })}
      onLongPress={() => handleDelete(item.id)}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
    >
      <LinearGradient
        colors={["#60A5FA", "#6366F1", "#9333EA"]}
        style={styles.cardIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Icon name="people" size={20} color="#fff" />
      </LinearGradient>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.designacao}</Text>
        <Text style={styles.cardSubtitle}>{item.disciplina}</Text>
      </View>
      <View style={styles.cardBadge}>
        <Text style={styles.cardBadgeText}>{item.alunos.length}</Text>
      </View>
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          if (item.alunos.length === 0) {
            Alert.alert("Sem alunos", "Adicione alunos antes de exportar.");
            return;
          }
          setExportTarget(item);
        }}
        hitSlop={8}
        style={({ pressed }) => [styles.downloadBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Icon name="download" size={18} color={Colors.primaryLight} />
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
        <Text style={styles.headerTitle}>Turmas</Text>
        <Pressable
          onPress={() => setShowModal(true)}
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="add" size={24} color={Colors.primaryLight} />
        </Pressable>
      </View>

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={renderClass}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Sem turmas</Text>
            <Text style={styles.emptySubtitle}>Crie a sua primeira turma</Text>
          </View>
        }
      />

      <ExportMenu
        visible={!!exportTarget}
        title="Exportar lista de alunos"
        subtitle={exportTarget ? `${exportTarget.designacao} · ${exportTarget.alunos.length} alunos` : undefined}
        onClose={() => setExportTarget(null)}
        onPdf={handleExportPdf}
        onExcel={handleExportExcel}
      />

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Nova Turma</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Designacao (Ex: 10a A)"
              placeholderTextColor={Colors.textMuted}
              value={newDesignacao}
              onChangeText={setNewDesignacao}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Disciplina (Ex: Matematica)"
              placeholderTextColor={Colors.textMuted}
              value={newDisciplina}
              onChangeText={setNewDisciplina}
            />
            <Text style={styles.modalLabel}>Nível de Ensino</Text>
            <View style={styles.nivelContainer}>
              {NIVEL_ENSINO_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => setNewNivel(opt)}
                  style={[styles.nivelOption, newNivel === opt && styles.nivelOptionSelected]}
                >
                  <Text style={[styles.nivelOptionText, newNivel === opt && styles.nivelOptionTextSelected]}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={handleCreate}
              style={({ pressed }) => [styles.modalBtn, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.modalBtnText}>Criar Turma</Text>
            </Pressable>
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
    paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: "rgba(15,23,42,0.7)",
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  addBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(52,211,153,0.15)" },
  list: { padding: 20, gap: 12 },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14, padding: 16, gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  cardSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  cardBadge: { backgroundColor: "rgba(96,165,250,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cardBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#60A5FA" },
  downloadBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(20,184,166,0.12)", borderWidth: 1, borderColor: "rgba(20,184,166,0.25)",
  },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 8 },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", paddingHorizontal: 24 },
  modalContent: { backgroundColor: Colors.modalBg, borderRadius: 20, padding: 24, gap: 16, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text,
  },
  modalLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  nivelContainer: { gap: 6 },
  nivelOption: {
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  nivelOptionSelected: {
    borderColor: Colors.primary, backgroundColor: Colors.primary + "18",
  },
  nivelOptionText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  nivelOptionTextSelected: { fontFamily: "Inter_600SemiBold", color: Colors.primary },
  modalBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  modalBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
