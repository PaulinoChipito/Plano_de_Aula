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
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getClasses, saveClass, generateId, ClassGroup, Student } from "@/lib/storage";

function parseCSV(text: string): { nome: string; idade: string; telefone: string }[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const result: { nome: string; idade: string; telefone: string }[] = [];
  for (const line of lines) {
    if (line.startsWith("#") || line.toLowerCase().startsWith("nome")) continue;
    const parts = line.split(/[,;]/).map((p) => p.trim());
    if (!parts[0]) continue;
    result.push({
      nome: parts[0] || "",
      idade: parts[1] || "",
      telefone: parts[2] || "",
    });
  }
  return result;
}

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState<Student | null>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<{ nome: string; idade: string; telefone: string }[]>([]);
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

  const doDeleteStudent = async (studentId: string) => {
    if (!classGroup) return;
    const updated = {
      ...classGroup,
      alunos: classGroup.alunos.filter((a) => a.id !== studentId),
    };
    await saveClass(updated);
    setClassGroup(updated);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleDeleteStudent = (studentId: string, skipConfirm = false) => {
    if (!classGroup) return;
    if (skipConfirm) {
      doDeleteStudent(studentId);
      return;
    }
    if (Platform.OS === "web") {
      if ((globalThis as any).confirm?.("Remover este aluno da turma?")) {
        doDeleteStudent(studentId);
      }
    } else {
      Alert.alert("Remover Aluno", "Tem a certeza?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: () => doDeleteStudent(studentId) },
      ]);
    }
  };

  const handleCsvChange = (text: string) => {
    setCsvText(text);
    setCsvPreview(parseCSV(text));
  };

  const handleImportCsv = async () => {
    if (!classGroup || csvPreview.length === 0) return;
    const newStudents: Student[] = csvPreview.map((row) => ({
      id: generateId(),
      nome: row.nome,
      idade: row.idade,
      telefoneEncarregado: row.telefone,
      fotoUri: null,
    }));
    const updated = { ...classGroup, alunos: [...classGroup.alunos, ...newStudents] };
    await saveClass(updated);
    setClassGroup(updated);
    setCsvText("");
    setCsvPreview([]);
    setShowCsvModal(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Importação concluída", `${newStudents.length} aluno(s) adicionado(s) com sucesso.`);
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
          <Icon name="person" size={18} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.nome}</Text>
        {item.idade ? <Text style={styles.studentAge}>{item.idade} anos</Text> : null}
      </View>
      <Icon name="chevron-forward" size={16} color={Colors.textMuted} />
    </Pressable>
  );

  if (!classGroup) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 60 }]}>
        <Text style={{ textAlign: "center", color: Colors.textSecondary }}>Turma não encontrada</Text>
      </View>
    );
  }

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
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setShowCsvModal(true)}
            style={({ pressed }) => [styles.headerActionBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Icon name="upload" size={18} color={Colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={({ pressed }) => [styles.headerActionBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Icon name="person-add" size={18} color={Colors.primary} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={sortedStudents}
        keyExtractor={(item) => item.id}
        renderItem={renderStudent}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Sem alunos</Text>
            <Text style={styles.emptySubtitle}>Adicione manualmente ou importe via CSV</Text>
            <Pressable
              onPress={() => setShowCsvModal(true)}
              style={({ pressed }) => [styles.emptyImportBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Icon name="upload" size={16} color={Colors.primary} />
              <Text style={styles.emptyImportBtnText}>Importar lista CSV</Text>
            </Pressable>
          </View>
        }
      />

      {/* Modal: Adicionar aluno */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Novo Aluno</Text>

            <Pressable onPress={pickPhoto} style={styles.photoPickerBtn}>
              {fotoUri ? (
                <Image source={{ uri: fotoUri }} style={styles.photoPicker} contentFit="cover" />
              ) : (
                <View style={styles.photoPicker}>
                  <Icon name="camera" size={24} color={Colors.textMuted} />
                  <Text style={styles.photoPickerLabel}>Foto</Text>
                </View>
              )}
            </Pressable>

            <TextInput style={styles.modalInput} placeholder="Nome completo *" placeholderTextColor={Colors.textMuted} value={nome} onChangeText={setNome} autoCapitalize="words" />
            <TextInput style={styles.modalInput} placeholder="Idade" placeholderTextColor={Colors.textMuted} value={idade} onChangeText={setIdade} keyboardType="numeric" />
            <TextInput style={styles.modalInput} placeholder="Telefone do encarregado" placeholderTextColor={Colors.textMuted} value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />

            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setShowAddModal(false)}
                style={({ pressed }) => [styles.modalCancelBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleAddStudent}
                disabled={!nome.trim()}
                style={({ pressed }) => [styles.modalBtn, !nome.trim() && styles.modalBtnDisabled, { opacity: pressed ? 0.9 : 1 }]}
              >
                <Icon name="user-plus" size={16} color="#fff" />
                <Text style={styles.modalBtnText}>Adicionar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal: Importar CSV */}
      <Modal visible={showCsvModal} transparent animationType="slide" onRequestClose={() => setShowCsvModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCsvModal(false)}>
          <Pressable style={[styles.modalContent, styles.csvModal]} onPress={() => {}}>
            <View style={styles.csvHeader}>
              <View>
                <Text style={styles.modalTitle}>Importar lista CSV</Text>
                <Text style={styles.csvSubtitle}>Cole o conteúdo do ficheiro abaixo</Text>
              </View>
              <Pressable onPress={() => setShowCsvModal(false)} style={styles.csvCloseBtn}>
                <Icon name="x" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.csvFormatBox}>
              <Icon name="info" size={13} color={Colors.primary} />
              <Text style={styles.csvFormatText}>
                Formato: <Text style={styles.csvFormatCode}>Nome, Idade, Telefone</Text>{"\n"}(uma linha por aluno, vírgula ou ponto e vírgula)
              </Text>
            </View>

            <TextInput
              style={styles.csvInput}
              value={csvText}
              onChangeText={handleCsvChange}
              placeholder={"Ana Silva, 14, 923456789\nJoão Costa, 15,\nMaria Neto, 14, 912345678"}
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoCapitalize="sentences"
              autoCorrect={false}
            />

            {csvPreview.length > 0 && (
              <View style={styles.csvPreview}>
                <Text style={styles.csvPreviewTitle}>
                  Pré-visualização: {csvPreview.length} aluno(s)
                </Text>
                <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled>
                  {csvPreview.map((row, i) => (
                    <View key={i} style={styles.csvPreviewRow}>
                      <View style={styles.csvPreviewNum}>
                        <Text style={styles.csvPreviewNumText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.csvPreviewName} numberOfLines={1}>{row.nome}</Text>
                      {row.idade ? <Text style={styles.csvPreviewMeta}>{row.idade}a</Text> : null}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => { setShowCsvModal(false); setCsvText(""); setCsvPreview([]); }}
                style={({ pressed }) => [styles.modalCancelBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleImportCsv}
                disabled={csvPreview.length === 0}
                style={({ pressed }) => [styles.modalBtn, csvPreview.length === 0 && styles.modalBtnDisabled, { opacity: pressed ? 0.9 : 1 }]}
              >
                <Icon name="upload" size={16} color="#fff" />
                <Text style={styles.modalBtnText}>
                  Importar {csvPreview.length > 0 ? `(${csvPreview.length})` : ""}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal: Detalhe do aluno */}
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
                      <Icon name="person" size={32} color={Colors.textMuted} />
                    </View>
                  )}
                  <Text style={styles.profileName}>{showStudentModal.nome}</Text>
                  {showStudentModal.idade ? <Text style={styles.profileAge}>{showStudentModal.idade} anos</Text> : null}
                </View>
                {showStudentModal.telefoneEncarregado ? (
                  <View style={styles.profileField}>
                    <Icon name="phone" size={16} color={Colors.primary} />
                    <Text style={styles.profileFieldText}>{showStudentModal.telefoneEncarregado}</Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => {
                    const id = showStudentModal!.id;
                    setShowStudentModal(null);
                    handleDeleteStudent(id, true);
                  }}
                  style={({ pressed }) => [styles.removeStudentBtn, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <Icon name="trash-2" size={16} color={Colors.error} />
                  <Text style={styles.removeStudentBtnText}>Remover aluno</Text>
                </Pressable>
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
    paddingHorizontal: 16, paddingBottom: 16, backgroundColor: "rgba(15,23,42,0.7)",
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { alignItems: "center", flex: 1 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  headerSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  headerActions: { flexDirection: "row", gap: 8 },
  headerActionBtn: {
    width: 38, height: 38, alignItems: "center", justifyContent: "center",
    borderRadius: 12, backgroundColor: Colors.primary + "15",
  },
  list: { padding: 20, gap: 10 },
  studentCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14, gap: 12,
    borderWidth: 1, borderColor: Colors.border,
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
  emptyImportBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: Colors.primary + "15", borderWidth: 1, borderColor: Colors.primary + "30",
  },
  emptyImportBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.primary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", paddingHorizontal: 24 },
  modalContent: { backgroundColor: Colors.modalBg, borderRadius: 20, padding: 24, gap: 14, borderWidth: 1, borderColor: Colors.border },
  csvModal: { gap: 12 },
  csvHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  csvCloseBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)" },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  csvSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  csvFormatBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: Colors.primary + "10", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.primary + "25",
  },
  csvFormatText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  csvFormatCode: { fontFamily: "Inter_600SemiBold", color: Colors.primary },
  csvInput: {
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 14,
    color: Colors.text, minHeight: 100, textAlignVertical: "top",
  },
  csvPreview: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, padding: 12, gap: 6,
  },
  csvPreviewTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.primary, marginBottom: 6 },
  csvPreviewRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  csvPreviewNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary + "15", alignItems: "center", justifyContent: "center" },
  csvPreviewNumText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.primary },
  csvPreviewName: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text },
  csvPreviewMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center",
    borderWidth: 1, borderColor: Colors.border, backgroundColor: "rgba(255,255,255,0.05)",
  },
  modalCancelBtnText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textSecondary },
  modalBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13,
  },
  modalBtnDisabled: { backgroundColor: Colors.textMuted + "60" },
  modalBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  photoPickerBtn: { alignSelf: "center" },
  photoPicker: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surfaceAlt,
    alignItems: "center", justifyContent: "center", overflow: "hidden", gap: 4,
  },
  photoPickerLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  profileHeader: { alignItems: "center", gap: 8 },
  profilePhoto: { width: 80, height: 80, borderRadius: 40 },
  profilePhotoPlaceholder: { backgroundColor: Colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  profileName: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  profileAge: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  profileField: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.background, borderRadius: 12, padding: 14 },
  profileFieldText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.text },
  removeStudentBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 11, borderRadius: 12, borderWidth: 1,
    borderColor: Colors.error + "30", backgroundColor: Colors.error + "08",
  },
  removeStudentBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.error },
});
