import React, { useState, useEffect } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getClasses, saveClass, generateId, ClassGroup, Student } from "@/lib/storage";

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState<Student | null>(null);
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [telefone, setTelefone] = useState("");
  const [fotoUri, setFotoUri] = useState<string | null>(null);

  useEffect(() => {
    getClasses().then((classes) => {
      const found = classes.find((c) => c.id === id);
      if (found) setClassGroup(found);
    });
  }, [id]);

  const sortedStudents = classGroup
    ? [...classGroup.alunos].sort((a, b) => a.nome.localeCompare(b.nome))
    : [];

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setFotoUri(result.assets[0].uri);
    }
  };

  const handleAddStudent = async () => {
    if (!classGroup || !nome.trim()) return;
    const student: Student = {
      id: generateId(),
      nome: nome.trim(),
      idade: idade.trim(),
      telefoneEncarregado: telefone.trim(),
      fotoUri,
    };
    const updated = { ...classGroup, alunos: [...classGroup.alunos, student] };
    await saveClass(updated);
    setClassGroup(updated);
    setNome("");
    setIdade("");
    setTelefone("");
    setFotoUri(null);
    setShowAddModal(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteStudent = (studentId: string) => {
    if (!classGroup) return;
    Alert.alert("Remover Aluno", "Tem a certeza?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          const updated = {
            ...classGroup,
            alunos: classGroup.alunos.filter((a) => a.id !== studentId),
          };
          await saveClass(updated);
          setClassGroup(updated);
        },
      },
    ]);
  };

  const renderStudent = ({ item, index }: { item: Student; index: number }) => (
    <Pressable
      onPress={() => setShowStudentModal(item)}
      onLongPress={() => handleDeleteStudent(item.id)}
      style={({ pressed }) => [styles.studentCard, { opacity: pressed ? 0.95 : 1 }]}
    >
      <View style={styles.studentNum}>
        <Text style={styles.studentNumText}>{index + 1}</Text>
      </View>
      {item.fotoUri ? (
        <Image source={{ uri: item.fotoUri }} style={styles.studentPhoto} contentFit="cover" />
      ) : (
        <View style={styles.studentAvatar}>
          <Ionicons name="person" size={18} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.nome}</Text>
        {item.idade ? <Text style={styles.studentAge}>{item.idade} anos</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </Pressable>
  );

  if (!classGroup) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 60 }]}>
        <Text style={{ textAlign: "center", color: Colors.textSecondary }}>Turma nao encontrada</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{classGroup.designacao}</Text>
          <Text style={styles.headerSubtitle}>{classGroup.disciplina}</Text>
        </View>
        <Pressable onPress={() => setShowAddModal(true)} style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="person-add" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={sortedStudents}
        keyExtractor={(item) => item.id}
        renderItem={renderStudent}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="person-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Sem alunos</Text>
            <Text style={styles.emptySubtitle}>Adicione o primeiro aluno</Text>
          </View>
        }
      />

      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Novo Aluno</Text>

            <Pressable onPress={pickPhoto} style={styles.photoPickerBtn}>
              {fotoUri ? (
                <Image source={{ uri: fotoUri }} style={styles.photoPicker} contentFit="cover" />
              ) : (
                <View style={styles.photoPicker}>
                  <Ionicons name="camera" size={24} color={Colors.textMuted} />
                </View>
              )}
            </Pressable>

            <TextInput style={styles.modalInput} placeholder="Nome completo" placeholderTextColor={Colors.textMuted} value={nome} onChangeText={setNome} />
            <TextInput style={styles.modalInput} placeholder="Idade" placeholderTextColor={Colors.textMuted} value={idade} onChangeText={setIdade} keyboardType="numeric" />
            <TextInput style={styles.modalInput} placeholder="Telefone do encarregado" placeholderTextColor={Colors.textMuted} value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />

            <Pressable onPress={handleAddStudent} style={({ pressed }) => [styles.modalBtn, { opacity: pressed ? 0.9 : 1 }]}>
              <Text style={styles.modalBtnText}>Adicionar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!showStudentModal} transparent animationType="fade" onRequestClose={() => setShowStudentModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowStudentModal(null)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            {showStudentModal && (
              <>
                <View style={styles.profileHeader}>
                  {showStudentModal.fotoUri ? (
                    <Image source={{ uri: showStudentModal.fotoUri }} style={styles.profilePhoto} contentFit="cover" />
                  ) : (
                    <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                      <Ionicons name="person" size={32} color={Colors.textMuted} />
                    </View>
                  )}
                  <Text style={styles.profileName}>{showStudentModal.nome}</Text>
                  {showStudentModal.idade ? <Text style={styles.profileAge}>{showStudentModal.idade} anos</Text> : null}
                </View>
                {showStudentModal.telefoneEncarregado ? (
                  <View style={styles.profileField}>
                    <Feather name="phone" size={16} color={Colors.primary} />
                    <Text style={styles.profileFieldText}>{showStudentModal.telefoneEncarregado}</Text>
                  </View>
                ) : null}
              </>
            )}
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
  addBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: Colors.primary + "15" },
  list: { padding: 20, gap: 10 },
  studentCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  studentNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary + "12", alignItems: "center", justifyContent: "center" },
  studentNumText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.primary },
  studentPhoto: { width: 40, height: 40, borderRadius: 20 },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  studentInfo: { flex: 1 },
  studentName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  studentAge: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.text, marginTop: 8 },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", paddingHorizontal: 24 },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  photoPickerBtn: { alignSelf: "center" },
  photoPicker: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surfaceAlt, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  modalInput: {
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text,
  },
  modalBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  modalBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  profileHeader: { alignItems: "center", gap: 8 },
  profilePhoto: { width: 80, height: 80, borderRadius: 40 },
  profilePhotoPlaceholder: { backgroundColor: Colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  profileName: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  profileAge: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  profileField: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.background, borderRadius: 12, padding: 14 },
  profileFieldText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.text },
});
