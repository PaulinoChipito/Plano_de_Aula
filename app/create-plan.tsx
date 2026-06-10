import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { generateId, saveLessonPlan, LessonPlan } from "@/lib/storage";
import { usePeriod } from "@/lib/periodContext";

export default function CreatePlanScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [classe, setClasse] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [tema, setTema] = useState("");
  const [duracao, setDuracao] = useState("");
  const [sumario, setSumario] = useState("");
  const [objetivoGeral, setObjetivoGeral] = useState("");
  const [objetivosEspecificos, setObjetivosEspecificos] = useState<string[]>([""]);
  const [metodos, setMetodos] = useState("");
  const [meios, setMeios] = useState("");
  const [atividades, setAtividades] = useState<{ descricao: string; tempo: string }[]>([{ descricao: "", tempo: "" }]);
  const [perguntasControlo, setPerguntasControlo] = useState<string[]>([""]);
  const [perguntasTarefa, setPerguntasTarefa] = useState<string[]>([""]);
  const [tarefasPraticas, setTarefasPraticas] = useState<string[]>([""]);

  const { currentPeriod } = usePeriod();

  const canSave = classe.trim() && disciplina.trim() && tema.trim() && duracao.trim() && sumario.trim();

  const handleSave = async () => {
    const plan: LessonPlan = {
      id: generateId(),
      classe,
      disciplina,
      tema,
      duracao,
      sumario,
      objetivoGeral,
      objetivosEspecificos: objetivosEspecificos.filter((o) => o.trim()),
      metodos,
      meios,
      atividades: atividades.filter((a) => a.descricao.trim()),
      perguntasControlo: perguntasControlo.filter((p) => p.trim()),
      tarefasPraticas: tarefasPraticas.filter((p) => p.trim()),
      perguntasTarefa: perguntasTarefa.filter((p) => p.trim()),
      score: 0,
      sugestoes: [],
      createdAt: new Date().toISOString(),
      periodo: currentPeriod,
    };
    await saveLessonPlan(plan);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
  };

  const addListItem = (list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter([...list, ""]);
  };

  const updateListItem = (
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string,
  ) => {
    const updated = [...list];
    updated[index] = value;
    setter(updated);
  };

  const removeListItem = (
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
  ) => {
    if (list.length <= 1) return;
    setter(list.filter((_, i) => i !== index));
  };

  const addAtividade = () => setAtividades([...atividades, { descricao: "", tempo: "" }]);

  const updateAtividade = (index: number, field: "descricao" | "tempo", value: string) => {
    const updated = [...atividades];
    updated[index] = { ...updated[index], [field]: value };
    setAtividades(updated);
  };

  const removeAtividade = (index: number) => {
    if (atividades.length <= 1) return;
    setAtividades(atividades.filter((_, i) => i !== index));
  };

  const renderDynamicList = (
    label: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    placeholder: string,
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      {list.map((item, i) => (
        <View key={i} style={styles.dynamicRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={item}
            onChangeText={(v) => updateListItem(list, setter, i, v)}
            placeholder={`${placeholder} ${i + 1}`}
            placeholderTextColor={Colors.textMuted}
          />
          {list.length > 1 && (
            <Pressable onPress={() => removeListItem(list, setter, i)} style={styles.removeBtn}>
              <Icon name="close" size={18} color={Colors.error} />
            </Pressable>
          )}
        </View>
      ))}
      <Pressable onPress={() => addListItem(list, setter)} style={styles.addItemBtn}>
        <Icon name="add" size={16} color={Colors.primary} />
        <Text style={styles.addItemText}>Adicionar</Text>
      </Pressable>
    </View>
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
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Novo Plano de Aula</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Secção 1 — Dados Identificativos */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNum}><Text style={styles.sectionNumText}>1</Text></View>
            <Text style={styles.sectionTitle}>Dados Identificativos</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Classe / Turma *</Text>
            <TextInput style={styles.input} value={classe} onChangeText={setClasse} placeholder="Ex: 10.ª Classe, Turma A" placeholderTextColor={Colors.textMuted} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Disciplina *</Text>
            <TextInput style={styles.input} value={disciplina} onChangeText={setDisciplina} placeholder="Ex: Matemática" placeholderTextColor={Colors.textMuted} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tema *</Text>
            <TextInput style={styles.input} value={tema} onChangeText={setTema} placeholder="Ex: Equações do 2.º Grau" placeholderTextColor={Colors.textMuted} />
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Duração (min) *</Text>
              <TextInput style={styles.input} value={duracao} onChangeText={setDuracao} placeholder="Ex: 45" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
            </View>
          </View>

          {/* Secção 2 — Objectivos */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNum}><Text style={styles.sectionNumText}>2</Text></View>
            <Text style={styles.sectionTitle}>Objectivos da Aula</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sumário *</Text>
            <TextInput style={[styles.input, styles.textArea]} value={sumario} onChangeText={setSumario} multiline placeholder="Resumo breve do que vai ser ensinado..." placeholderTextColor={Colors.textMuted} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Objectivo Geral</Text>
            <TextInput style={[styles.input, styles.textArea]} value={objetivoGeral} onChangeText={setObjetivoGeral} multiline placeholder="Objectivo geral da aula..." placeholderTextColor={Colors.textMuted} />
          </View>
          {renderDynamicList("Objectivos Específicos", objetivosEspecificos, setObjetivosEspecificos, "Objectivo")}

          {/* Secção 3 — Conteúdos e Métodos */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNum}><Text style={styles.sectionNumText}>3</Text></View>
            <Text style={styles.sectionTitle}>Métodos e Meios</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Métodos de Ensino</Text>
            <TextInput style={[styles.input, styles.textArea]} value={metodos} onChangeText={setMetodos} multiline placeholder="Ex: Expositivo, elaboração conjunta, trabalho em grupo..." placeholderTextColor={Colors.textMuted} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Meios de Ensino</Text>
            <TextInput style={[styles.input, styles.textArea]} value={meios} onChangeText={setMeios} multiline placeholder="Ex: Quadro, giz, livro didático, fichas..." placeholderTextColor={Colors.textMuted} />
          </View>

          {/* Secção 4 — Desenvolvimento */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNum}><Text style={styles.sectionNumText}>4</Text></View>
            <Text style={styles.sectionTitle}>Desenvolvimento da Aula</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sequência de Actividades</Text>
            {atividades.map((at, i) => (
              <View key={i} style={styles.atividadeInputRow}>
                <View style={styles.atividadeInputs}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={at.descricao}
                    onChangeText={(v) => updateAtividade(i, "descricao", v)}
                    placeholder={`Actividade ${i + 1} (ex: Motivação / Introdução)`}
                    placeholderTextColor={Colors.textMuted}
                  />
                  <TextInput
                    style={[styles.input, { width: 80 }]}
                    value={at.tempo}
                    onChangeText={(v) => updateAtividade(i, "tempo", v)}
                    placeholder="Tempo"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                {atividades.length > 1 && (
                  <Pressable onPress={() => removeAtividade(i)} style={styles.removeBtn}>
                    <Icon name="close" size={18} color={Colors.error} />
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable onPress={addAtividade} style={styles.addItemBtn}>
              <Icon name="add" size={16} color={Colors.primary} />
              <Text style={styles.addItemText}>Adicionar actividade</Text>
            </Pressable>
          </View>

          {/* Secção 5 — Avaliação */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionNum}><Text style={styles.sectionNumText}>5</Text></View>
            <Text style={styles.sectionTitle}>Avaliação e TPC</Text>
          </View>

          {renderDynamicList("Perguntas de Controlo", perguntasControlo, setPerguntasControlo, "Pergunta")}
          {renderDynamicList("Actividades Práticas (exercícios de sala)", tarefasPraticas, setTarefasPraticas, "Actividade")}
          {renderDynamicList("Tarefa de Casa (TPC)", perguntasTarefa, setPerguntasTarefa, "TPC")}

          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveBtn,
              !canSave && { backgroundColor: Colors.textMuted },
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Icon name="check" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>Guardar Plano</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  content: { padding: 20, gap: 14 },

  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginTop: 8, marginBottom: 2,
  },
  sectionNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
  },
  sectionNumText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text },

  row: { flexDirection: "row", gap: 10 },
  inputGroup: { gap: 6 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  input: {
    backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text,
  },
  textArea: { minHeight: 72, textAlignVertical: "top" },

  dynamicRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  removeBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.error + "12", borderRadius: 10,
  },
  addItemBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 4,
  },
  addItemText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.primary },

  atividadeInputRow: { gap: 6, marginBottom: 8 },
  atividadeInputs: { flexDirection: "row", gap: 8 },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, marginTop: 8,
  },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
});
