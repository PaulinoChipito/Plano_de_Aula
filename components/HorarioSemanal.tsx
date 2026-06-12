import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Icon from "@/components/Icon";
import Colors from "@/constants/colors";
import { getAulas, saveAula, deleteAula, generateId, Aula } from "@/lib/storage";
import { useLanguage } from "@/lib/i18n";

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const HOUR_START = 7;
const HOUR_END = 24;
const HOUR_H = 64;
const DAY_COL_W = 108;
const TIME_COL_W = 46;
const HEADER_H = 42;
const GRID_TOTAL_H = (HOUR_END - HOUR_START) * HOUR_H;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

const TURMA_COLORS = [
  "#6366F1", "#14B8A6", "#A855F7", "#F59E0B", "#EF4444",
  "#10B981", "#3B82F6", "#EC4899", "#06B6D4", "#84CC16",
];

const DISCIPLINAS_SUGERIDAS = [
  "Matemática", "Português", "História", "Geografia", "Ciências",
  "Física", "Química", "Biologia", "Inglês", "Educação Física",
  "Arte", "Filosofia", "Sociologia", "Informática",
];

function getTurmaColor(turma: string): string {
  let hash = 0;
  for (let i = 0; i < turma.length; i++) {
    hash = turma.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TURMA_COLORS[Math.abs(hash) % TURMA_COLORS.length];
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function hasConflict(aulas: Aula[], dia: string, inicio: string, fim: string, excludeId?: string): Aula | null {
  const newStart = timeToMinutes(inicio);
  const newEnd = timeToMinutes(fim);
  for (const a of aulas) {
    if (a.dia !== dia || a.id === excludeId) continue;
    const aStart = timeToMinutes(a.horaInicio);
    const aEnd = timeToMinutes(a.horaFim);
    if (newStart < aEnd && newEnd > aStart) return a;
  }
  return null;
}

interface FormState {
  disciplina: string;
  disciplinaCustom: string;
  turma: string;
  dia: string;
  horaInicio: string;
  horaFim: string;
}

const EMPTY_FORM: FormState = {
  disciplina: "", disciplinaCustom: "", turma: "",
  dia: "Segunda", horaInicio: "08:00", horaFim: "09:00",
};

export default function HorarioSemanal() {
  const { lang, tr } = useLanguage();
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAulas().then(setAulas);
    }, []),
  );

  const openAddModal = (dia?: string, hora?: string) => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, dia: dia || "Segunda", horaInicio: hora || "08:00", horaFim: hora ? `${String(Number(hora.split(":")[0]) + 1).padStart(2, "0")}:00` : "09:00" });
    setErros([]);
    setShowModal(true);
  };

  const openEditModal = (aula: Aula) => {
    setEditingId(aula.id);
    setForm({
      disciplina: DISCIPLINAS_SUGERIDAS.includes(aula.disciplina) ? aula.disciplina : "custom",
      disciplinaCustom: DISCIPLINAS_SUGERIDAS.includes(aula.disciplina) ? "" : aula.disciplina,
      turma: aula.turma,
      dia: aula.dia,
      horaInicio: aula.horaInicio,
      horaFim: aula.horaFim,
    });
    setErros([]);
    setShowModal(true);
  };

  const handleSave = async () => {
    const novosErros: string[] = [];
    const discFinal = form.disciplina === "custom" ? form.disciplinaCustom.trim() : form.disciplina.trim();
    if (!discFinal) novosErros.push(tr.scheduleDisciplineRequired);
    if (!form.turma.trim()) novosErros.push(tr.scheduleClassRequired);
    if (!form.horaInicio || !form.horaFim) novosErros.push(tr.scheduleTimeRequired);
    if (form.horaInicio && form.horaFim) {
      if (timeToMinutes(form.horaFim) <= timeToMinutes(form.horaInicio)) {
        novosErros.push(tr.scheduleEndAfterStart);
      }
    }
    if (novosErros.length === 0 && form.horaInicio && form.horaFim) {
      const conflito = hasConflict(aulas, form.dia, form.horaInicio, form.horaFim, editingId ?? undefined);
      if (conflito) {
        novosErros.push(`${tr.scheduleConflictWith} ${conflito.disciplina} (${conflito.horaInicio}–${conflito.horaFim}) ${tr.scheduleOnDay} ${getDayLabel(form.dia)}.`);
      }
    }
    if (novosErros.length > 0) { setErros(novosErros); return; }

    const novaAula: Aula = {
      id: editingId || generateId(),
      disciplina: discFinal,
      turma: form.turma.trim(),
      dia: form.dia,
      horaInicio: form.horaInicio,
      horaFim: form.horaFim,
      criadoEm: Date.now(),
    };
    await saveAula(novaAula);
    setAulas((prev) => {
      const filtered = prev.filter((a) => a.id !== novaAula.id);
      return [...filtered, novaAula];
    });
    setShowModal(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (id: string) => {
    const doDelete = async () => {
      await deleteAula(id);
      setAulas((prev) => prev.filter((a) => a.id !== id));
    };
    if (Platform.OS === "web") {
      if (window.confirm(tr.scheduleDeleteLessonWebConfirm)) doDelete();
    } else {
      Alert.alert(tr.scheduleDeleteLesson, tr.scheduleDeleteLessonMsg, [
        { text: tr.cancel, style: "cancel" },
        { text: tr.delete, style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const totalDisciplinas = new Set(aulas.map((a) => a.disciplina)).size;
  const totalTurmas = new Set(aulas.map((a) => a.turma)).size;

  const getDiaAulas = (dia: string) => aulas.filter((a) => a.dia === dia);

  const diasCurto = [
    tr.scheduleDayMonShort,
    tr.scheduleDayTueShort,
    tr.scheduleDayWedShort,
    tr.scheduleDayThuShort,
    tr.scheduleDayFriShort,
    tr.scheduleDaySatShort,
  ];

  const getDayLabel = (dia: string) => {
    const index = DIAS_SEMANA.indexOf(dia);
    const en = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const fr = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    if (index < 0) return dia;
    if (lang === "en") return en[index];
    if (lang === "fr") return fr[index];
    return dia;
  };

  const getDisciplineLabel = (disciplina: string) => {
    const en: Record<string, string> = {
      "Matemática": "Mathematics",
      "Português": "Portuguese",
      "História": "History",
      "Geografia": "Geography",
      "Ciências": "Science",
      "Física": "Physics",
      "Química": "Chemistry",
      "Biologia": "Biology",
      "Inglês": "English",
      "Educação Física": "Physical Education",
      "Arte": "Art",
      "Filosofia": "Philosophy",
      "Sociologia": "Sociology",
      "Informática": "Computer Science",
    };
    const fr: Record<string, string> = {
      "Matemática": "Mathématiques",
      "Português": "Portugais",
      "História": "Histoire",
      "Geografia": "Géographie",
      "Ciências": "Sciences",
      "Física": "Physique",
      "Química": "Chimie",
      "Biologia": "Biologie",
      "Inglês": "Anglais",
      "Educação Física": "Éducation physique",
      "Arte": "Art",
      "Filosofia": "Philosophie",
      "Sociologia": "Sociologie",
      "Informática": "Informatique",
    };
    if (lang === "en") return en[disciplina] || disciplina;
    if (lang === "fr") return fr[disciplina] || disciplina;
    return disciplina;
  };

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{aulas.length}</Text>
          <Text style={styles.statLabel}>{tr.scheduleLessonsLabel}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalDisciplinas}</Text>
          <Text style={styles.statLabel}>{tr.scheduleSubjectsLabel}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalTurmas}</Text>
          <Text style={styles.statLabel}>{tr.scheduleClassesLabel}</Text>
        </View>
      </View>

      {/* Grid */}
      <ScrollView
        style={styles.gridScroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View>
            {/* Day headers */}
            <View style={styles.gridHeaderRow}>
              <View style={{ width: TIME_COL_W }} />
              {DIAS_SEMANA.map((dia, i) => (
                <View key={dia} style={styles.dayHeader}>
                  <Text style={styles.dayHeaderText}>{diasCurto[i]}</Text>
                  <Text style={styles.dayHeaderCount}>{getDiaAulas(dia).length > 0 ? `${getDiaAulas(dia).length}` : ""}</Text>
                </View>
              ))}
            </View>

            {/* Grid body */}
            <View style={styles.gridBody}>
              {/* Time column */}
              <View style={styles.timeColumn}>
                {HOURS.map((h) => (
                  <View key={h} style={styles.timeCell}>
                    <Text style={styles.timeCellText}>{String(h).padStart(2, "0")}h</Text>
                  </View>
                ))}
              </View>

              {/* Day columns */}
              {DIAS_SEMANA.map((dia) => {
                const diaAulas = getDiaAulas(dia);
                return (
                  <View key={dia} style={[styles.dayColumn, { height: GRID_TOTAL_H }]}>
                    {/* Hour lines */}
                    {HOURS.map((h, i) => (
                      <Pressable
                        key={h}
                        style={[styles.hourLine, { top: i * HOUR_H }]}
                        onPress={() => openAddModal(dia, `${String(h).padStart(2, "0")}:00`)}
                      />
                    ))}
                    {/* Lesson blocks */}
                    {diaAulas.map((aula) => {
                      const startMin = timeToMinutes(aula.horaInicio) - HOUR_START * 60;
                      const endMin = timeToMinutes(aula.horaFim) - HOUR_START * 60;
                      const topPx = (startMin / 60) * HOUR_H;
                      const heightPx = Math.max(((endMin - startMin) / 60) * HOUR_H, 28);
                      const color = getTurmaColor(aula.turma);
                      return (
                        <Pressable
                          key={aula.id}
                          onPress={() => openEditModal(aula)}
                          onLongPress={() => handleDelete(aula.id)}
                          style={({ pressed }) => [
                            styles.aulaBlock,
                            {
                              top: topPx + 1,
                              height: heightPx - 2,
                              backgroundColor: color + "22",
                              borderLeftColor: color,
                              opacity: pressed ? 0.8 : 1,
                            },
                          ]}
                        >
                          <Text style={[styles.aulaBlockDisc, { color }]} numberOfLines={1}>
                            {aula.disciplina}
                          </Text>
                          {heightPx >= 44 && (
                            <Text style={styles.aulaBlockTurma} numberOfLines={1}>{aula.turma}</Text>
                          )}
                          {heightPx >= 56 && (
                            <Text style={styles.aulaBlockTime}>
                              {aula.horaInicio}–{aula.horaFim}
                            </Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {aulas.length === 0 && (
          <View style={styles.emptyContainer}>
            <Icon name="calendar" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{tr.scheduleEmptyTitle}</Text>
            <Text style={styles.emptySubtitle}>
              {tr.scheduleEmptySubtitle}
            </Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => openAddModal()}
        style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Icon name="add" size={26} color="#fff" />
      </Pressable>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? tr.scheduleEditLesson : tr.scheduleNewLesson}</Text>
                <Pressable onPress={() => setShowModal(false)} style={styles.modalClose}>
                  <Icon name="close" size={20} color={Colors.textMuted} />
                </Pressable>
              </View>

              {erros.length > 0 && (
                <View style={styles.errorBox}>
                  {erros.map((e, i) => (
                    <Text key={i} style={styles.errorText}>• {e}</Text>
                  ))}
                </View>
              )}

              {/* Disciplina */}
              <Text style={styles.fieldLabel}>{tr.scheduleDiscipline}</Text>
              <View style={styles.suggRow}>
                {DISCIPLINAS_SUGERIDAS.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => { setForm((f) => ({ ...f, disciplina: d })); setShowSugestoes(false); }}
                    style={[styles.suggChip, form.disciplina === d && styles.suggChipActive]}
                  >
                    <Text style={[styles.suggChipText, form.disciplina === d && styles.suggChipTextActive]}>
                      {getDisciplineLabel(d)}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setForm((f) => ({ ...f, disciplina: "custom" }))}
                  style={[styles.suggChip, form.disciplina === "custom" && styles.suggChipActive]}
                >
                  <Text style={[styles.suggChipText, form.disciplina === "custom" && styles.suggChipTextActive]}>
                    {tr.scheduleOther}
                  </Text>
                </Pressable>
              </View>
              {form.disciplina === "custom" && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder={tr.scheduleCustomDisciplinePlaceholder}
                  placeholderTextColor={Colors.textMuted}
                  value={form.disciplinaCustom}
                  onChangeText={(v) => setForm((f) => ({ ...f, disciplinaCustom: v }))}
                />
              )}

              {/* Turma */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{tr.scheduleClass}</Text>
              <TextInput
                style={styles.input}
                placeholder={tr.scheduleClassPlaceholder}
                placeholderTextColor={Colors.textMuted}
                value={form.turma}
                onChangeText={(v) => setForm((f) => ({ ...f, turma: v }))}
              />

              {/* Dia */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{tr.scheduleWeekday}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.diaPicker}>
                {DIAS_SEMANA.map((d, i) => (
                  <Pressable
                    key={d}
                    onPress={() => setForm((f) => ({ ...f, dia: d }))}
                    style={[styles.diaChip, form.dia === d && styles.diaChipActive]}
                  >
                    <Text style={[styles.diaChipText, form.dia === d && styles.diaChipTextActive]}>
                      {diasCurto[i]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Horários */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{tr.scheduleTime}</Text>
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timeSubLabel}>{tr.scheduleStart}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="HH:MM"
                    placeholderTextColor={Colors.textMuted}
                    value={form.horaInicio}
                    onChangeText={(v) => setForm((f) => ({ ...f, horaInicio: v }))}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <Icon name="arrow-right" size={18} color={Colors.textMuted} style={{ marginTop: 22 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.timeSubLabel}>{tr.scheduleEnd}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="HH:MM"
                    placeholderTextColor={Colors.textMuted}
                    value={form.horaFim}
                    onChangeText={(v) => setForm((f) => ({ ...f, horaFim: v }))}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                {editingId && (
                  <Pressable
                    onPress={() => { handleDelete(editingId); setShowModal(false); }}
                    style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    <Icon name="trash-2" size={16} color={Colors.error} />
                    <Text style={styles.deleteBtnText}>{tr.delete}</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={handleSave}
                  style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.9 : 1, flex: 1 }]}
                >
                  <Text style={styles.saveBtnText}>{editingId ? tr.scheduleUpdate : tr.scheduleAdd}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  statsRow: {
    flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  statCard: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, paddingVertical: 10,
    alignItems: "center", borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.primary },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  gridScroll: { flex: 1 },
  gridHeaderRow: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  dayHeader: {
    width: DAY_COL_W, height: HEADER_H, alignItems: "center", justifyContent: "center",
    borderLeftWidth: 1, borderLeftColor: Colors.border, flexDirection: "row", gap: 4,
  },
  dayHeaderText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  dayHeaderCount: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.primary },
  gridBody: { flexDirection: "row" },
  timeColumn: { width: TIME_COL_W },
  timeCell: { height: HOUR_H, justifyContent: "flex-start", paddingTop: 4, alignItems: "flex-end", paddingRight: 6, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  timeCellText: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  dayColumn: {
    width: DAY_COL_W, position: "relative",
    borderLeftWidth: 1, borderLeftColor: Colors.border,
  },
  hourLine: {
    position: "absolute", left: 0, right: 0, height: HOUR_H,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  aulaBlock: {
    position: "absolute", left: 2, right: 2,
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3,
    borderLeftWidth: 3, overflow: "hidden",
  },
  aulaBlockDisc: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  aulaBlockTurma: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textSecondary, marginTop: 1 },
  aulaBlockTime: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted, marginTop: 1 },

  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: Colors.text },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", paddingHorizontal: 32 },

  fab: {
    position: "absolute", bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    elevation: 4,
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: Colors.modalBg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: "90%", borderTopWidth: 1, borderTopColor: Colors.border,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text },
  modalClose: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },

  errorBox: {
    backgroundColor: Colors.error + "15", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.error + "30", marginBottom: 12, gap: 4,
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.error },

  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text, marginBottom: 8 },
  input: {
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text,
  },

  suggRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  suggChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: Colors.border,
  },
  suggChipActive: { backgroundColor: Colors.primary + "20", borderColor: Colors.primary },
  suggChipText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  suggChipTextActive: { color: Colors.primary, fontFamily: "Inter_600SemiBold" },

  diaPicker: { marginBottom: 4 },
  diaChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: Colors.border,
  },
  diaChipActive: { backgroundColor: Colors.primary + "25", borderColor: Colors.primary },
  diaChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
  diaChipTextActive: { color: Colors.primary },

  timeRow: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  timeSubLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginBottom: 6 },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: Colors.error + "50", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  deleteBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.error },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center",
  },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
