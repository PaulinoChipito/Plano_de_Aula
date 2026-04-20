import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { generateId, saveLessonPlan, LessonPlan } from "@/lib/storage";
import {
  generateLessonPlanOffline,
  GenerationStatus,
} from "@/lib/localAI";

export default function CreatePlanScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [classe, setClasse] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [tema, setTema] = useState("");
  const [duracao, setDuracao] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"choose" | "manual" | "ai">("choose");

  const [sumario, setSumario] = useState("");
  const [objetivoGeral, setObjetivoGeral] = useState("");
  const [objetivosEspecificos, setObjetivosEspecificos] = useState<string[]>([""]);
  const [metodos, setMetodos] = useState("");
  const [meios, setMeios] = useState("");
  const [atividades, setAtividades] = useState<{ descricao: string; tempo: string }[]>([{ descricao: "", tempo: "" }]);
  const [perguntasControlo, setPerguntasControlo] = useState<string[]>([""]);
  const [perguntasTarefa, setPerguntasTarefa] = useState<string[]>([""]);

  const [aiPlan, setAiPlan] = useState<LessonPlan | null>(null);
  const [editSumario, setEditSumario] = useState("");
  const [editObjetivoGeral, setEditObjetivoGeral] = useState("");
  const [genStatus, setGenStatus] = useState<GenerationStatus>({ stage: "idle" });

  const canGenerate =
    classe.trim() && disciplina.trim() && tema.trim() && duracao.trim();
  const canSaveManual =
    classe.trim() && disciplina.trim() && tema.trim() && duracao.trim() && sumario.trim();

  const sumarioParaIA = sumario.trim();

  const generateWithAI = async () => {
    setLoading(true);
    setGenStatus({ stage: "idle" });
    try {
      const result = await generateLessonPlanOffline(
        classe,
        disciplina,
        tema,
        duracao,
        (status) => setGenStatus(status),
        sumarioParaIA,
      );

      const plan: LessonPlan = {
        id: generateId(),
        classe,
        disciplina,
        tema,
        duracao,
        sumario: sumarioParaIA || result.sumario,
        objetivoGeral: result.objetivoGeral,
        objetivosEspecificos: result.objetivosEspecificos,
        conteudos: result.conteudos,
        metodosPrincipais: result.metodosPrincipais,
        metodos: result.metodos,
        meios: result.meios,
        desenvolvimentoAula: result.desenvolvimentoAula,
        atividades: result.desenvolvimentoAula.map((e) => ({
          descricao: `${e.etapa} — Prof: ${e.actividadesProfessor}`,
          tempo: e.duracao,
        })),
        perguntasControlo: result.perguntasControlo,
        tarefaDeCasa: result.tarefaDeCasa,
        tarefasPraticas: result.tarefasPraticas,
        perguntasTarefa: result.tarefasPraticas,
        avaliacao: result.avaliacao,
        diferenciacaoPedagogica: result.diferenciacaoPedagogica,
        faixaEtaria: result.faixaEtaria,
        observacoes: result.observacoes,
        score: result.score,
        sugestoes: result.sugestoes,
        createdAt: new Date().toISOString(),
      };

      setAiPlan(plan);
      setEditSumario(plan.sumario);
      setEditObjetivoGeral(plan.objetivoGeral);
      setGenStatus({ stage: "done" });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      setGenStatus({ stage: "error", error: error.message });
      Alert.alert(
        "Erro ao gerar",
        Platform.OS === "web"
          ? "Ocorreu um erro ao carregar o modelo de IA. Verifique a sua ligação à internet para a primeira descarga."
          : "Não foi possível gerar o plano. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAI = async () => {
    if (!aiPlan) return;
    const updatedPlan: LessonPlan = {
      ...aiPlan,
      sumario: editSumario,
      objetivoGeral: editObjetivoGeral,
    };
    await saveLessonPlan(updatedPlan);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
  };

  const handleSaveManual = async () => {
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
      tarefasPraticas: perguntasTarefa.filter((p) => p.trim()),
      perguntasTarefa: perguntasTarefa.filter((p) => p.trim()),
      score: 0,
      sugestoes: [],
      createdAt: new Date().toISOString(),
    };
    await saveLessonPlan(plan);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
  };

  const addListItem = (
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
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

  const addAtividade = () => {
    setAtividades([...atividades, { descricao: "", tempo: "" }]);
  };

  const updateAtividade = (index: number, field: "descricao" | "tempo", value: string) => {
    const updated = [...atividades];
    updated[index] = { ...updated[index], [field]: value };
    setAtividades(updated);
  };

  const removeAtividade = (index: number) => {
    if (atividades.length <= 1) return;
    setAtividades(atividades.filter((_, i) => i !== index));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return Colors.success;
    if (score >= 60) return Colors.warning;
    return Colors.error;
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
              <Ionicons name="close" size={18} color={Colors.error} />
            </Pressable>
          )}
        </View>
      ))}
      <Pressable onPress={() => addListItem(list, setter)} style={styles.addItemBtn}>
        <Ionicons name="add" size={16} color={Colors.primary} />
        <Text style={styles.addItemText}>Adicionar</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Novo Plano</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {mode === "choose" && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Classe</Text>
                <TextInput style={styles.input} value={classe} onChangeText={setClasse} placeholder="Ex: 10a Classe" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Disciplina</Text>
                <TextInput style={styles.input} value={disciplina} onChangeText={setDisciplina} placeholder="Ex: Matematica" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tema</Text>
                <TextInput style={styles.input} value={tema} onChangeText={setTema} placeholder="Ex: Equacoes do 2o grau" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Sumario</Text>
                <Text style={styles.labelHint}>Descreva brevemente o que vai ser ensinado. A IA usará este texto para criar um plano mais específico.</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={sumario}
                  onChangeText={setSumario}
                  multiline
                  placeholder="Ex: Revisao dos numeros naturais, introducao ao conceito de equacao, resolucao de equacoes simples com uma incognita..."
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Duracao (minutos)</Text>
                <TextInput style={styles.input} value={duracao} onChangeText={setDuracao} placeholder="Ex: 45" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
              </View>

              <View style={styles.modeButtons}>
                <Pressable
                  onPress={generateWithAI}
                  disabled={!canGenerate || loading}
                  style={({ pressed }) => [
                    styles.generateBtn,
                    !canGenerate && styles.generateBtnDisabled,
                    { opacity: pressed && canGenerate ? 0.9 : 1 },
                  ]}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.generateBtnText} numberOfLines={1}>
                        {genStatus.message || "A gerar..."}
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons name="robot" size={20} color="#fff" />
                      <Text style={styles.generateBtnText}>Gerar com IA</Text>
                    </>
                  )}
                </Pressable>
                {loading && genStatus.stage === "downloading" && typeof genStatus.progress === "number" && (
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${genStatus.progress}%` as any }]} />
                  </View>
                )}
                <View style={styles.aiInfoCard}>
                  <MaterialCommunityIcons name="chip" size={14} color={Colors.primary} />
                  <Text style={styles.aiInfoText}>
                    {Platform.OS === "web"
                      ? "Usa o modelo Qwen2.5-0.5B localmente no browser (sem envio de dados). Primeira utilização requer descarga (~300 MB)."
                      : "Geração offline baseada em modelos pedagógicos. Sem necessidade de internet ou chave API."}
                  </Text>
                </View>

                <Pressable
                  onPress={() => setMode("manual")}
                  disabled={!canGenerate}
                  style={({ pressed }) => [
                    styles.manualBtn,
                    !canGenerate && styles.manualBtnDisabled,
                    { opacity: pressed && canGenerate ? 0.9 : 1 },
                  ]}
                >
                  <Feather name="edit" size={18} color={canGenerate ? Colors.primary : Colors.textMuted} />
                  <Text style={[styles.manualBtnText, !canGenerate && { color: Colors.textMuted }]}>
                    Criar Manualmente
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {mode === "manual" && (
            <>
              <View style={styles.modeHeader}>
                <Feather name="edit" size={18} color={Colors.primary} />
                <Text style={styles.modeHeaderText}>Modo Manual - Offline</Text>
              </View>

              <View style={styles.metaChips}>
                <View style={styles.metaChip}><Text style={styles.metaChipText}>{classe}</Text></View>
                <View style={styles.metaChip}><Text style={styles.metaChipText}>{disciplina}</Text></View>
                <View style={styles.metaChip}><Text style={styles.metaChipText}>{duracao} min</Text></View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Sumario</Text>
                <TextInput style={[styles.input, styles.textArea]} value={sumario} onChangeText={setSumario} multiline placeholder="Resumo da aula..." placeholderTextColor={Colors.textMuted} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Objetivo Geral</Text>
                <TextInput style={[styles.input, styles.textArea]} value={objetivoGeral} onChangeText={setObjetivoGeral} multiline placeholder="Objetivo geral da aula..." placeholderTextColor={Colors.textMuted} />
              </View>

              {renderDynamicList("Objetivos Especificos", objetivosEspecificos, setObjetivosEspecificos, "Objetivo")}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Metodos de Ensino</Text>
                <TextInput style={[styles.input, styles.textArea]} value={metodos} onChangeText={setMetodos} multiline placeholder="Ex: Expositivo, elaboracao conjunta..." placeholderTextColor={Colors.textMuted} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Meios de Ensino</Text>
                <TextInput style={[styles.input, styles.textArea]} value={meios} onChangeText={setMeios} multiline placeholder="Ex: Quadro, giz, livro..." placeholderTextColor={Colors.textMuted} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Sequencia de Atividades</Text>
                {atividades.map((at, i) => (
                  <View key={i} style={styles.atividadeInputRow}>
                    <View style={styles.atividadeInputs}>
                      <TextInput style={[styles.input, { flex: 1 }]} value={at.descricao} onChangeText={(v) => updateAtividade(i, "descricao", v)} placeholder={`Atividade ${i + 1}`} placeholderTextColor={Colors.textMuted} />
                      <TextInput style={[styles.input, { width: 80 }]} value={at.tempo} onChangeText={(v) => updateAtividade(i, "tempo", v)} placeholder="Tempo" placeholderTextColor={Colors.textMuted} />
                    </View>
                    {atividades.length > 1 && (
                      <Pressable onPress={() => removeAtividade(i)} style={styles.removeBtn}>
                        <Ionicons name="close" size={18} color={Colors.error} />
                      </Pressable>
                    )}
                  </View>
                ))}
                <Pressable onPress={addAtividade} style={styles.addItemBtn}>
                  <Ionicons name="add" size={16} color={Colors.primary} />
                  <Text style={styles.addItemText}>Adicionar atividade</Text>
                </Pressable>
              </View>

              {renderDynamicList("Perguntas de Controlo", perguntasControlo, setPerguntasControlo, "Pergunta")}
              {renderDynamicList("Perguntas de Tarefa", perguntasTarefa, setPerguntasTarefa, "Tarefa")}

              <Pressable
                onPress={handleSaveManual}
                disabled={!canSaveManual}
                style={({ pressed }) => [
                  styles.saveBtn,
                  !canSaveManual && { backgroundColor: Colors.textMuted },
                  { opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Feather name="check" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Guardar Plano</Text>
              </Pressable>
            </>
          )}

          {aiPlan && (
            <>
              <View style={styles.scoreCard}>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Score Pedagogico</Text>
                  <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(aiPlan.score) + "15" }]}>
                    <Text style={[styles.scoreValue, { color: getScoreColor(aiPlan.score) }]}>{aiPlan.score}/100</Text>
                  </View>
                </View>
                {aiPlan.sugestoes.length > 0 && (
                  <View style={styles.sugestoesContainer}>
                    {aiPlan.sugestoes.map((s, i) => (
                      <View key={i} style={styles.sugestaoItem}>
                        <Feather name="zap" size={14} color={Colors.accent} />
                        <Text style={styles.sugestaoText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Sumario</Text>
                <TextInput style={[styles.input, styles.textArea]} value={editSumario} onChangeText={setEditSumario} multiline numberOfLines={3} />
              </View>

              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Objetivo Geral</Text>
                <TextInput style={[styles.input, styles.textArea]} value={editObjetivoGeral} onChangeText={setEditObjetivoGeral} multiline numberOfLines={2} />
              </View>

              {aiPlan.conteudos && aiPlan.conteudos.length > 0 && (
                <View style={styles.readOnlySection}>
                  <Text style={styles.editLabel}>Conteudos</Text>
                  {aiPlan.conteudos.map((c, i) => (
                    <View key={i} style={styles.bulletItem}>
                      <View style={styles.bullet} />
                      <Text style={styles.bulletText}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.readOnlySection}>
                <Text style={styles.editLabel}>Objetivos Especificos</Text>
                {aiPlan.objetivosEspecificos.map((obj, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>{obj}</Text>
                  </View>
                ))}
              </View>

              {aiPlan.metodosPrincipais && (
                <View style={styles.readOnlySection}>
                  <Text style={styles.editLabel}>Metodo(s) Principal(is)</Text>
                  <Text style={[styles.readOnlyText, { color: Colors.primary, fontWeight: "600" }]}>{aiPlan.metodosPrincipais}</Text>
                </View>
              )}

              <View style={styles.readOnlySection}>
                <Text style={styles.editLabel}>Metodos, Tecnicas e Meios de Ensino</Text>
                <Text style={styles.readOnlyText}>{aiPlan.metodos}</Text>
                {aiPlan.meios ? <Text style={[styles.readOnlyText, { marginTop: 4 }]}>Meios: {aiPlan.meios}</Text> : null}
              </View>

              {aiPlan.desenvolvimentoAula && aiPlan.desenvolvimentoAula.length > 0 && (
                <View style={styles.readOnlySection}>
                  <Text style={styles.editLabel}>Desenvolvimento da Aula</Text>
                  {aiPlan.desenvolvimentoAula.map((etapa, i) => (
                    <View key={i} style={styles.etapaCard}>
                      <View style={styles.etapaHeader}>
                        <Text style={styles.etapaNome}>{etapa.etapa}</Text>
                        <Text style={styles.etapaDuracao}>{etapa.duracao}</Text>
                      </View>
                      <Text style={styles.etapaRoleLabel}>Professor:</Text>
                      <Text style={styles.etapaRoleText}>{etapa.actividadesProfessor}</Text>
                      <Text style={styles.etapaRoleLabel}>Alunos:</Text>
                      <Text style={styles.etapaRoleText}>{etapa.actividadesAlunos}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.readOnlySection}>
                <Text style={styles.editLabel}>Perguntas de Controlo</Text>
                {aiPlan.perguntasControlo.map((p, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Feather name="help-circle" size={14} color={Colors.primary} />
                    <Text style={styles.bulletText}>{p}</Text>
                  </View>
                ))}
              </View>

              {aiPlan.tarefaDeCasa && aiPlan.tarefaDeCasa.length > 0 && (
                <View style={styles.readOnlySection}>
                  <Text style={styles.editLabel}>TPC — Tarefa de Casa</Text>
                  {aiPlan.tarefaDeCasa.map((t, i) => (
                    <View key={i} style={styles.tpcItem}>
                      <Feather name="book-open" size={14} color={Colors.accent} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bulletText}>{t.descricao}</Text>
                        {t.referencia ? <Text style={styles.tpcMeta}>{t.referencia}</Text> : null}
                        {t.tempoEstimado ? <Text style={styles.tpcMeta}>Tempo: {t.tempoEstimado}</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {aiPlan.avaliacao && (
                <View style={styles.readOnlySection}>
                  <Text style={styles.editLabel}>Avaliacao Formativa</Text>
                  <Text style={styles.readOnlyText}>{aiPlan.avaliacao}</Text>
                </View>
              )}

              {aiPlan.diferenciacaoPedagogica && (
                <View style={styles.readOnlySection}>
                  <Text style={styles.editLabel}>Diferenciacao Pedagogica</Text>
                  <Text style={[styles.tpcMeta, { marginBottom: 2 }]}>Alunos com dificuldades:</Text>
                  <Text style={styles.readOnlyText}>{aiPlan.diferenciacaoPedagogica.dificuldades}</Text>
                  <Text style={[styles.tpcMeta, { marginTop: 8, marginBottom: 2 }]}>Alunos avancados:</Text>
                  <Text style={styles.readOnlyText}>{aiPlan.diferenciacaoPedagogica.avancados}</Text>
                </View>
              )}

              <Pressable onPress={handleSaveAI} style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.9 : 1 }]}>
                <Feather name="check" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Guardar Plano</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: { padding: 20, gap: 16 },
  inputGroup: { gap: 8 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  input: {
    backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  modeButtons: { gap: 12, marginTop: 4 },
  generateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
  },
  generateBtnDisabled: { backgroundColor: Colors.textMuted },
  generateBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  manualBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.surface, borderRadius: 14, paddingVertical: 16,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  manualBtnDisabled: { borderColor: Colors.textMuted },
  manualBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.primary },
  modeHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.primary + "10", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  modeHeaderText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
  metaChips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metaChip: { backgroundColor: Colors.primary + "12", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  metaChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.primary },
  dynamicRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  removeBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.error + "10",
    alignItems: "center", justifyContent: "center",
  },
  addItemBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.primary + "10",
  },
  addItemText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.primary },
  atividadeInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  atividadeInputs: { flex: 1, flexDirection: "row", gap: 8 },
  scoreCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scoreLabel: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  scoreValue: { fontFamily: "Inter_700Bold", fontSize: 16 },
  sugestoesContainer: { marginTop: 14, gap: 8 },
  sugestaoItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  sugestaoText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  editSection: { gap: 6 },
  editLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 4 },
  readOnlySection: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, gap: 8 },
  readOnlyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  bulletItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 2 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 6 },
  bulletText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  atividadeItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  atividadeNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary + "15", alignItems: "center", justifyContent: "center" },
  atividadeNumText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.primary },
  atividadeContent: { flex: 1 },
  atividadeDesc: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  atividadeTempo: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.primary, marginTop: 2 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.success, borderRadius: 14, paddingVertical: 16, marginTop: 8,
  },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  progressBarContainer: {
    height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden",
  },
  progressBar: {
    height: 4, backgroundColor: Colors.primary, borderRadius: 2,
  },
  aiInfoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: Colors.primary + "0D", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  aiInfoText: {
    flex: 1, fontFamily: "Inter_400Regular", fontSize: 12,
    color: Colors.textSecondary, lineHeight: 17,
  },
  etapaCard: {
    backgroundColor: Colors.background, borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  etapaHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6,
  },
  etapaNome: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  etapaDuracao: {
    fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.primary,
    backgroundColor: Colors.primary + "12", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  etapaRoleLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  etapaRoleText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 2 },
  tpcItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 4 },
  tpcMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.primary, marginTop: 2, fontStyle: "italic" },
  labelHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginBottom: 6, lineHeight: 16 },
});
