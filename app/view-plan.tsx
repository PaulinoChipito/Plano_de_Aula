import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import Colors from "@/constants/colors";
import {
  getLessonPlans,
  saveLessonPlan,
  getTeacherProfile,
  LessonPlan,
  TeacherProfile,
} from "@/lib/storage";

export default function ViewPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile>({ nome: "", instituicao: "", disciplina: "" });

  const [editClasse, setEditClasse] = useState("");
  const [editDisciplina, setEditDisciplina] = useState("");
  const [editTema, setEditTema] = useState("");
  const [editDuracao, setEditDuracao] = useState("");
  const [editSumario, setEditSumario] = useState("");
  const [editObjetivoGeral, setEditObjetivoGeral] = useState("");
  const [editObjEspecificos, setEditObjEspecificos] = useState<string[]>([]);
  const [editMetodos, setEditMetodos] = useState("");
  const [editMeios, setEditMeios] = useState("");
  const [editAtividades, setEditAtividades] = useState<{ descricao: string; tempo: string }[]>([]);
  const [editPerguntasControlo, setEditPerguntasControlo] = useState<string[]>([]);
  const [editPerguntasTarefa, setEditPerguntasTarefa] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([getLessonPlans(), getTeacherProfile()]).then(([plans, tp]) => {
      const found = plans.find((p) => p.id === id);
      if (found) setPlan(found);
      setProfile(tp);
    });
  }, [id]);

  const startEditing = () => {
    if (!plan) return;
    setEditClasse(plan.classe);
    setEditDisciplina(plan.disciplina);
    setEditTema(plan.tema);
    setEditDuracao(plan.duracao);
    setEditSumario(plan.sumario);
    setEditObjetivoGeral(plan.objetivoGeral);
    setEditObjEspecificos([...plan.objetivosEspecificos]);
    setEditMetodos(plan.metodos);
    setEditMeios(plan.meios);
    setEditAtividades(plan.atividades.map((a) => ({ ...a })));
    setEditPerguntasControlo([...plan.perguntasControlo]);
    setEditPerguntasTarefa([...plan.perguntasTarefa]);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!plan) return;
    const updated: LessonPlan = {
      ...plan,
      classe: editClasse,
      disciplina: editDisciplina,
      tema: editTema,
      duracao: editDuracao,
      sumario: editSumario,
      objetivoGeral: editObjetivoGeral,
      objetivosEspecificos: editObjEspecificos.filter((o) => o.trim()),
      metodos: editMetodos,
      meios: editMeios,
      atividades: editAtividades.filter((a) => a.descricao.trim()),
      perguntasControlo: editPerguntasControlo.filter((p) => p.trim()),
      perguntasTarefa: editPerguntasTarefa.filter((p) => p.trim()),
    };
    await saveLessonPlan(updated);
    setPlan(updated);
    setEditing(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const updateListItem = (list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    const updated = [...list];
    updated[index] = value;
    setter(updated);
  };

  const addListItem = (list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter([...list, ""]);
  };

  const removeListItem = (list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    if (list.length <= 1) return;
    setter(list.filter((_, i) => i !== index));
  };

  const generatePdfHtml = (p: LessonPlan): string => {
    const dataFormatada = new Date(p.createdAt).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const objEspHtml = p.objetivosEspecificos.map((o) => `<li>${o}</li>`).join("");
    const conteudosHtml = (p.conteudos || []).map((c) => `<li>${c}</li>`).join("");
    const pergControloHtml = p.perguntasControlo.map((q) => `<li>${q}</li>`).join("");
    const tarefasPraticasHtml = (p.tarefasPraticas || p.perguntasTarefa || []).map((t) => `<li>${t}</li>`).join("");

    const desenvolvimentoHtml = (p.desenvolvimentoAula && p.desenvolvimentoAula.length > 0)
      ? p.desenvolvimentoAula.map((e) =>
          `<tr>
            <td style="font-weight:600;width:100px;vertical-align:top;">${e.etapa}<br><span style="font-weight:400;font-size:9pt;color:#0D7377;">${e.duracao}</span></td>
            <td style="vertical-align:top;">${e.actividadesProfessor}</td>
            <td style="vertical-align:top;">${e.actividadesAlunos}</td>
          </tr>`
        ).join("")
      : p.atividades.map((a, i) =>
          `<tr>
            <td style="text-align:center;font-weight:600;width:40px;">${i + 1}</td>
            <td>${a.descricao}</td>
            <td style="text-align:center;width:80px;">${a.tempo}</td>
          </tr>`
        ).join("");

    const hasDesenvolvimento = p.desenvolvimentoAula && p.desenvolvimentoAula.length > 0;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11pt; color: #222; line-height: 1.5; }
  .header { text-align: center; border-bottom: 2px solid #0D7377; padding-bottom: 14px; margin-bottom: 18px; }
  .header h1 { font-size: 16pt; color: #0D7377; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
  .header h2 { font-size: 12pt; color: #555; font-weight: 400; }
  .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  .meta-table td { padding: 6px 10px; border: 1px solid #ddd; font-size: 10pt; }
  .meta-table td.label { background: #f0f9f9; font-weight: 600; width: 28%; color: #0D7377; }
  .section { margin-bottom: 14px; }
  .section-title { font-size: 11pt; font-weight: 700; color: #0D7377; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  .section p { text-align: justify; }
  .section-meta { font-size: 10pt; color: #555; font-style: italic; margin-bottom: 4px; }
  ul { padding-left: 18px; }
  ul li { margin-bottom: 3px; }
  table.dev { width: 100%; border-collapse: collapse; margin-top: 6px; }
  table.dev th { background: #0D7377; color: #fff; padding: 7px 8px; font-size: 10pt; text-align: left; }
  table.dev td { padding: 7px 8px; border: 1px solid #ddd; font-size: 10pt; vertical-align: top; }
  table.dev tr:nth-child(even) td { background: #f9f9f9; }
  .avaliacao-box { background: #f0f9f9; border-left: 3px solid #0D7377; padding: 10px 14px; border-radius: 4px; font-size: 10pt; }
  .obs-box { background: #fffde7; border-left: 3px solid #f9a825; padding: 10px 14px; border-radius: 4px; font-size: 10pt; }
  .footer { margin-top: 30px; text-align: center; font-size: 9pt; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
</style>
</head>
<body>
  <div class="header">
    <h1>${profile.instituicao || "Instituicao de Ensino"}</h1>
    <h2>Plano de Aula</h2>
  </div>

  <table class="meta-table">
    <tr>
      <td class="label">Disciplina</td>
      <td>${p.disciplina}</td>
      <td class="label">Classe / Ano</td>
      <td>${p.classe}</td>
    </tr>
    <tr>
      <td class="label">Sumario</td>
      <td colspan="3">${p.sumario}</td>
    </tr>
    <tr>
      <td class="label">Duracao</td>
      <td>${p.duracao} minutos</td>
      <td class="label">N.º de Alunos</td>
      <td>${p.numAlunos || "---"}</td>
    </tr>
    <tr>
      <td class="label">Data</td>
      <td>${dataFormatada}</td>
      <td class="label">Professor(a)</td>
      <td>${profile.nome || "---"}</td>
    </tr>
    ${p.metodosPrincipais ? `<tr><td class="label">Metodo(s) Principal(is)</td><td colspan="3">${p.metodosPrincipais}</td></tr>` : ""}
  </table>

  <div class="section">
    <div class="section-title">Objectivo Geral</div>
    <p>${p.objetivoGeral}</p>
  </div>

  ${p.objetivosEspecificos.length > 0 ? `
  <div class="section">
    <div class="section-title">Objectivos Especificos</div>
    <ul>${objEspHtml}</ul>
  </div>` : ""}

  ${conteudosHtml ? `
  <div class="section">
    <div class="section-title">Conteudos</div>
    <ul>${conteudosHtml}</ul>
  </div>` : ""}

  <div class="section">
    <div class="section-title">Metodos, Tecnicas e Meios de Ensino</div>
    <p>${p.metodos}</p>
    ${p.meios ? `<p style="margin-top:6px;"><strong>Meios:</strong> ${p.meios}</p>` : ""}
  </div>

  <div class="section">
    <div class="section-title">Desenvolvimento da Aula</div>
    <table class="dev">
      <thead>
        <tr>
          ${hasDesenvolvimento
            ? `<th style="width:120px;">Etapa / Momento</th><th>Actividades do Professor</th><th>Actividades dos Alunos</th>`
            : `<th style="width:40px;text-align:center;">N</th><th>Descricao</th><th style="width:80px;text-align:center;">Tempo</th>`
          }
        </tr>
      </thead>
      <tbody>${desenvolvimentoHtml}</tbody>
    </table>
  </div>

  ${pergControloHtml ? `
  <div class="section">
    <div class="section-title">Perguntas de Controlo</div>
    <ul>${pergControloHtml}</ul>
  </div>` : ""}

  ${tarefasPraticasHtml ? `
  <div class="section">
    <div class="section-title">Tarefa Pratica</div>
    <ul>${tarefasPraticasHtml}</ul>
  </div>` : ""}

  ${p.avaliacao ? `
  <div class="section">
    <div class="section-title">Avaliacao</div>
    <div class="avaliacao-box">${p.avaliacao}</div>
  </div>` : ""}

  ${p.observacoes ? `
  <div class="section">
    <div class="section-title">Observacoes</div>
    <div class="obs-box">${p.observacoes}</div>
  </div>` : ""}

  <div class="footer">
    ${profile.instituicao || "Lesson Planner Pro"} &bull; ${dataFormatada}
  </div>
</body>
</html>`;
  };

  const handleDownloadPdf = async () => {
    if (!plan) return;
    setGenerating(true);
    try {
      const html = generatePdfHtml(plan);
      const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });

      if (Platform.OS === "web") {
        await Print.printAsync({ html });
      } else {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
        } else {
          Alert.alert("PDF Gerado", "O ficheiro PDF foi salvo no dispositivo.");
        }
      }

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Erro", "Nao foi possivel gerar o PDF: " + (error.message || ""));
    } finally {
      setGenerating(false);
    }
  };

  if (!plan) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 60 }]}>
        <Text style={styles.emptyText}>Plano nao encontrado</Text>
      </View>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return Colors.success;
    if (score >= 60) return Colors.warning;
    return Colors.error;
  };

  const renderEditableList = (
    label: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    placeholder: string,
  ) => (
    <View style={styles.editGroup}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {list.map((item, i) => (
        <View key={i} style={styles.dynamicRow}>
          <TextInput
            style={[styles.editInput, { flex: 1 }]}
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
          onPress={() => { if (editing) { setEditing(false); } else { router.back(); } }}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name={editing ? "close" : "chevron-back"} size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {editing ? "Editar Plano" : plan.tema}
        </Text>
        {editing ? (
          <Pressable onPress={handleSaveEdit} style={({ pressed }) => [styles.saveHeaderBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons name="checkmark" size={24} color={Colors.success} />
          </Pressable>
        ) : (
          <View style={styles.headerActions}>
            <Pressable onPress={startEditing} style={({ pressed }) => [styles.headerActionBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <Feather name="edit-2" size={18} color={Colors.primary} />
            </Pressable>
            <Pressable
              onPress={handleDownloadPdf}
              disabled={generating}
              style={({ pressed }) => [styles.headerActionBtn, { opacity: pressed || generating ? 0.7 : 1 }]}
            >
              {generating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Feather name="download" size={18} color={Colors.primary} />
              )}
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {editing ? (
          <>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>Classe</Text>
              <TextInput style={styles.editInput} value={editClasse} onChangeText={setEditClasse} placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>Disciplina</Text>
              <TextInput style={styles.editInput} value={editDisciplina} onChangeText={setEditDisciplina} placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>Tema</Text>
              <TextInput style={styles.editInput} value={editTema} onChangeText={setEditTema} placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>Duracao (minutos)</Text>
              <TextInput style={styles.editInput} value={editDuracao} onChangeText={setEditDuracao} keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>Sumario</Text>
              <TextInput style={[styles.editInput, styles.editTextArea]} value={editSumario} onChangeText={setEditSumario} multiline placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>Objetivo Geral</Text>
              <TextInput style={[styles.editInput, styles.editTextArea]} value={editObjetivoGeral} onChangeText={setEditObjetivoGeral} multiline placeholderTextColor={Colors.textMuted} />
            </View>

            {renderEditableList("Objetivos Especificos", editObjEspecificos, setEditObjEspecificos, "Objetivo")}

            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>Metodos de Ensino</Text>
              <TextInput style={[styles.editInput, styles.editTextArea]} value={editMetodos} onChangeText={setEditMetodos} multiline placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>Meios de Ensino</Text>
              <TextInput style={[styles.editInput, styles.editTextArea]} value={editMeios} onChangeText={setEditMeios} multiline placeholderTextColor={Colors.textMuted} />
            </View>

            <View style={styles.editGroup}>
              <Text style={styles.sectionTitle}>Sequencia de Atividades</Text>
              {editAtividades.map((at, i) => (
                <View key={i} style={styles.atividadeEditRow}>
                  <View style={styles.atividadeEditInputs}>
                    <TextInput
                      style={[styles.editInput, { flex: 1 }]}
                      value={at.descricao}
                      onChangeText={(v) => {
                        const u = [...editAtividades];
                        u[i] = { ...u[i], descricao: v };
                        setEditAtividades(u);
                      }}
                      placeholder={`Atividade ${i + 1}`}
                      placeholderTextColor={Colors.textMuted}
                    />
                    <TextInput
                      style={[styles.editInput, { width: 80 }]}
                      value={at.tempo}
                      onChangeText={(v) => {
                        const u = [...editAtividades];
                        u[i] = { ...u[i], tempo: v };
                        setEditAtividades(u);
                      }}
                      placeholder="Tempo"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                  {editAtividades.length > 1 && (
                    <Pressable
                      onPress={() => setEditAtividades(editAtividades.filter((_, j) => j !== i))}
                      style={styles.removeBtn}
                    >
                      <Ionicons name="close" size={18} color={Colors.error} />
                    </Pressable>
                  )}
                </View>
              ))}
              <Pressable onPress={() => setEditAtividades([...editAtividades, { descricao: "", tempo: "" }])} style={styles.addItemBtn}>
                <Ionicons name="add" size={16} color={Colors.primary} />
                <Text style={styles.addItemText}>Adicionar atividade</Text>
              </Pressable>
            </View>

            {renderEditableList("Perguntas de Controlo", editPerguntasControlo, setEditPerguntasControlo, "Pergunta")}
            {renderEditableList("Perguntas de Tarefa", editPerguntasTarefa, setEditPerguntasTarefa, "Tarefa")}

            <Pressable onPress={handleSaveEdit} style={({ pressed }) => [styles.saveEditBtn, { opacity: pressed ? 0.9 : 1 }]}>
              <Feather name="check" size={20} color="#fff" />
              <Text style={styles.saveEditBtnText}>Guardar Alteracoes</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{plan.classe}</Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{plan.disciplina}</Text>
              </View>
              <View style={styles.metaChip}>
                <Feather name="clock" size={12} color={Colors.primary} />
                <Text style={styles.metaChipText}>{plan.duracao} min</Text>
              </View>
              {plan.score > 0 && (
                <View style={[styles.metaChip, { backgroundColor: getScoreColor(plan.score) + "15" }]}>
                  <Text style={[styles.metaChipText, { color: getScoreColor(plan.score) }]}>
                    Score: {plan.score}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sumario</Text>
              <Text style={styles.sectionText}>{plan.sumario}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Objetivo Geral</Text>
              <Text style={styles.sectionText}>{plan.objetivoGeral}</Text>
            </View>

            {plan.conteudos && plan.conteudos.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Conteudos</Text>
                {plan.conteudos.map((c, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}

            {plan.objetivosEspecificos.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Objectivos Especificos</Text>
                {plan.objetivosEspecificos.map((obj, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>{obj}</Text>
                  </View>
                ))}
              </View>
            )}

            {plan.metodosPrincipais ? (
              <View style={[styles.section, styles.metodosPrincSection]}>
                <Text style={styles.sectionTitleSmall}>Metodo(s) Principal(is)</Text>
                <Text style={styles.metodosPrincText}>{plan.metodosPrincipais}</Text>
              </View>
            ) : null}

            {(plan.metodos || plan.meios) ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Metodos, Tecnicas e Meios de Ensino</Text>
                {plan.metodos ? <Text style={styles.sectionText}>{plan.metodos}</Text> : null}
                {plan.meios ? (
                  <Text style={[styles.sectionText, { marginTop: 6 }]}>
                    <Text style={{ fontWeight: "600", color: Colors.text }}>Meios: </Text>
                    {plan.meios}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {plan.desenvolvimentoAula && plan.desenvolvimentoAula.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Desenvolvimento da Aula</Text>
                {plan.desenvolvimentoAula.map((etapa, i) => (
                  <View key={i} style={styles.etapaCard}>
                    <View style={styles.etapaHeader}>
                      <Text style={styles.etapaNome}>{etapa.etapa}</Text>
                      <Text style={styles.etapaDuracao}>{etapa.duracao}</Text>
                    </View>
                    <View style={styles.etapaRoleRow}>
                      <Text style={styles.etapaRoleLabel}>Professor:</Text>
                      <Text style={styles.etapaRoleText}>{etapa.actividadesProfessor}</Text>
                    </View>
                    <View style={styles.etapaRoleRow}>
                      <Text style={styles.etapaRoleLabel}>Alunos:</Text>
                      <Text style={styles.etapaRoleText}>{etapa.actividadesAlunos}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : plan.atividades.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sequencia de Actividades</Text>
                {plan.atividades.map((at, i) => (
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
            ) : null}

            {plan.perguntasControlo.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Perguntas de Controlo</Text>
                {plan.perguntasControlo.map((p, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Feather name="help-circle" size={14} color={Colors.primary} />
                    <Text style={styles.bulletText}>{p}</Text>
                  </View>
                ))}
              </View>
            )}

            {(plan.tarefasPraticas || plan.perguntasTarefa || []).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tarefa Pratica</Text>
                {(plan.tarefasPraticas || plan.perguntasTarefa || []).map((t, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Feather name="clipboard" size={14} color={Colors.accent} />
                    <Text style={styles.bulletText}>{t}</Text>
                  </View>
                ))}
              </View>
            )}

            {plan.avaliacao ? (
              <View style={[styles.section, styles.avaliacaoSection]}>
                <Text style={styles.sectionTitle}>Avaliacao</Text>
                <Text style={styles.sectionText}>{plan.avaliacao}</Text>
              </View>
            ) : null}

            {plan.observacoes ? (
              <View style={[styles.section, styles.observacoesSection]}>
                <Text style={styles.sectionTitle}>Observacoes</Text>
                <Text style={styles.sectionText}>{plan.observacoes}</Text>
              </View>
            ) : null}

            {plan.sugestoes.length > 0 && (
              <View style={[styles.section, styles.sugestoesSection]}>
                <Text style={styles.sectionTitle}>Sugestoes de Melhoria</Text>
                {plan.sugestoes.map((s, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Feather name="zap" size={14} color={Colors.accent} />
                    <Text style={styles.bulletText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              onPress={handleDownloadPdf}
              disabled={generating}
              style={({ pressed }) => [
                styles.downloadBtn,
                { opacity: pressed || generating ? 0.9 : 1 },
              ]}
            >
              {generating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="download" size={18} color="#fff" />
                  <Text style={styles.downloadBtnText}>Baixar PDF</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
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
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text, flex: 1, textAlign: "center" },
  saveHeaderBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerActions: { flexDirection: "row", gap: 4 },
  headerActionBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary + "12",
    alignItems: "center", justifyContent: "center",
  },
  content: { padding: 20, gap: 16 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 16, color: Colors.textSecondary, textAlign: "center" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.primary + "12", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  metaChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.primary },
  section: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, gap: 8 },
  sugestoesSection: { backgroundColor: Colors.accent + "10" },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text, marginBottom: 4 },
  sectionText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  bulletItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 2 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 6 },
  bulletText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  atividadeItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  atividadeNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary + "15", alignItems: "center", justifyContent: "center" },
  atividadeNumText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.primary },
  atividadeContent: { flex: 1 },
  atividadeDesc: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  atividadeTempo: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.primary, marginTop: 2 },
  downloadBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
  },
  downloadBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  editGroup: { gap: 8 },
  editLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  editInput: {
    backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text,
  },
  editTextArea: { minHeight: 80, textAlignVertical: "top" },
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
  atividadeEditRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  atividadeEditInputs: { flex: 1, flexDirection: "row", gap: 8 },
  saveEditBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.success, borderRadius: 14, paddingVertical: 16, marginTop: 8,
  },
  saveEditBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  metodosPrincSection: {
    backgroundColor: Colors.primary + "10", borderWidth: 1, borderColor: Colors.primary + "30",
  },
  sectionTitleSmall: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  metodosPrincText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.primary },
  etapaCard: {
    backgroundColor: Colors.background, borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  etapaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  etapaNome: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.text, flex: 1 },
  etapaDuracao: {
    fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.primary,
    backgroundColor: Colors.primary + "15", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  etapaRoleRow: { flexDirection: "row", gap: 6, marginTop: 4, alignItems: "flex-start" },
  etapaRoleLabel: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textSecondary, minWidth: 70, paddingTop: 1 },
  etapaRoleText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  avaliacaoSection: { backgroundColor: Colors.primary + "08", borderWidth: 1, borderColor: Colors.primary + "20" },
  observacoesSection: { backgroundColor: "#FFF9E6", borderWidth: 1, borderColor: "#F9A82520" },
});
