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
import Icon from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
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
import { useLanguage } from "@/lib/i18n";

export default function ViewPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile>({ nome: "", instituicao: "", disciplina: "" });
  const { lang, tr } = useLanguage();
  const dateLocale = ({ pt: "pt-PT", en: "en-GB", fr: "fr-FR" } as const)[lang] ?? "pt-PT";

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

    const li = (text: string) => `<li style="margin-bottom:3px;">${text}</li>`;
    const dash = (label: string, value: string) =>
      `<p style="margin-bottom:4px;"><strong>${label}:</strong> ${value}</p>`;

    const objEspItems = p.objetivosEspecificos.length > 0
      ? p.objetivosEspecificos.map(li).join("")
      : li("—");
    const conteudosItems = (p.conteudos || []).length > 0
      ? (p.conteudos || []).map(li).join("")
      : li("—");
    const pergControloItems = p.perguntasControlo.length > 0
      ? p.perguntasControlo.map(li).join("")
      : li("—");

    const tpcItems = p.tarefaDeCasa && p.tarefaDeCasa.length > 0
      ? p.tarefaDeCasa.map((t) =>
          li(`${t.descricao}${t.referencia ? ` (${t.referencia})` : ""}${t.tempoEstimado ? ` — Tempo estimado: ${t.tempoEstimado}` : ""}`)
        ).join("")
      : (p.tarefasPraticas || p.perguntasTarefa || []).length > 0
        ? (p.tarefasPraticas || p.perguntasTarefa || []).map(li).join("")
        : li("—");

    const normalizedDesenv =
      p.desenvolvimentoAula && p.desenvolvimentoAula.length > 0
        ? p.desenvolvimentoAula
        : p.atividades.map((a, i) => ({
            etapa: `Momento ${i + 1}`,
            duracao: a.tempo || "",
            actividadesProfessor: a.descricao || "",
            actividadesAlunos: "",
          }));

    const desenvolvimentoBlocks = normalizedDesenv.length > 0
      ? normalizedDesenv.map((e, i) => {
          const hasStudents = e.actividadesAlunos && e.actividadesAlunos !== "—" && e.actividadesAlunos.trim();
          return `
            <div style="margin-bottom:10px;padding-left:8px;border-left:3px solid #ccc;">
              <p style="font-weight:700;margin-bottom:4px;">${e.etapa}${e.duracao ? ` (${e.duracao})` : ""}</p>
              ${e.actividadesProfessor ? `<p style="margin-bottom:3px;"><strong>Actividade do Professor:</strong> ${e.actividadesProfessor}</p>` : ""}
              ${hasStudents ? `<p style="margin-bottom:3px;"><strong>Actividades dos Alunos:</strong> ${e.actividadesAlunos}</p>` : ""}
            </div>`;
        }).join("")
      : `<p>—</p>`;

    const metodologiaText = [
      p.metodosPrincipais ? `<strong>Abordagem principal:</strong> ${p.metodosPrincipais}` : "",
      p.metodos ? `<strong>Métodos e Técnicas:</strong> ${p.metodos}` : "",
      p.meios ? `<strong>Meios de Ensino:</strong> ${p.meios}` : "",
    ].filter(Boolean).join("<br>");

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 25mm 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; line-height: 1.6; }
  .doc-title { text-align: center; font-size: 16pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .doc-escola { text-align: center; font-size: 11pt; margin-bottom: 16px; color: #333; }
  .meta-block { margin-bottom: 16px; border-top: 2px solid #000; border-bottom: 1px solid #000; padding: 8px 0; }
  .meta-block p { margin-bottom: 3px; font-size: 11pt; }
  hr.section-divider { border: none; border-top: 1px solid #000; margin: 14px 0; }
  .sec-heading { font-size: 11pt; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
  .subsec-heading { font-size: 11pt; font-weight: 700; margin-bottom: 4px; margin-top: 8px; }
  .sec-block { margin-bottom: 16px; }
  p { margin-bottom: 4px; font-size: 11pt; }
  ul { padding-left: 20px; margin-bottom: 4px; }
  ul li { margin-bottom: 3px; font-size: 11pt; }
  .footer { margin-top: 24px; border-top: 1px solid #000; padding-top: 6px; font-size: 9pt; color: #555; display: flex; justify-content: space-between; }
</style>
</head>
<body>

  <div class="doc-title">Plano de Aula</div>
  <div class="doc-escola">${profile.instituicao || "Instituição de Ensino"}</div>

  <div class="meta-block">
    <p><strong>Disciplina:</strong> ${p.disciplina} &nbsp;&nbsp;&nbsp; <strong>Turma/Classe:</strong> ${p.classe}</p>
    <p><strong>Tema:</strong> ${p.tema}</p>
    <p><strong>Sumário:</strong> ${p.sumario}</p>
    <p><strong>Duração:</strong> ${p.duracao} minutos${p.numAlunos ? ` &nbsp;&nbsp;&nbsp; <strong>N.º de Alunos:</strong> ${p.numAlunos}` : ""}</p>
    ${profile.nivelEnsino ? `<p><strong>Contexto:</strong> ${profile.nivelEnsino}</p>` : ""}
  </div>

  <div class="sec-block">
    <div class="sec-heading">1. Dados Identificativos</div>
    ${dash("Professor(a)", profile.nome || "_______________________________")}
    ${dash("Data", dataFormatada)}
    ${dash("Objectivo Geral da Unidade / Aula", p.objetivoGeral || "—")}
  </div>

  <hr class="section-divider">

  <div class="sec-block">
    <div class="sec-heading">2. Objectivos da Aula</div>
    <div class="subsec-heading">Objectivo Geral:</div>
    <p>${p.objetivoGeral || "—"}</p>
    <div class="subsec-heading">Objectivos Específicos:</div>
    <ul>${objEspItems}</ul>
  </div>

  <hr class="section-divider">

  <div class="sec-block">
    <div class="sec-heading">3. Conteúdos</div>
    <ul>${conteudosItems}</ul>
  </div>

  <hr class="section-divider">

  <div class="sec-block">
    <div class="sec-heading">4. Estratégias Metodológicas</div>
    ${metodologiaText ? `<p>${metodologiaText}</p>` : "<p>—</p>"}
  </div>

  <hr class="section-divider">

  <div class="sec-block">
    <div class="sec-heading">5. Desenvolvimento da Aula</div>
    ${desenvolvimentoBlocks}
  </div>

  <hr class="section-divider">

  <div class="sec-block">
    <div class="sec-heading">6. Avaliação</div>
    ${p.avaliacao ? `<p>${p.avaliacao}</p>` : ""}
    ${p.perguntasControlo.length > 0 ? `
      <div class="subsec-heading">Perguntas de Controlo:</div>
      <ul>${pergControloItems}</ul>` : ""}
    ${!p.avaliacao && p.perguntasControlo.length === 0 ? "<p>—</p>" : ""}
  </div>

  <hr class="section-divider">

  <div class="sec-block">
    <div class="sec-heading">7. Tarefa de Casa (TPC)</div>
    <ul>${tpcItems}</ul>
  </div>

  <hr class="section-divider">

  <div class="sec-block">
    <div class="sec-heading">8. Observações / Diferenciação Pedagógica</div>
    ${p.diferenciacaoPedagogica ? `
      ${dash("Alunos com dificuldades", p.diferenciacaoPedagogica.dificuldades)}
      ${dash("Alunos avançados", p.diferenciacaoPedagogica.avancados)}` : ""}
    ${p.observacoes ? `<p>${p.observacoes}</p>` : ""}
    ${!p.diferenciacaoPedagogica && !p.observacoes ? "<p>—</p>" : ""}
  </div>

  <div class="footer">
    <span>${profile.instituicao || "EcoEducacional"} &bull; ${dataFormatada}</span>
    <span>Professor(a): ${profile.nome || "________________________"}</span>
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
          onPress={() => { if (editing) { setEditing(false); } else { router.back(); } }}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name={editing ? "close" : "chevron-back"} size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {editing ? "Editar Plano" : plan.tema}
        </Text>
        {editing ? (
          <Pressable onPress={handleSaveEdit} style={({ pressed }) => [styles.saveHeaderBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Icon name="checkmark" size={24} color={Colors.success} />
          </Pressable>
        ) : (
          <View style={styles.headerActions}>
            <Pressable onPress={startEditing} style={({ pressed }) => [styles.headerActionBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <Icon name="edit-2" size={18} color={Colors.primary} />
            </Pressable>
            <Pressable
              onPress={handleDownloadPdf}
              disabled={generating}
              style={({ pressed }) => [styles.headerActionBtn, { opacity: pressed || generating ? 0.7 : 1 }]}
            >
              {generating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Icon name="download" size={18} color={Colors.primary} />
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
              <Text style={styles.editLabel}>Objectivo Geral</Text>
              <TextInput style={[styles.editInput, styles.editTextArea]} value={editObjetivoGeral} onChangeText={setEditObjetivoGeral} multiline placeholderTextColor={Colors.textMuted} />
            </View>

            {renderEditableList("Objectivos Específicos", editObjEspecificos, setEditObjEspecificos, "Objectivo")}

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
                      <Icon name="close" size={18} color={Colors.error} />
                    </Pressable>
                  )}
                </View>
              ))}
              <Pressable onPress={() => setEditAtividades([...editAtividades, { descricao: "", tempo: "" }])} style={styles.addItemBtn}>
                <Icon name="add" size={16} color={Colors.primary} />
                <Text style={styles.addItemText}>Adicionar atividade</Text>
              </Pressable>
            </View>

            {renderEditableList("Perguntas de Controlo", editPerguntasControlo, setEditPerguntasControlo, "Pergunta")}
            {renderEditableList("Perguntas de Tarefa", editPerguntasTarefa, setEditPerguntasTarefa, "Tarefa")}

            <Pressable onPress={handleSaveEdit} style={({ pressed }) => [styles.saveEditBtn, { opacity: pressed ? 0.9 : 1 }]}>
              <Icon name="check" size={20} color="#fff" />
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
                <Icon name="clock" size={12} color={Colors.primary} />
                <Text style={styles.metaChipText}>{plan.duracao} min</Text>
              </View>
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
                    <Icon name="help-circle" size={14} color={Colors.primary} />
                    <Text style={styles.bulletText}>{p}</Text>
                  </View>
                ))}
              </View>
            )}

            {plan.tarefaDeCasa && plan.tarefaDeCasa.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TPC — Tarefa de Casa</Text>
                {plan.tarefaDeCasa.map((t, i) => (
                  <View key={i} style={styles.tpcItem}>
                    <Icon name="book-open" size={14} color={Colors.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bulletText}>{t.descricao}</Text>
                      {t.referencia ? <Text style={styles.tpcMeta}>{t.referencia}</Text> : null}
                      {t.tempoEstimado ? <Text style={styles.tpcMeta}>Tempo estimado: {t.tempoEstimado}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : (plan.tarefasPraticas || plan.perguntasTarefa || []).length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tarefa Pratica</Text>
                {(plan.tarefasPraticas || plan.perguntasTarefa || []).map((t, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Icon name="clipboard" size={14} color={Colors.accent} />
                    <Text style={styles.bulletText}>{t}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {plan.avaliacao ? (
              <View style={[styles.section, styles.avaliacaoSection]}>
                <Text style={styles.sectionTitle}>Avaliacao Formativa</Text>
                <Text style={styles.sectionText}>{plan.avaliacao}</Text>
              </View>
            ) : null}

            {plan.diferenciacaoPedagogica ? (
              <View style={[styles.section, styles.diferenciacaoSection]}>
                <Text style={styles.sectionTitle}>Diferenciacao Pedagogica</Text>
                <Text style={styles.tpcSubLabel}>Alunos com dificuldades:</Text>
                <Text style={styles.sectionText}>{plan.diferenciacaoPedagogica.dificuldades}</Text>
                <Text style={[styles.tpcSubLabel, { marginTop: 10 }]}>Alunos avancados:</Text>
                <Text style={styles.sectionText}>{plan.diferenciacaoPedagogica.avancados}</Text>
              </View>
            ) : null}

            {plan.observacoes ? (
              <View style={[styles.section, styles.observacoesSection]}>
                <Text style={styles.sectionTitle}>Observacoes</Text>
                <Text style={styles.sectionText}>{plan.observacoes}</Text>
              </View>
            ) : null}

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
                  <Icon name="download" size={18} color="#fff" />
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
    paddingHorizontal: 16, paddingBottom: 16, backgroundColor: "rgba(15,23,42,0.7)",
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
  section: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: Colors.border },
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
  observacoesSection: { backgroundColor: "rgba(249,168,37,0.08)", borderWidth: 1, borderColor: "rgba(249,168,37,0.25)" },
  diferenciacaoSection: { backgroundColor: "rgba(124,77,255,0.08)", borderWidth: 1, borderColor: "rgba(124,77,255,0.25)" },
  tpcItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 4 },
  tpcMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.primary, marginTop: 2, fontStyle: "italic" },
  tpcSubLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
});
