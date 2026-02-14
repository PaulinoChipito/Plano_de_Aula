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
import {
  generateId,
  saveLessonPlan,
  getApiKey,
  LessonPlan,
} from "@/lib/storage";

export default function CreatePlanScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const [classe, setClasse] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [tema, setTema] = useState("");
  const [duracao, setDuracao] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<LessonPlan | null>(null);

  const [editSumario, setEditSumario] = useState("");
  const [editObjetivoGeral, setEditObjetivoGeral] = useState("");

  const canGenerate =
    classe.trim() && disciplina.trim() && tema.trim() && duracao.trim();

  const generateWithAI = async () => {
    const apiKey = await getApiKey();
    if (!apiKey) {
      Alert.alert(
        "Chave API em falta",
        "Configure a sua chave API OpenAI nas Definicoes antes de gerar planos.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Ir para Definicoes",
            onPress: () => router.push("/settings"),
          },
        ],
      );
      return;
    }

    setLoading(true);
    try {
      const prompt = `Gera um plano de aula completo e detalhado em portugues com os seguintes dados:
- Classe: ${classe}
- Disciplina: ${disciplina}
- Tema: ${tema}
- Duracao: ${duracao} minutos

Responde APENAS com um JSON valido (sem markdown, sem \`\`\`) com esta estrutura exacta:
{
  "sumario": "resumo do plano",
  "objetivoGeral": "objetivo geral da aula",
  "objetivosEspecificos": ["obj1", "obj2", "obj3"],
  "metodos": "metodos de ensino",
  "meios": "meios de ensino",
  "atividades": [{"descricao": "actividade", "tempo": "10 min"}],
  "perguntasControlo": ["pergunta1", "pergunta2"],
  "perguntasTarefa": ["tarefa1", "tarefa2"],
  "score": 85,
  "sugestoes": ["sugestao1", "sugestao2", "sugestao3"]
}

O score pedagogico deve ser entre 0-100 baseado na qualidade e completude do plano.
As sugestoes devem ser 3 melhorias rapidas para aumentar o score.`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Es um especialista em pedagogia e planificacao de aulas. Responde sempre em portugues e apenas com JSON valido, sem formatacao markdown.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleanContent);

      const plan: LessonPlan = {
        id: generateId(),
        classe,
        disciplina,
        tema,
        duracao,
        sumario: parsed.sumario || "",
        objetivoGeral: parsed.objetivoGeral || "",
        objetivosEspecificos: parsed.objetivosEspecificos || [],
        metodos: parsed.metodos || "",
        meios: parsed.meios || "",
        atividades: parsed.atividades || [],
        perguntasControlo: parsed.perguntasControlo || [],
        perguntasTarefa: parsed.perguntasTarefa || [],
        score: parsed.score || 75,
        sugestoes: parsed.sugestoes || [],
        createdAt: new Date().toISOString(),
      };

      setGeneratedPlan(plan);
      setEditSumario(plan.sumario);
      setEditObjetivoGeral(plan.objetivoGeral);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      Alert.alert(
        "Erro ao gerar",
        error.message || "Verifique a sua chave API e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedPlan) return;
    const updatedPlan = {
      ...generatedPlan,
      sumario: editSumario,
      objetivoGeral: editObjetivoGeral,
    };
    await saveLessonPlan(updatedPlan);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return Colors.success;
    if (score >= 60) return Colors.warning;
    return Colors.error;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
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
          contentContainerStyle={[
            styles.content,
            { paddingBottom: bottomPadding + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {!generatedPlan ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Classe</Text>
                <TextInput
                  style={styles.input}
                  value={classe}
                  onChangeText={setClasse}
                  placeholder="Ex: 10a Classe"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Disciplina</Text>
                <TextInput
                  style={styles.input}
                  value={disciplina}
                  onChangeText={setDisciplina}
                  placeholder="Ex: Matematica"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tema</Text>
                <TextInput
                  style={styles.input}
                  value={tema}
                  onChangeText={setTema}
                  placeholder="Ex: Equacoes do 2o grau"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Duracao (minutos)</Text>
                <TextInput
                  style={styles.input}
                  value={duracao}
                  onChangeText={setDuracao}
                  placeholder="Ex: 45"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

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
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="robot"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.generateBtnText}>Gerar com IA</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.scoreCard}>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Score Pedagogico</Text>
                  <View
                    style={[
                      styles.scoreBadge,
                      {
                        backgroundColor:
                          getScoreColor(generatedPlan.score) + "15",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scoreValue,
                        { color: getScoreColor(generatedPlan.score) },
                      ]}
                    >
                      {generatedPlan.score}/100
                    </Text>
                  </View>
                </View>

                {generatedPlan.sugestoes.length > 0 && (
                  <View style={styles.sugestoesContainer}>
                    {generatedPlan.sugestoes.map((s, i) => (
                      <View key={i} style={styles.sugestaoItem}>
                        <Feather
                          name="zap"
                          size={14}
                          color={Colors.accent}
                        />
                        <Text style={styles.sugestaoText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Sumario</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editSumario}
                  onChangeText={setEditSumario}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Objetivo Geral</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editObjetivoGeral}
                  onChangeText={setEditObjetivoGeral}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.readOnlySection}>
                <Text style={styles.editLabel}>Objetivos Especificos</Text>
                {generatedPlan.objetivosEspecificos.map((obj, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>{obj}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.readOnlySection}>
                <Text style={styles.editLabel}>Metodos de Ensino</Text>
                <Text style={styles.readOnlyText}>
                  {generatedPlan.metodos}
                </Text>
              </View>

              <View style={styles.readOnlySection}>
                <Text style={styles.editLabel}>Meios de Ensino</Text>
                <Text style={styles.readOnlyText}>{generatedPlan.meios}</Text>
              </View>

              <View style={styles.readOnlySection}>
                <Text style={styles.editLabel}>Sequencia de Atividades</Text>
                {generatedPlan.atividades.map((at, i) => (
                  <View key={i} style={styles.atividadeItem}>
                    <View style={styles.atividadeNum}>
                      <Text style={styles.atividadeNumText}>{i + 1}</Text>
                    </View>
                    <View style={styles.atividadeContent}>
                      <Text style={styles.atividadeDesc}>{at.descricao}</Text>
                      <Text style={styles.atividadeTempo}>{at.tempo}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.readOnlySection}>
                <Text style={styles.editLabel}>Perguntas de Controlo</Text>
                {generatedPlan.perguntasControlo.map((p, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Feather
                      name="help-circle"
                      size={14}
                      color={Colors.primary}
                    />
                    <Text style={styles.bulletText}>{p}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.readOnlySection}>
                <Text style={styles.editLabel}>Perguntas de Tarefa</Text>
                {generatedPlan.perguntasTarefa.map((p, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Feather
                      name="edit-3"
                      size={14}
                      color={Colors.accent}
                    />
                    <Text style={styles.bulletText}>{p}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.saveBtn,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
              >
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  generateBtnDisabled: {
    backgroundColor: Colors.textMuted,
  },
  generateBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scoreValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  sugestoesContainer: {
    marginTop: 14,
    gap: 8,
  },
  sugestaoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  sugestaoText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  editSection: {
    gap: 6,
  },
  editLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  readOnlySection: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  readOnlyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 2,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  atividadeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  atividadeNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  atividadeNumText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  atividadeContent: {
    flex: 1,
  },
  atividadeDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  atividadeTempo: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.success,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  saveBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
});
