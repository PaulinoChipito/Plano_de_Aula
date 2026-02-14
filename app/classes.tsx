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
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getClasses, saveClass, deleteClass, generateId, ClassGroup } from "@/lib/storage";

export default function ClassesScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newDesignacao, setNewDesignacao] = useState("");
  const [newDisciplina, setNewDisciplina] = useState("");

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
      alunos: [],
      createdAt: new Date().toISOString(),
    };
    await saveClass(newClass);
    setClasses((prev) => [newClass, ...prev]);
    setNewDesignacao("");
    setNewDisciplina("");
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

  const renderClass = ({ item }: { item: ClassGroup }) => (
    <Pressable
      onPress={() => router.push({ pathname: "/class-detail", params: { id: item.id } })}
      onLongPress={() => handleDelete(item.id)}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.95 : 1 }]}
    >
      <View style={styles.cardIcon}>
        <Ionicons name="people" size={22} color={Colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.designacao}</Text>
        <Text style={styles.cardSubtitle}>{item.disciplina}</Text>
      </View>
      <View style={styles.cardBadge}>
        <Text style={styles.cardBadgeText}>{item.alunos.length}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Turmas</Text>
        <Pressable
          onPress={() => setShowModal(true)}
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
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
            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Sem turmas</Text>
            <Text style={styles.emptySubtitle}>Crie a sua primeira turma</Text>
          </View>
        }
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
    paddingHorizontal: 16, paddingBottom: 16, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  addBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: Colors.primary + "15" },
  list: { padding: 20, gap: 12 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    borderRadius: 14, padding: 16, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary + "12", alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  cardSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  cardBadge: { backgroundColor: Colors.primary + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cardBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.primary },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 8 },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", paddingHorizontal: 24 },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  modalInput: {
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text,
  },
  modalBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  modalBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
