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
import Colors from "@/constants/colors";
import {
  getLessonPlans,
  saveLessonPlan,
  getTeacherProfile,
  getExportHeader,
  LessonPlan,
  TeacherProfile,
  ExportHeader,
} from "@/lib/storage";
import { useLanguage } from "@/lib/i18n";
import { exportPdfFromHtml } from "@/lib/exports";
import { usePeriod } from "@/lib/periodContext";

const SYSTEM_FOOTER = "Processado pelo Sistema EcoEducacional · Gestão Pedagógica";

export default function ViewPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile>({
    nome: "",
    email: "",
    instituicao: "",
    nivelEnsino: "",
    disciplinas: "",
  });
  const [exportHeader, setExportHeader] = useState<ExportHeader>({ logoBase64: null, linhas: [] });
  const { lang, tr } = useLanguage();
  const { periodKeys, periodLabels } = usePeriod();
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
    Promise.all([getLessonPlans(), getTeacherProfile(), getExportHeader()]).then(([plans, tp, header]) => {
      const found = plans.find((p) => p.id === id);
      if (found) setPlan(found);
      setProfile(tp);
      setExportHeader(header);
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
    const dataFormatada = new Date(p.createdAt).toLocaleDateString(dateLocale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const escapeHtml = (value: string | number | undefined | null) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const paragraph = (value: string | undefined | null) =>
      escapeHtml(value || "—").replace(/\n/g, "<br>");

    const li = (text: string) => `<li>${paragraph(text)}</li>`;
    const field = (label: string, value: string | number | undefined | null) =>
      `<p class="field-line"><strong>${label}:</strong> ${paragraph(String(value || "—"))}</p>`;

    const objEspItems = p.objetivosEspecificos.length > 0
      ? p.objetivosEspecificos.map(li).join("")
      : li("—");
    const conteudosItems = (p.conteudos || []).length > 0
      ? (p.conteudos || []).map(li).join("")
      : li("—");
    const perguntasControloItems = p.perguntasControlo.length > 0
      ? p.perguntasControlo.map(li).join("")
      : li("—");

    const tarefas = p.tarefaDeCasa && p.tarefaDeCasa.length > 0
      ? p.tarefaDeCasa.map((t) =>
          `${t.descricao}${t.referencia ? ` (${t.referencia})` : ""}${t.tempoEstimado ? ` — Tempo estimado: ${t.tempoEstimado}` : ""}`
        )
      : (p.perguntasTarefa && p.perguntasTarefa.length > 0
          ? p.perguntasTarefa
          : (p.tarefasPraticas || []));

    const tpcItems = tarefas.length > 0 ? tarefas.map(li).join("") : li("—");

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
      ? normalizedDesenv.map((e) => {
          const hasStudents = e.actividadesAlunos && e.actividadesAlunos !== "—" && e.actividadesAlunos.trim();
          return `
            <div class="stage-block">
              <p class="stage-title">${paragraph(e.etapa || "—")}${e.duracao ? ` <span>(${paragraph(e.duracao)})</span>` : ""}</p>
              ${e.actividadesProfessor ? `<p><strong>Actividade do Professor:</strong> ${paragraph(e.actividadesProfessor)}</p>` : ""}
              ${hasStudents ? `<p><strong>Actividades dos Alunos:</strong> ${paragraph(e.actividadesAlunos)}</p>` : ""}
            </div>`;
        }).join("")
      : `<p>—</p>`;

    const metodologiaText = [
      p.metodosPrincipais ? field("Abordagem principal", p.metodosPrincipais) : "",
      p.metodos ? field("Métodos e Técnicas", p.metodos) : "",
      p.meios ? field("Meios de Ensino", p.meios) : "",
    ].filter(Boolean).join("");

    const instituicao = profile.instituicao || "EcoEducacional";
    const assinatura = profile.nome || "________________________";
    const periodIndex = periodKeys.indexOf(p.periodo ?? "I");
    const periodoLabel = periodIndex >= 0 ? periodLabels[periodIndex] : (p.periodo || "I Trimestre");
    const headerLines = exportHeader.linhas.map((line) => line.trim()).filter(Boolean);
    const headerLogo = exportHeader.logoBase64;
    const headerHtml = headerLogo || headerLines.length > 0
      ? `
        <div class="doc-header">
          ${headerLogo ? `<img src="${headerLogo}" alt="Logotipo" />` : ""}
          ${headerLines.map((line) => `<div class="header-line">${escapeHtml(line)}</div>`).join("")}
          <div class="school">${escapeHtml(instituicao.toUpperCase())}</div>
          <div class="doc">Plano de Aula</div>
        </div>`
      : `
        <div class="doc-header">
          <div class="school">${escapeHtml(instituicao.toUpperCase())}</div>
          <div class="doc">Plano de Aula</div>
        </div>`;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Plano de Aula - ${escapeHtml(p.tema)}</title>
<style>
  @page {
    size: A4;
    margin: 1cm 2cm 2cm 2.5cm;
    @bottom-right {
      content: counter(page) " de " counter(pages);
      color: #555555;
      font-size: 8pt;
    }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    color: #111111;
    line-height: 1.55;
    background: #ffffff;
  }
  .doc-header {
    text-align: center;
    margin-bottom: 14px;
  }
  .doc-header img {
    max-height: 65px;
    max-width: 220px;
    display: block;
    margin: 0 auto 5px;
    object-fit: contain;
  }
  .doc-header .header-line {
    text-align: center;
    font-size: 10.5pt;
    font-weight: 600;
    margin: 1px 0;
  }
  .doc-header .school {
    text-align: center;
    font-size: 13pt;
    font-weight: 700;
    letter-spacing: 0.3px;
    margin: 1px 0;
    text-transform: uppercase;
  }
  .doc-header .doc {
    text-align: center;
    font-size: 11pt;
    font-weight: 700;
    margin-top: 4px;
    text-transform: uppercase;
  }
  .meta-block {
    border-top: 2px solid #0d7377;
    border-bottom: 1px solid #0d7377;
    background: #f0fafa;
    padding: 8px 10px;
    margin-bottom: 15px;
  }
  .meta-block p,
  .field-line,
  .stage-block p,
  .text-block {
    font-size: 11pt;
    margin-bottom: 4px;
    text-align: justify;
  }
  .section-divider {
    border: none;
    border-top: 1px solid #0d7377;
    margin: 13px 0;
  }
  .sec-block {
    margin-bottom: 14px;
    page-break-inside: avoid;
  }
  .sec-heading {
    color: #0d7377;
    font-size: 11.5pt;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .subsec-heading {
    font-size: 11pt;
    font-weight: 700;
    margin: 7px 0 4px;
  }
  ul {
    padding-left: 22px;
    margin-bottom: 4px;
  }
  li {
    margin-bottom: 3px;
    text-align: justify;
  }
  .stage-block {
    border-left: 3px solid #0d7377;
    background: #f9f9f9;
    padding: 7px 9px;
    margin-bottom: 8px;
    page-break-inside: avoid;
  }
  .stage-title {
    color: #0d7377;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .stage-title span {
    color: #555555;
    font-weight: 400;
  }
  .footer {
    border-top: 1px solid #0d7377;
    color: #555555;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 22px;
    padding-top: 6px;
    font-size: 9pt;
  }
  .system {
    border-top: 1px solid #cccccc;
    color: #555555;
    font-size: 8pt;
    margin-top: 24px;
    padding-top: 4px;
    text-align: center;
  }
</style>
</head>
<body>

  ${headerHtml}

  <div class="meta-block">
    <p><strong>Disciplina:</strong> ${paragraph(p.disciplina)} &nbsp;&nbsp;&nbsp; <strong>Turma/Classe:</strong> ${paragraph(p.classe)}</p>
    <p><strong>Tema:</strong> ${paragraph(p.tema)}</p>
    <p><strong>Sumário:</strong> ${paragraph(p.sumario)}</p>
    <p><strong>Duração:</strong> ${paragraph(String(p.duracao))} minutos${p.numAlunos ? ` &nbsp;&nbsp;&nbsp; <strong>N.º de Alunos:</strong> ${paragraph(String(p.numAlunos))}` : ""}</p>
    <p><strong>Período:</strong> ${paragraph(periodoLabel)}</p>
    ${profile.nivelEnsino ? `<p><strong>Contexto:</strong> ${paragraph(profile.nivelEnsino)}</p>` : ""}
    ${p.faixaEtaria ? `<p><strong>Faixa etária:</strong> ${paragraph(p.faixaEtaria)}</p>` : ""}
  </div>

  <div class="sec-block">
    <div class="sec-heading">1. Dados Identificativos</div>
    ${field("Professor(a)", assinatura)}
    ${field("Data", dataFormatada)}
    ${field("Objectivo Geral da Unidade / Aula", p.objetivoGeral || "—")}
  </div>

  <hr class="section-divider">

  <div class="sec-block">
    <div class="sec-heading">2. Objectivos da Aula</div>
    <div class="subsec-heading">Objectivo Geral:</div>
    <p class="text-block">${paragraph(p.objetivoGeral || "—")}</p>
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
    ${metodologiaText || "<p>—</p>"}
  </div>

  <hr class="section-divider">

  <div class="sec-block">
    <div class="sec-heading">5. Desenvolvimento da Aula</div>
    ${desenvolvimentoBlocks}
  </div>

  <hr class="section-divider">

  <div class="sec-block">
    <div class="sec-heading">6. Avaliação</div>
    ${p.avaliacao ? `<p class="text-block">${paragraph(p.avaliacao)}</p>` : ""}
    ${p.perguntasControlo.length > 0 ? `
      <div class="subsec-heading">Perguntas de Controlo:</div>
      <ul>${perguntasControloItems}</ul>` : ""}
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
      ${field("Alunos com dificuldades", p.diferenciacaoPedagogica.dificuldades)}
      ${field("Alunos avançados", p.diferenciacaoPedagogica.avancados)}` : ""}
    ${p.observacoes ? `<p class="text-block">${paragraph(p.observacoes)}</p>` : ""}
    ${!p.diferenciacaoPedagogica && !p.observacoes ? "<p>—</p>" : ""}
  </div>

  <div class="footer">
    <span>${escapeHtml(instituicao)} &bull; ${escapeHtml(dataFormatada)}</span>
    <span>Professor(a): ${escapeHtml(assinatura)}</span>
  </div>
  <div class="system">${SYSTEM_FOOTER}</div>

</body>
</html>`;
  };

  const handleDownloadPdf = async () => {
    if (!plan) return;
    setGenerating(true);
    try {
      const html = generatePdfHtml(plan);
      await exportPdfFromHtml(html, `Plano_de_aula_${plan.sumario}`, "planos");

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
