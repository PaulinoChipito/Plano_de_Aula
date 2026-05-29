import { Platform } from "react-native";

export type GenerationStatus = {
  stage: "idle" | "downloading" | "loading" | "generating" | "done" | "error";
  progress?: number;
  message?: string;
  error?: string;
};

export type DesenvolvimentoEtapaAI = {
  etapa: string;
  duracao: string;
  actividadesProfessor: string;
  actividadesAlunos: string;
};

export type TarefaDeCasaAI = {
  descricao: string;
  referencia: string;
  tempoEstimado: string;
};

export type LessonPlanAIResult = {
  sumario: string;
  faixaEtaria: string;
  objetivoGeral: string;
  objetivosEspecificos: string[];
  conteudos: string[];
  metodosPrincipais: string;
  metodos: string;
  meios: string;
  desenvolvimentoAula: DesenvolvimentoEtapaAI[];
  perguntasControlo: string[];
  tarefaDeCasa: TarefaDeCasaAI[];
  tarefasPraticas: string[];
  avaliacao: string;
  diferenciacaoPedagogica: { dificuldades: string; avancados: string };
  observacoes: string;
  score: number;
  sugestoes: string[];
};

const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";

let pipelineInstance: any = null;
let pipelineLoading = false;
let pipelineLoadCallbacks: Array<(err?: Error) => void> = [];

const SYSTEM_PROMPT = `És um planificador pedagógico especialista no currículo angolano (INIDE). Geras planos de aula COMPLETOS, RIGOROSOS e COERENTES, fundamentados em Bloom (Anderson & Krathwohl, 2001), Mager, Tyler, Gagné, Vygotsky, Luckesi, Perrenoud e Tomlinson.

═══ 1. FAIXA ETÁRIA E PROFUNDIDADE ═══
— 1ª–4ª (6–10 anos): linguagem muito simples, concreto, lúdico, sem abstracção.
— 5ª–6ª (10–12 anos): abstracção gradual, classificações simples, textos curtos.
— 7ª–9ª (12–15 anos): raciocínio abstracto em desenvolvimento, análise elementar.
— 10ª–12ª (15–18 anos): pensamento crítico, rigor científico, argumentação elaborada.

═══ 2. REGRA CRÍTICA — TEMA vs. SUMÁRIO ═══
O TEMA é o título amplo. O SUMÁRIO é a descrição concreta do que é leccionado nesta aula específica.
— OBJECTIVO GERAL → deriva EXCLUSIVAMENTE do TEMA (visão de conjunto — Tyler).
— TODAS as restantes secções (OEs, conteúdos, desenvolvimento, perguntas, TPC, avaliação, diferenciação) → derivam EXCLUSIVAMENTE do SUMÁRIO. Se o sumário não existir, derivam do tema.
ERRO GRAVE: cobrir matéria fora do sumário ou ignorar matéria que está no sumário.

═══ 3. TAXONOMIA DE BLOOM — VERBOS OPERACIONAIS ═══
N1 RECORDAR: identificar, reconhecer, listar, enumerar, definir, citar, nomear.
N2 COMPREENDER: explicar, descrever, interpretar, classificar, resumir, comparar, exemplificar, relacionar, distinguir.
N3 APLICAR: resolver, calcular, aplicar, demonstrar, executar, utilizar, construir, produzir, redigir.
N4 ANALISAR: analisar, diferenciar, organizar, relacionar, estruturar, distinguir, fundamentar.
N5 AVALIAR (10ª–12ª): avaliar, justificar, criticar, argumentar, defender, verificar.
N6 CRIAR (10ª–12ª): criar, elaborar, construir, propor, planear, inventar.

PROGRESSÃO OBRIGATÓRIA DOS OBJECTIVOS ESPECÍFICOS (modelo Mager + Bloom):
— OE1: verbo N1 ou N2 + [conteúdo específico] + [condição: sem consulta / com manual / em grupo] + [critério: X em Y acertos].
— OE2: verbo N2 ou N3 (diferente do OE1) + [conteúdo] + [condição] + [critério mensurável].
— OE3: verbo N3, N4, N5 ou N6 (diferente dos anteriores) + [conteúdo] + [condição angolana] + [critério].
NUNCA repetir o mesmo verbo. O verbo do OG nunca aparece nos OEs.

═══ 4. TEMA CONCEPTUAL vs. PROCEDIMENTAL ═══
A) CONCEPTUAL ("A célula", "Os adjectivos") → OEs: identificar, definir, classificar, descrever, comparar.
B) PROCEDIMENTAL ("Leitura e interpretação", "Resolução de equações") → OEs descrevem o que o aluno FAZ. PROIBIDO: "definir o conceito de [procedimento]" ou "explicar a importância de [procedimento]".
C) MISTO → combina.

═══ 5. DESENVOLVIMENTO — EVENTOS DE GAGNÉ (4 etapas) ═══
Etapa 1 — MOTIVAÇÃO (Gagné 1-2: ganhar atenção + informar objectivos): situação angolana concreta que introduz o tema; registo no quadro; ligação à aula anterior.
Etapa 2 — DESENVOLVIMENTO (Gagné 3-6: recordação prévia + apresentar conteúdo + orientar + elaborar): actividades ESPECÍFICAS da disciplina e do sumário; exemplos progressivos; demonstração no quadro ou com fonte/material.
Etapa 3 — CONSOLIDAÇÃO (Gagné 7-8: feedback + avaliar desempenho): ficha de exercícios; correcção colectiva no quadro; feedback imediato. (Vygotsky ZDP: professor medeia o que o aluno ainda não domina sozinho.)
Etapa 4 — SÍNTESE E AVALIAÇÃO (Gagné 9: retenção e transferência): síntese oral; 3 perguntas de controlo; registo do sumário; indicação do TPC.
Tempos em múltiplos de 5 min, somando exactamente a duração total.

═══ 6. PERGUNTAS DE CONTROLO — ALINHADAS AOS OEs ═══
As 3 perguntas usam o MESMO verbo de Bloom do OE correspondente:
— PC1 alinhada ao OE1 (N1/N2): pergunta directa de recordação/identificação.
— PC2 alinhada ao OE2 (N2/N3): "Explica..." ou "Resolve..." com exemplo angolano.
— PC3 alinhada ao OE3 (N3+): situação CONCRETA e COMPLETA da realidade angolana (nome de pessoa, lugar real, valores reais — Luanda, Huambo, mercado do Roque Santeiro, rio Kwanza, etc.). NUNCA placeholders.

═══ 7. TPC — EXACTAMENTE 2 TAREFAS ═══
TPC1 (retenção): exercício do manual — referir unidade/capítulo INIDE. NUNCA "pág. ___".
TPC2 (transferência): produto contextualizado na realidade angolana. Tempo estimado por tarefa.

═══ 8. AVALIAÇÃO (Luckesi — processo dialógico) ═══
Ficha de exercícios (evidência de desempenho): 50%. Participação oral (processo dialógico): 30%. Perguntas de controlo (retenção imediata): 20%. Total: 100%.
O professor regista observações qualitativas sobre dificuldades (regulação Perrenoud).

═══ 9. DIFERENCIAÇÃO (Tomlinson + Perrenoud) ═══
— Dificuldades (diferenciação do processo e produto — Tomlinson): ficha simplificada; consulta do manual; redução da extensão; trabalho em par com colega (mediação por pares — Vygotsky).
— Avançados (diferenciação do conteúdo e produto — Tomlinson): análise aprofundada; produção extensa com argumentação; pesquisa de exemplo adicional não abordado na aula.

═══ 10. REGRAS ABSOLUTAS ═══
— Português europeu/angolano: "ficha", "correcção colectiva", "quadro negro", "TPC", "sumário". NUNCA "atividade", "correção", "lousa".
— Exemplos angolanos: Mateus, Kiala, Joana; Luanda, Huambo, Lubango, Benguela; musseque, mercado, lavrador, palanca-negra.
— NUNCA placeholders: "____", "[a definir]", "[exemplo]", "pág. ___". Tudo completo.
— Verificação interna antes de gerar: OG deriva do tema? OEs derivam do sumário? Verbos Bloom progressivos e diferentes? Perguntas alinhadas aos OEs? Desenvolvimento cobre exactamente o sumário?

═══ 11. SAÍDA ═══
Responde SEMPRE e APENAS com JSON válido (sem markdown, sem comentários, sem texto fora do JSON). Cada campo completamente preenchido. Plano final pronto a usar.`;

function detectTipoAula(disc: string, tema: string): string {
  const d = disc.toLowerCase();
  const t = tema.toLowerCase();
  if (
    d.includes("ed. física") ||
    d.includes("ed física") ||
    d.includes("educação física") ||
    d.includes("educacao fisica")
  )
    return "Prática";
  if (
    d.includes("ed. visual") ||
    d.includes("educação visual") ||
    d.includes("artes")
  )
    return "Oficina";
  if (
    d.includes("biolog") ||
    d.includes("química") ||
    d.includes("quimica") ||
    d.includes("física") ||
    d.includes("fisica") ||
    t.includes("experiência") ||
    t.includes("experiencia") ||
    t.includes("laboratório") ||
    t.includes("laboratorio")
  )
    return "Experimental";
  if (
    d.includes("matem") ||
    d.includes("contabilidade") ||
    d.includes("informática") ||
    d.includes("informatica")
  )
    return "Mista";
  return "Teórica";
}

function buildPrompt(
  classe: string,
  disciplina: string,
  tema: string,
  duracao: string,
  sumario?: string,
): string {
  const classeNum = parseInt(classe.replace(/[^\d]/g, "")) || 0;
  let nivel = "";
  if (classeNum >= 1 && classeNum <= 4) nivel = "Ensino Primário (6–10 anos)";
  else if (classeNum >= 5 && classeNum <= 6)
    nivel = "Ensino Primário avançado (10–12 anos)";
  else if (classeNum >= 7 && classeNum <= 9)
    nivel = "I Ciclo do Ensino Secundário (12–15 anos)";
  else if (classeNum >= 10 && classeNum <= 12)
    nivel = "II Ciclo do Ensino Secundário (15–18 anos)";
  else nivel = "Ensino Superior (+18 anos)";

  const tipoAula = detectTipoAula(disciplina, tema);
  const sumarioLine = sumario
    ? `SUMÁRIO DETALHADO (fonte primária para tudo excepto OG): "${sumario}"`
    : "";

  return `Gera um plano de aula RIGOROSO, COMPLETO e COERENTE fundamentado em Bloom, Mager, Tyler, Gagné, Vygotsky, Luckesi, Perrenoud e Tomlinson:

DISCIPLINA: ${disciplina}
CLASSE: ${classe} | NÍVEL: ${nivel}
TEMA: ${tema}
${sumarioLine}
DURAÇÃO: ${duracao} minutos
TIPO DE AULA: ${tipoAula}

VERIFICAÇÃO INTERNA ANTES DE GERAR (obrigatória):
1) OG deriva do TEMA "${tema}" (Tyler — visão ampla). OEs derivam do SUMÁRIO${sumario ? ` "${sumario}"` : " / do tema se ausente"}.
2) Classifica: A (conceptual) / B (procedimental) / C (misto). Se B, OEs descrevem o que o aluno FAZ — NUNCA "definir o conceito de [procedimento]".
3) Verbos dos OEs: OE1 N1/N2 (Recordar/Compreender), OE2 N2/N3, OE3 N3/N4/N5/N6. NUNCA repetir verbos.
4) Cada OE segue Mager: verbo Bloom + condição (com/sem consulta, a partir de ficha) + critério mensurável (X em Y acertos).
5) Perguntas de controlo: PC1 usa mesmo verbo de Bloom do OE1, PC2 do OE2, PC3 do OE3.
6) Desenvolvimento: 4 etapas = Gagné 1-2 / 3-6 / 7-8 / 9. Tempos somam exactamente ${duracao} min.
7) TPC: exactamente 2 tarefas (retenção = manual + transferência = caderno).
8) Avaliação (Luckesi): ficha 50% + participação 30% + perguntas controlo 20% = 100%.
9) Diferenciação (Tomlinson): processo+produto para dificuldades; conteúdo+produto para avançados.
10) ZERO placeholders. Português europeu/angolano: "ficha", "correcção colectiva", "quadro negro", "TPC".

Responde APENAS com JSON válido, sem markdown, sem texto fora do JSON:
{
  "sumario": "${sumario ? sumario : "síntese descritiva concreta desta aula em 1 frase"}",
  "faixaEtaria": "${nivel}",
  "tipoTema": "A | B | C + breve justificação",
  "objetivoGeral": "[Tyler — DERIVA DO TEMA '${tema}'] 1 verbo infinitivo (compreender/aplicar/analisar/explorar/consolidar/desenvolver/sistematizar) + competência ampla — 1 frase, SEM 'e'",
  "objetivosEspecificos": [
    "[Mager OE1 — Bloom N1/N2] VERBO_N1_OU_N2 + [sub-tópico do sumário] + [condição: sem consulta / com manual / em grupo] + [critério: pelo menos X em Y / em N linhas correctas]",
    "[Mager OE2 — Bloom N2/N3] VERBO_N2_OU_N3 (diferente OE1) + [sub-tópico do sumário] + [condição: a partir de ficha / num exercício contextualizado] + [critério mensurável]",
    "[Mager OE3 — Bloom N3+] VERBO_N3_N4_N5_OU_N6 (diferente OE1 e OE2) + [sub-tópico do sumário] + [condição: usando contexto angolano] + [critério mais exigente]"
  ],
  "conteudos": ["sub-tópico CONCRETO 1 do sumário", "sub-tópico CONCRETO 2", "sub-tópico CONCRETO 3", "sub-tópico CONCRETO 4 (máx.)"],
  "metodosPrincipais": "Método Principal (ZDP Vygotsky) + Método Complementar — adequados a ${tipoAula}",
  "metodos": "MÉTODO PRINCIPAL: acção concreta do professor mediando na ZDP + acção do aluno. MÉTODO COMPLEMENTAR: acção professor + acção aluno. TÉCNICAS: 3 técnicas separadas por ponto e vírgula. MEIOS: materiais físicos para ${disciplina} tipo ${tipoAula}.",
  "meios": "lista de materiais concretos para ${disciplina} tipo ${tipoAula}: quadro negro, manual INIDE, ficha de exercícios, etc.",
  "desenvolvimentoAula": [
    {"etapa": "Motivação (Gagné 1-2)", "duracao": "X min", "actividadesProfessor": "Apresenta situação CONCRETA angolana ligada ao sumário; informa os objectivos; regista respostas no quadro; estabelece ligação com a aula anterior.", "actividadesAlunos": "Prestam atenção; respondem oralmente; partilham conhecimentos prévios; levantam hipóteses."},
    {"etapa": "Desenvolvimento (Gagné 3-6)", "duracao": "X min", "actividadesProfessor": "[${tipoAula}] actividade CONCRETA do professor compatível com ${tipoAula}: explica/demonstra/distribui/propõe/guia — cobre EXACTAMENTE os sub-tópicos do sumário com exemplos progressivos angolanos.", "actividadesAlunos": "Acção CONCRETA do aluno: copiam/resolvem/manipulam/observam/preenchem ficha — com mediação do professor (ZDP Vygotsky)."},
    {"etapa": "Consolidação (Gagné 7-8)", "duracao": "X min", "actividadesProfessor": "Circula pela sala (feedback imediato — Gagné 7); distribui ficha de exercícios sobre o sumário; orienta correcção colectiva no quadro (Gagné 8 — Luckesi).", "actividadesAlunos": "Preenchem ficha individualmente; participam na correcção colectiva; recebem feedback; registam as correcções."},
    {"etapa": "Síntese e Avaliação (Gagné 9)", "duracao": "X min", "actividadesProfessor": "Faz síntese oral dos sub-tópicos do sumário (retenção); coloca as 3 perguntas de controlo alinhadas aos OEs; regista sumário no quadro; indica os 2 TPCs.", "actividadesAlunos": "Respondem às perguntas de controlo; completam sumário no caderno; registam os 2 TPCs; colocam dúvidas finais."}
  ],
  "perguntasControlo": [
    "[PC1 — mesmo verbo Bloom do OE1, N1/N2] Pergunta directa de recordação/identificação sobre sub-tópico central do sumário.",
    "[PC2 — mesmo verbo Bloom do OE2, N2/N3] 'Explica...' ou 'Resolve...' com exemplo concreto da realidade angolana.",
    "[PC3 — mesmo verbo Bloom do OE3, N3+] Situação CONCRETA e COMPLETA: nome angolano real + lugar real + valores reais (Luanda/Huambo/Benguela/mercado/escola). ZERO placeholders."
  ],
  "tarefaDeCasa": [
    {"descricao": "[TPC1 — retenção] Exercício específico sobre sub-tópicos do sumário: completa X exercícios sobre [tema concreto]", "referencia": "Manual de ${disciplina} ${classe} (INIDE), Unidade sobre ${tema}. Confirmar página com a edição da escola.", "tempoEstimado": "20 min"},
    {"descricao": "[TPC2 — transferência] Produto contextualizado Angola: escreve/produz [produto adequado a ${tipoAula}] sobre [sub-tópico do sumário] usando um exemplo da realidade angolana (bairro/mercado/família).", "referencia": "Caderno do aluno", "tempoEstimado": "20 min"}
  ],
  "avaliacao": "Avaliação formativa (Luckesi — processo dialógico): correcção da ficha de exercícios (evidência de desempenho) 50% + participação oral nas actividades de ${tipoAula} (processo dialógico) 30% + qualidade das respostas às perguntas de controlo (retenção imediata) 20% = 100%. O professor regista observações qualitativas sobre dificuldades (regulação Perrenoud).",
  "diferenciacaoPedagogica": {
    "dificuldades": "[Tomlinson — diferenciação do processo e produto] Ficha simplificada com linguagem acessível sobre [sub-tópico concreto]; consulta do manual permitida; redução da extensão da produção; trabalho em par com colega mais avançado (mediação por pares — Vygotsky).",
    "avancados": "[Tomlinson — diferenciação do conteúdo e produto] Análise aprofundada de [sub-tópico avançado]; produção mais extensa com argumentação; desafio de pesquisar e apresentar um exemplo adicional não abordado na aula."
  },
  "observacoes": "Adequar exemplos ao nível cognitivo e contexto cultural da turma. Contextualizar com exemplos angolanos concretos.",
  "score": 85,
  "sugestoes": ["sugestão concreta 1 de melhoria pedagógica", "sugestão 2", "sugestão 3"]
}`;
}

function extractJSON(text: string): string {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return cleaned;
}

async function loadPipeline(
  onStatus: (s: GenerationStatus) => void,
): Promise<void> {
  if (pipelineInstance) return;
  if (pipelineLoading) {
    return new Promise((resolve, reject) => {
      pipelineLoadCallbacks.push((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  pipelineLoading = true;
  try {
    onStatus({
      stage: "downloading",
      progress: 0,
      message: "A iniciar descarga do modelo Qwen2.5...",
    });
    const { pipeline } = await import("@huggingface/transformers");
    pipelineInstance = await pipeline("text-generation", MODEL_ID, {
      dtype: "q4f16" as any,
      progress_callback: (info: any) => {
        if (info.status === "downloading" || info.status === "progress") {
          const pct =
            info.total > 0 ? Math.round((info.loaded / info.total) * 100) : 0;
          onStatus({
            stage: "downloading",
            progress: pct,
            message: `A descarregar modelo: ${pct}%`,
          });
        } else if (info.status === "initiate") {
          onStatus({ stage: "downloading", message: "A preparar modelo..." });
        } else if (info.status === "done") {
          onStatus({
            stage: "loading",
            message: "A carregar modelo na memória...",
          });
        }
      },
    });
    pipelineLoading = false;
    pipelineLoadCallbacks.forEach((cb) => cb());
    pipelineLoadCallbacks = [];
  } catch (err: any) {
    pipelineLoading = false;
    pipelineInstance = null;
    pipelineLoadCallbacks.forEach((cb) => cb(err));
    pipelineLoadCallbacks = [];
    throw err;
  }
}

async function generateWithQwen(
  classe: string,
  disciplina: string,
  tema: string,
  duracao: string,
  onStatus: (s: GenerationStatus) => void,
  sumario?: string,
): Promise<LessonPlanAIResult> {
  await loadPipeline(onStatus);
  onStatus({
    stage: "generating",
    message: "A gerar plano de aula com IA local...",
  });
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: buildPrompt(classe, disciplina, tema, duracao, sumario),
    },
  ];
  const result = await pipelineInstance(messages, {
    max_new_tokens: 1800,
    temperature: 0.65,
    do_sample: true,
    repetition_penalty: 1.1,
  });
  const generated = result[0]?.generated_text;
  let rawText = "";
  if (Array.isArray(generated)) {
    const assistantMsg = generated.find((m: any) => m.role === "assistant");
    rawText =
      assistantMsg?.content ?? generated[generated.length - 1]?.content ?? "";
  } else {
    rawText = String(generated ?? "");
  }
  const jsonStr = extractJSON(rawText);
  let parsed: any = {};
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    const partial = jsonStr.replace(/,?\s*$/, "}");
    try {
      parsed = JSON.parse(partial);
    } catch {
      return buildTemplatePlan(classe, disciplina, tema, duracao, sumario);
    }
  }
  return mergeWithDefaults(parsed, classe, disciplina, tema, duracao, sumario);
}

function mergeWithDefaults(
  parsed: any,
  classe: string,
  disciplina: string,
  tema: string,
  duracao: string,
  sumario?: string,
): LessonPlanAIResult {
  const tmpl = buildTemplatePlan(classe, disciplina, tema, duracao, sumario);
  return {
    sumario: sumario || parsed.sumario || tmpl.sumario,
    faixaEtaria: parsed.faixaEtaria || tmpl.faixaEtaria,
    objetivoGeral: parsed.objetivoGeral || tmpl.objetivoGeral,
    objetivosEspecificos: parsed.objetivosEspecificos?.length
      ? parsed.objetivosEspecificos
      : tmpl.objetivosEspecificos,
    conteudos: parsed.conteudos?.length ? parsed.conteudos : tmpl.conteudos,
    metodosPrincipais: parsed.metodosPrincipais || tmpl.metodosPrincipais,
    metodos: parsed.metodos || tmpl.metodos,
    meios: parsed.meios || tmpl.meios,
    desenvolvimentoAula: parsed.desenvolvimentoAula?.length
      ? parsed.desenvolvimentoAula
      : tmpl.desenvolvimentoAula,
    perguntasControlo: parsed.perguntasControlo?.length
      ? parsed.perguntasControlo
      : tmpl.perguntasControlo,
    tarefaDeCasa: parsed.tarefaDeCasa?.length
      ? parsed.tarefaDeCasa
      : tmpl.tarefaDeCasa,
    tarefasPraticas: parsed.tarefaDeCasa?.length
      ? parsed.tarefaDeCasa.map((t: any) => t.descricao || t)
      : tmpl.tarefasPraticas,
    avaliacao: parsed.avaliacao || tmpl.avaliacao,
    diferenciacaoPedagogica:
      parsed.diferenciacaoPedagogica || tmpl.diferenciacaoPedagogica,
    observacoes: parsed.observacoes || tmpl.observacoes,
    score: typeof parsed.score === "number" ? parsed.score : tmpl.score,
    sugestoes: parsed.sugestoes?.length ? parsed.sugestoes : tmpl.sugestoes,
  };
}

function detectFaixaEtaria(classe: string): {
  faixa: string;
  nivel: string;
  classeNum: number;
} {
  const n = parseInt(classe.replace(/[^\d]/g, "")) || 0;
  if (n >= 1 && n <= 4)
    return { faixa: "6–10 anos", nivel: "Ensino Primário", classeNum: n };
  if (n >= 5 && n <= 6)
    return {
      faixa: "10–12 anos",
      nivel: "Ensino Primário avançado",
      classeNum: n,
    };
  if (n >= 7 && n <= 9)
    return {
      faixa: "12–15 anos",
      nivel: "I Ciclo do Ensino Secundário",
      classeNum: n,
    };
  if (n >= 10 && n <= 12)
    return {
      faixa: "15–18 anos",
      nivel: "II Ciclo do Ensino Secundário",
      classeNum: n,
    };
  return { faixa: "+18 anos", nivel: "Ensino Superior", classeNum: n };
}

type TemaNatureza = "conceptual" | "procedimental" | "misto";

function detectTemaNatureza(tema: string): TemaNatureza {
  const t = tema.toLowerCase();
  const procedimentalKeywords = [
    "leitura",
    "interpretação",
    "interpretacao",
    "produção",
    "producao",
    "redacção",
    "redacao",
    "resolução",
    "resolucao",
    "cálculo",
    "calculo",
    "construção",
    "construcao",
    "análise",
    "analise",
    "aplicação",
    "aplicacao",
    "representação",
    "representacao",
    "resumo",
    "resumir",
    "elaboração",
    "elaboracao",
    "escrita",
    "composição",
    "composicao",
    "leitura e interpretação",
    "texto narrativo",
    "texto descritivo",
    "texto argumentativo",
  ];
  const conceptualKeywords = [
    "classe",
    "categorias",
    "conceito",
    "definição",
    "definicao",
    "estrutura",
    "tipos",
    "características",
    "caracteristicas",
    "propriedades",
    "regras",
    "adjetivos",
    "adjectivos",
    "verbo",
    "substantivo",
    "pronome",
    "advérbio",
    "adverbio",
    "pontuação",
    "pontuacao",
    "morfologia",
    "sintaxe",
    "gramática",
    "gramatica",
    "equação",
    "equacao",
    "teorema",
    "lei de",
    "princípio",
    "principio",
    "célula",
    "celula",
    "função",
    "funcao",
    "sistema",
    "processo",
    "ciclo",
  ];
  const isProcedimental = procedimentalKeywords.some((k) => t.includes(k));
  const isConceptual = conceptualKeywords.some((k) => t.includes(k));
  if (isProcedimental && isConceptual) return "misto";
  if (isProcedimental) return "procedimental";
  return "conceptual";
}

function extrairSubtopicos(sumario?: string): string[] {
  if (!sumario) return [];
  const limpo = sumario.replace(/\s+/g, " ").trim();
  const partes = limpo
    .split(/[;,—–]| - | e (?=[a-záéíóúãõç])/i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
  const unicos: string[] = [];
  for (const p of partes) {
    const norm = p.toLowerCase();
    if (!unicos.some((u) => u.toLowerCase() === norm)) unicos.push(p);
  }
  return unicos;
}

function focoDoSumario(sumario: string | undefined, tema: string): string {
  const subs = extrairSubtopicos(sumario);
  if (subs.length === 0) return tema;
  return subs[0];
}

function gerarObjetivosConceptual(
  tema: string,
  disc: string,
  faixa: ReturnType<typeof detectFaixaEtaria>,
  sumario?: string,
): { geral: string; especificos: string[] } {
  const { classeNum } = faixa;
  const foco = focoDoSumario(sumario, tema);

  // OG — Tyler: visão ampla do tema
  let geral: string;
  if (classeNum <= 6)
    geral = `Identificar os conceitos fundamentais de ${tema} no domínio de ${disc}.`;
  else if (classeNum <= 9)
    geral = `Compreender e caracterizar os conceitos fundamentais de ${tema} no âmbito de ${disc}.`;
  else if (classeNum <= 12)
    geral = `Analisar e aplicar os conceitos de ${tema} em situações concretas no âmbito de ${disc}.`;
  else
    geral = `Avaliar criticamente os fundamentos e aplicações de ${tema} no contexto de ${disc}.`;

  // OEs — Mager: verbo Bloom + condição + critério | progressão OE1=N1/N2, OE2=N2/N3, OE3=N3/N4+
  if (classeNum <= 6) {
    return {
      geral,
      especificos: [
        // OE1 N1 (Recordar)
        `Reconhecer ${foco} em exemplos concretos apresentados em sala, sem consulta, identificando correctamente pelo menos 4 dos 5 exemplos da ficha.`,
        // OE2 N2 (Compreender)
        `Descrever as características principais de ${foco} a partir dos exemplos do manual, em pelo menos 2 linhas correctas.`,
        // OE3 N3 (Aplicar)
        `Produzir 2 exemplos originais de ${foco} usando situações do bairro ou escola em Angola, ambos gramaticalmente correctos.`,
      ],
    };
  }
  if (classeNum <= 9) {
    return {
      geral,
      especificos: [
        // OE1 N1/N2 (Recordar/Compreender)
        `Definir ${foco} com as características essenciais aprendidas, sem consulta, em pelo menos 3 linhas correctas.`,
        // OE2 N2/N3 (Compreender/Aplicar)
        `Classificar exemplos de ${foco} a partir de uma ficha com 10 casos, acertando pelo menos 7 dos 10.`,
        // OE3 N4 (Analisar)
        `Distinguir ${foco} de categorias próximas em textos ou situações da realidade angolana, justificando com pelo menos 2 critérios correctos.`,
      ],
    };
  }
  if (classeNum <= 12) {
    return {
      geral,
      especificos: [
        // OE1 N2 (Compreender)
        `Explicar ${foco} com precisão terminológica, incluindo todos os critérios de classificação, sem consulta, em pelo menos 4 linhas.`,
        // OE2 N3 (Aplicar)
        `Aplicar os conceitos de ${foco} na resolução de pelo menos 3 casos práticos de uma ficha contextualizada na realidade angolana, acertando no mínimo 2.`,
        // OE3 N4/N5 (Analisar/Avaliar)
        `Analisar exemplos autênticos de ${foco} em situações do quotidiano angolano, justificando a classificação com pelo menos 3 critérios correctos.`,
      ],
    };
  }
  return {
    geral,
    especificos: [
      `Definir ${foco} com rigor terminológico, sem consulta, em pelo menos 5 linhas com critérios completos.`,
      `Comparar ${foco} com conceitos relacionados, identificando pelo menos 3 semelhanças e 3 diferenças a partir de textos propostos.`,
      `Avaliar criticamente as implicações de ${foco} em contextos angolanos concretos, argumentando com pelo menos 2 fundamentos teóricos.`,
    ],
  };
}

function gerarObjetivosProcedimental(
  tema: string,
  disc: string,
  faixa: ReturnType<typeof detectFaixaEtaria>,
  sumario?: string,
): { geral: string; especificos: string[] } {
  const { classeNum } = faixa;
  const discLow = disc.toLowerCase();
  const foco = focoDoSumario(sumario, tema);
  const isMat =
    discLow.includes("matem") ||
    discLow.includes("física") ||
    discLow.includes("fisica");
  const isLing =
    discLow.includes("português") ||
    discLow.includes("portugues") ||
    discLow.includes("língua") ||
    discLow.includes("lingua");

  if (isMat) {
    return {
      // OG — Tyler: capacidade ampla de resolver
      geral: `Resolver problemas envolvendo ${tema}, aplicando os procedimentos matemáticos correctos em ${disc}.`,
      especificos: [
        // OE1 N1/N2 (Reconhecer/Identificar — Mager: condição + critério)
        `Identificar os dados, a incógnita e a operação adequada em pelo menos 4 dos 5 exercícios propostos sobre ${foco}, a partir da ficha, sem consulta.`,
        // OE2 N3 (Aplicar/Resolver — Mager)
        `Resolver exercícios de ${foco} aplicando o algoritmo correcto, a partir da ficha com 10 exercícios, acertando pelo menos 7.`,
        // OE3 N3/N4 (Demonstrar/Analisar — contexto angolano)
        `Demonstrar a verificação dos resultados de ${foco} por substituição ou estimativa, em pelo menos 2 problemas contextualizados na realidade angolana, apresentando todos os passos.`,
      ],
    };
  }
  if (isLing) {
    if (classeNum <= 6) {
      return {
        geral: `Realizar actividades de ${tema} com compreensão e expressão adequadas ao nível da ${classeNum}ª classe de ${disc}.`,
        especificos: [
          // OE1 N1 (Reconhecer/Identificar)
          `Reconhecer as personagens e os acontecimentos principais do texto sobre ${foco}, respondendo a pelo menos 3 das 5 perguntas de interpretação da ficha, sem consulta.`,
          // OE2 N2 (Explicar/Descrever)
          `Descrever a ideia principal do texto sobre ${foco} com as suas próprias palavras, em pelo menos 2 frases correctas.`,
          // OE3 N3 (Produzir/Redigir)
          `Produzir 3 frases correctas sobre ${foco} usando pelo menos 3 palavras novas aprendidas na aula, no caderno.`,
        ],
      };
    }
    if (classeNum <= 9) {
      return {
        geral: `Interpretar e analisar textos relacionados com ${tema}, desenvolvendo competências de compreensão crítica em ${disc}.`,
        especificos: [
          // OE1 N1/N2 (Identificar)
          `Identificar a ideia central e 2 ideias secundárias do texto sobre ${foco}, respondendo correctamente a pelo menos 4 das 6 questões de interpretação da ficha.`,
          // OE2 N2/N3 (Resumir/Produzir)
          `Resumir o texto sobre ${foco} em não mais de 5 linhas, preservando as ideias principais e a coerência textual, no caderno, sem consulta.`,
          // OE3 N3/N4 (Produzir/Analisar — contexto angolano)
          `Redigir um parágrafo de 6 a 8 linhas sobre ${foco} usando um exemplo da realidade angolana, respeitando a estrutura e os recursos linguísticos estudados.`,
        ],
      };
    }
    return {
      geral: `Analisar e produzir textos relacionados com ${tema}, aplicando competências de leitura crítica e escrita elaborada em ${disc}.`,
      especificos: [
        // OE1 N2 (Explicar/Descrever)
        `Explicar os elementos estruturais e os recursos linguísticos de um texto sobre ${foco}, justificando pelo menos 2 escolhas do autor, a partir do texto proposto.`,
        // OE2 N3 (Produzir)
        `Produzir um texto de 15 a 20 linhas sobre ${foco} contextualizado na realidade angolana, respeitando a estrutura e os recursos linguísticos estudados.`,
        // OE3 N4/N5 (Analisar/Avaliar)
        `Analisar criticamente o ponto de vista do autor sobre ${foco}, fundamentando com pelo menos 2 citações directas do texto proposto.`,
      ],
    };
  }

  return {
    geral: `Aplicar os procedimentos e competências de ${tema} em situações concretas no âmbito de ${disc}.`,
    especificos: [
      // OE1 N1/N2 (Reconhecer/Identificar — Mager)
      `Reconhecer os elementos essenciais de ${foco} a partir de casos práticos da ficha, acertando pelo menos 7 dos 10 exemplos propostos, sem consulta.`,
      // OE2 N3 (Executar/Demonstrar — Mager)
      `Executar correctamente os procedimentos de ${foco} completando pelo menos 3 das 4 tarefas práticas propostas, com mediação do professor quando necessário.`,
      // OE3 N3/N4 (Aplicar/Analisar — contexto angolano)
      `Demonstrar a aplicação de ${foco} na resolução de um problema contextualizado na realidade angolana, apresentando todo o processo com pelo menos 2 passos correctos.`,
    ],
  };
}

function gerarConteudos(
  tema: string,
  disc: string,
  faixa: ReturnType<typeof detectFaixaEtaria>,
  natureza: TemaNatureza,
  sumario?: string,
): string[] {
  const subs = extrairSubtopicos(sumario);
  if (subs.length >= 3) {
    return subs.slice(0, 6);
  }
  const discLow = disc.toLowerCase();
  const isMat =
    discLow.includes("matem") ||
    discLow.includes("física") ||
    discLow.includes("fisica") ||
    discLow.includes("quím") ||
    discLow.includes("quim");
  const isLing =
    discLow.includes("português") ||
    discLow.includes("portugues") ||
    discLow.includes("língua") ||
    discLow.includes("lingua");
  const isHist = discLow.includes("histór") || discLow.includes("histor");
  const isBio =
    discLow.includes("biolog") ||
    discLow.includes("ciênc") ||
    discLow.includes("cienc");
  const { classeNum } = faixa;

  if (natureza === "procedimental" && isLing) {
    if (classeNum <= 6)
      return [
        `Texto sobre ${tema}: vocabulário e estrutura`,
        "Compreensão oral e escrita: perguntas de interpretação",
        "Vocabulário novo: palavras do texto",
        "Produção escrita guiada",
      ];
    if (classeNum <= 9)
      return [
        `Tipo de texto: características do texto sobre ${tema}`,
        "Interpretação literal e inferencial",
        "Vocabulário contextual: palavras e expressões",
        "Resumo e síntese de ideias",
        "Produção de parágrafo",
      ];
    return [
      `Análise estrutural e estilística: ${tema}`,
      "Recursos linguísticos e sua função",
      "Leitura crítica: ponto de vista e argumentação",
      "Comparação de textos",
      "Produção escrita elaborada",
    ];
  }

  if (isMat)
    return [
      `Conceito e definição de ${tema}`,
      `Propriedades e regras de ${tema}`,
      `Algoritmo/procedimento de ${tema}`,
      "Problemas contextualizados no quotidiano angolano",
      "Verificação e correcção dos resultados",
    ];

  if (isHist)
    return [
      `Contexto histórico e cronológico de ${tema}`,
      `Causas e factores de ${tema}`,
      `Desenvolvimento e consequências de ${tema}`,
      `Personagens e fontes históricas relevantes`,
      `Impacto de ${tema} em Angola e em África`,
    ];

  if (isBio)
    return [
      `Definição e características de ${tema}`,
      `Estrutura e componentes de ${tema}`,
      `Funções e mecanismos biológicos de ${tema}`,
      `Relação com a saúde e o ambiente angolano`,
      `Cuidados e aplicações práticas`,
    ];

  return [
    `Conceito e características de ${tema}`,
    `Propriedades e classificação de ${tema}`,
    `Exemplos e casos práticos de ${tema} em Angola`,
    `Aplicação e exercícios de consolidação`,
  ];
}

function gerarMetodos(
  disc: string,
  faixa: ReturnType<typeof detectFaixaEtaria>,
  natureza: TemaNatureza,
): { principais: string; detalhado: string; meios: string } {
  const { classeNum } = faixa;
  const discLow = disc.toLowerCase();
  const isMat =
    discLow.includes("matem") ||
    discLow.includes("física") ||
    discLow.includes("fisica");
  const isLing = discLow.includes("português") || discLow.includes("portugues");

  if (isMat)
    return {
      principais:
        "Demonstrativo + Resolução de Problemas + Trabalho Independente",
      detalhado: `MÉTODO DEMONSTRATIVO: resolução progressiva e comentada no quadro negro, do exemplo simples ao complexo. MÉTODO DE RESOLUÇÃO DE PROBLEMAS: situações contextualizadas do quotidiano angolano para modelação matemática. MÉTODO DE TRABALHO INDEPENDENTE: exercícios individuais com correcção colectiva no quadro. TÉCNICAS: resolução progressiva por níveis de dificuldade; correcção colectiva no quadro; trabalho em pares.`,
      meios: `Quadro negro e giz, manual escolar de ${disc}, ficha de exercícios com 2 níveis de dificuldade, caderno do aluno`,
    };

  if (isLing && natureza === "procedimental")
    return {
      principais:
        "Analítico-Sintético + Activo-Participativo + Produção Escrita",
      detalhado: `MÉTODO ANALÍTICO-SINTÉTICO: análise do texto por partes e síntese das ideias. MÉTODO ACTIVO-PARTICIPATIVO: leitura em voz alta, questionamento oral, produção escrita guiada. TÉCNICAS: leitura em cadeia; questionamento oral com progressão cognitiva (da recordação à aplicação); produção orientada; correcção colectiva no quadro.`,
      meios: `Texto impresso de autor angolano, ficha de interpretação, quadro negro e giz, caderno do aluno, manual escolar de ${disc}`,
    };

  if (classeNum <= 6)
    return {
      principais: "Expositivo Dialogado + Activo-Participativo + Demonstrativo",
      detalhado: `MÉTODO EXPOSITIVO DIALOGADO: explicação simples e dialogada, com recurso a exemplos concretos do quotidiano. MÉTODO ACTIVO-PARTICIPATIVO: actividades práticas e lúdicas para fixação. MÉTODO DEMONSTRATIVO: exemplificação clara no quadro. TÉCNICAS: questionamento oral simples; exercícios práticos; trabalho em pares.`,
      meios: `Quadro negro e giz, cartaz ilustrativo, fichas de exercícios, manual escolar, material manipulável`,
    };

  return {
    principais:
      "Expositivo Dialogado + Elaboração Conjunta + Trabalho Independente",
    detalhado: `MÉTODO EXPOSITIVO DIALOGADO: apresentação dos conceitos com participação activa dos alunos. MÉTODO DE ELABORAÇÃO CONJUNTA: construção do conhecimento em conjunto professor-alunos com exemplos progressivos. MÉTODO DE TRABALHO INDEPENDENTE: exercícios individuais para consolidação. TÉCNICAS: questionamento oral graduado; análise de exemplos; produção individual; correcção colectiva no quadro.`,
    meios: `Quadro negro e giz, manual escolar de ${disc}, fichas de exercícios, caderno do aluno`,
  };
}

function gerarDesenvolvimento(
  tema: string,
  disc: string,
  duracao: string,
  faixa: ReturnType<typeof detectFaixaEtaria>,
): DesenvolvimentoEtapaAI[] {
  const total = parseInt(duracao) || 45;
  let motivMin: number, devMin: number, consMin: number, sintMin: number;

  if (total <= 45) {
    motivMin = 5;
    devMin = 20;
    consMin = 15;
    sintMin = 5;
  } else if (total <= 60) {
    motivMin = 5;
    devMin = 25;
    consMin = 20;
    sintMin = 10;
  } else {
    motivMin = 10;
    devMin = 40;
    consMin = 30;
    sintMin = 10;
  }

  const { classeNum } = faixa;
  const discLow = disc.toLowerCase();
  const isLing =
    discLow.includes("português") ||
    discLow.includes("lingua") ||
    discLow.includes("língua");
  const isMat = discLow.includes("matem");

  let motivProf: string, motivAlun: string;
  let devProf: string, devAlun: string;
  let consProf: string, consAlun: string;

  if (classeNum <= 6) {
    motivProf = `Mostra um cartaz ou objecto relacionado com ${tema}; faz perguntas motivadoras simples; regista as respostas no quadro.`;
    motivAlun = `Observam o cartaz; respondem oralmente; partilham experiências do seu quotidiano ligadas ao tema.`;
  } else {
    motivProf = `Apresenta uma situação ou problema real do contexto angolano relacionado com ${tema}; regista as respostas no quadro; estabelece a ligação com a aula anterior.`;
    motivAlun = `Respondem oralmente; partilham conhecimentos prévios; levantam hipóteses sobre o novo conteúdo.`;
  }

  if (isMat) {
    devProf = `Resolve exemplos progressivos de ${tema} no quadro negro explicando cada passo; começa com casos simples e avança para mais complexos; usa a linguagem matemática correcta; convida os alunos a antecipar os passos seguintes.`;
    devAlun = `Copiam os exemplos; acompanham a resolução; antecipam os passos seguintes; colocam dúvidas; verificam os resultados por substituição.`;
    consProf = `Distribui ficha de exercícios com 2 níveis de dificuldade; circula pela sala e apoia; orienta a correcção colectiva no quadro com participação dos alunos.`;
    consAlun = `Resolvem os exercícios individualmente; trocam com o colega para revisão; um aluno resolve no quadro; todos corrigem e registam.`;
  } else if (isLing) {
    devProf = `Distribui o texto; faz a leitura modelo em voz alta; orienta a leitura em cadeia; formula perguntas de interpretação progressivas (literais, inferenciais, críticas); explica vocabulário novo com exemplos do contexto angolano.`;
    devAlun = `Seguem a leitura; lêem em cadeia; respondem às perguntas oralmente; sublinham passagens importantes; registam vocabulário novo no caderno.`;
    consProf = `Distribui a ficha de interpretação; circula e apoia; propõe a produção escrita guiada; orienta a correcção colectiva no quadro.`;
    consAlun = `Preenchem a ficha de interpretação individualmente; produzem o texto pedido; um aluno lê a produção; a turma comenta e melhora.`;
  } else {
    devProf = `Expõe os conceitos de ${tema} com exemplos progressivos e contextualizados em Angola; usa o quadro negro para esquematizar; formula perguntas de verificação da compreensão ao longo da exposição.`;
    devAlun = `Tomam notas; respondem às perguntas orais; colocam dúvidas; copiam o esquema do quadro.`;
    consProf = `Distribui ficha de exercícios; circula pela sala e apoia os alunos com dificuldades; orienta a correcção colectiva no quadro negro.`;
    consAlun = `Resolvem os exercícios individualmente ou em pares; comparam os resultados; um aluno vai ao quadro corrigir; todos registam as correcções.`;
  }

  return [
    {
      etapa: "Motivação (Gagné 1-2)",
      duracao: `${motivMin} min`,
      actividadesProfessor: motivProf,
      actividadesAlunos: motivAlun,
    },
    {
      etapa: "Desenvolvimento (Gagné 3-6)",
      duracao: `${devMin} min`,
      actividadesProfessor: devProf,
      actividadesAlunos: devAlun,
    },
    {
      etapa: "Consolidação (Gagné 7-8)",
      duracao: `${consMin} min`,
      actividadesProfessor: consProf,
      actividadesAlunos: consAlun,
    },
    {
      etapa: "Síntese e Avaliação (Gagné 9)",
      duracao: `${sintMin} min`,
      actividadesProfessor: `Faz a síntese oral dos conteúdos abordados sobre ${tema} para retenção; coloca as 3 perguntas de controlo alinhadas aos objectivos específicos; regista o sumário no quadro negro; indica os 2 TPCs para transferência.`,
      actividadesAlunos: `Respondem às 3 perguntas de controlo; completam o sumário no caderno; registam os 2 TPCs; colocam dúvidas finais.`,
    },
  ];
}

function gerarPerguntasControlo(
  tema: string,
  disc: string,
  faixa: ReturnType<typeof detectFaixaEtaria>,
  natureza: TemaNatureza,
  sumario?: string,
): string[] {
  // As perguntas de controlo estão ALINHADAS aos OEs (mesmo nível Bloom)
  // PC1 → OE1 (N1/N2: Recordar/Compreender)
  // PC2 → OE2 (N2/N3: Compreender/Aplicar)
  // PC3 → OE3 (N3/N4+: Aplicar/Analisar — contexto angolano concreto)
  const { classeNum } = faixa;
  const discLow = disc.toLowerCase();
  const foco = focoDoSumario(sumario, tema);
  const isLing =
    discLow.includes("português") ||
    discLow.includes("lingua") ||
    discLow.includes("língua");
  const isMat =
    discLow.includes("matem") ||
    discLow.includes("física") ||
    discLow.includes("fisica");

  if (isMat)
    return [
      // PC1 alinhada ao OE1 (N1 — Identificar)
      `PC1 (Bloom N1 — alinhada ao OE1): Identifica os dados e a incógnita do seguinte exercício de ${foco}: [exercício concreto da ficha].`,
      // PC2 alinhada ao OE2 (N3 — Resolver)
      `PC2 (Bloom N3 — alinhada ao OE2): Resolve passo a passo o seguinte exercício de ${foco}, mostrando todos os cálculos: [exercício de nível médio].`,
      // PC3 alinhada ao OE3 (N3 — Demonstrar — contexto angolano completo)
      `PC3 (Bloom N3 — alinhada ao OE3): A Joana vende peixe no mercado do Roque Santeiro em Luanda. Ela tem 240 kwanzas e quer comprar ${foco}. Demonstra, com todos os passos, como ela pode resolver este problema.`,
    ];

  if (isLing && natureza === "procedimental") {
    if (classeNum <= 6)
      return [
        // PC1 alinhada ao OE1 (N1 — Reconhecer)
        `PC1 (Bloom N1 — alinhada ao OE1): Reconhece as personagens e os dois acontecimentos principais do texto sobre ${foco} que lemos hoje.`,
        // PC2 alinhada ao OE2 (N2 — Descrever)
        `PC2 (Bloom N2 — alinhada ao OE2): Descreve com as tuas palavras o que aconteceu na parte mais importante do texto sobre ${foco}.`,
        // PC3 alinhada ao OE3 (N3 — Produzir)
        `PC3 (Bloom N3 — alinhada ao OE3): O Mateus, um aluno do teu bairro no Lubango, encontra a mesma situação do texto. Produz 2 frases a descrever o que ele faria, usando as palavras novas da aula.`,
      ];
    return [
      // PC1 alinhada ao OE1 (N1/N2 — Identificar)
      `PC1 (Bloom N1/N2 — alinhada ao OE1): Identifica a ideia central do texto sobre ${foco} que analisámos. Escreve-a numa frase completa.`,
      // PC2 alinhada ao OE2 (N2/N3 — Resumir/Redigir)
      `PC2 (Bloom N2/N3 — alinhada ao OE2): Resume o texto sobre ${foco} em não mais de 3 linhas, preservando as ideias essenciais, sem consultar o manual.`,
      // PC3 alinhada ao OE3 (N3/N4 — Redigir/Analisar — contexto angolano)
      `PC3 (Bloom N3 — alinhada ao OE3): O Kiala, aluno de uma escola em Luanda, lê este texto sobre ${foco}. Redige um parágrafo de 4 linhas que relaciona ${foco} com uma situação concreta que o Kiala vive no seu bairro.`,
    ];
  }

  if (classeNum <= 6)
    return [
      // PC1 N1 (Reconhecer)
      `PC1 (Bloom N1 — alinhada ao OE1): Reconhece um exemplo de ${foco} entre os seguintes casos que o professor vai mostrar. Indica qual é e porquê.`,
      // PC2 N2 (Descrever)
      `PC2 (Bloom N2 — alinhada ao OE2): Descreve com as tuas palavras as características principais de ${foco} que aprendemos hoje.`,
      // PC3 N3 (Produzir — contexto angolano)
      `PC3 (Bloom N3 — alinhada ao OE3): A Joana mora num bairro do Lubango e encontrou um exemplo de ${foco} no seu caminho para a escola. Produz 2 frases a descrever esse exemplo usando o que aprendeste.`,
    ];

  return [
    // PC1 N1/N2 (Definir/Identificar — alinhada ao OE1)
    `PC1 (Bloom N1/N2 — alinhada ao OE1): Define ${foco} com as características essenciais aprendidas hoje, sem consultar o caderno.`,
    // PC2 N2/N3 (Explicar/Aplicar — alinhada ao OE2)
    `PC2 (Bloom N2/N3 — alinhada ao OE2): Explica com as tuas próprias palavras como se aplica ${foco} num exercício ou situação concreta. Usa um exemplo dado na aula de hoje.`,
    // PC3 N3/N4 (Demonstrar/Analisar — contexto angolano completo, sem placeholders)
    `PC3 (Bloom N3 — alinhada ao OE3): A Ana, vendedeira no mercado do Roque Santeiro em Luanda, encontra uma situação ligada a ${foco}. Descreve um caso concreto do dia-a-dia dela e demonstra como aplicarias o que aprendeste hoje para o resolver.`,
  ];
}

function gerarTPC(
  tema: string,
  disc: string,
  faixa: ReturnType<typeof detectFaixaEtaria>,
  sumario?: string,
): TarefaDeCasaAI[] {
  // EXACTAMENTE 2 tarefas: TPC1 = retenção (manual) | TPC2 = transferência (caderno + Angola)
  const { classeNum } = faixa;
  const discLow = disc.toLowerCase();
  const foco = focoDoSumario(sumario, tema);
  const refManual = `Manual de ${disc}${classeNum > 0 ? ` ${classeNum}ª classe` : ""} (INIDE), Unidade sobre ${tema}. Confirmar página com a edição da escola.`;
  const isMat =
    discLow.includes("matem") ||
    discLow.includes("física") ||
    discLow.includes("fisica");
  const isLing =
    discLow.includes("português") ||
    discLow.includes("lingua") ||
    discLow.includes("língua");

  if (isMat)
    return [
      {
        // TPC1 — retenção: exercício do manual
        descricao: `Completa os exercícios sobre ${foco} do manual, apresentando todos os passos e verificando os resultados por substituição.`,
        referencia: refManual,
        tempoEstimado: "20 min",
      },
      {
        // TPC2 — transferência: problema contextualizado Angola
        descricao: `Cria e resolve 1 problema original sobre ${foco} usando dados de uma situação real do teu bairro em Angola (mercado, escola, família). Apresenta todos os passos no caderno.`,
        referencia: "Caderno do aluno",
        tempoEstimado: "20 min",
      },
    ];

  if (isLing) {
    if (classeNum <= 6)
      return [
        {
          // TPC1 — retenção
          descricao: `Lê o texto sobre ${foco} para um familiar em casa. Pede-lhe que te faça 2 perguntas sobre o texto e responde-as por escrito no caderno.`,
          referencia: refManual,
          tempoEstimado: "20 min",
        },
        {
          // TPC2 — transferência: produção contextualizada
          descricao: `Escreve 3 frases sobre ${foco} usando pelo menos 3 palavras novas aprendidas na aula, com um exemplo do teu bairro ou escola em Angola.`,
          referencia: "Caderno do aluno",
          tempoEstimado: "20 min",
        },
      ];
    return [
      {
        // TPC1 — retenção: exercícios do manual
        descricao: `Completa os exercícios sobre ${foco} do manual, respondendo a todas as questões de interpretação e vocabulário propostas.`,
        referencia: refManual,
        tempoEstimado: "20 min",
      },
      {
        // TPC2 — transferência: produção contextualizada Angola
        descricao: `Escreve um texto de 10 a 15 linhas sobre ${foco} usando um exemplo da realidade angolana que conheces bem (bairro, escola, mercado, família). Respeita a estrutura estudada na aula.`,
        referencia: "Caderno do aluno",
        tempoEstimado: "20 min",
      },
    ];
  }

  return [
    {
      // TPC1 — retenção: exercício do manual
      descricao: `Estuda os conteúdos de ${foco} e responde às perguntas do manual sobre ${tema}.`,
      referencia: refManual,
      tempoEstimado: "20 min",
    },
    {
      // TPC2 — transferência: exemplo angolano
      descricao: `Pesquisa um exemplo real de ${foco} na tua comunidade ou cidade angolana. Descreve-o em 5 a 8 linhas no caderno e explica a relação com o que aprendeste hoje.`,
      referencia: "Caderno do aluno",
      tempoEstimado: "20 min",
    },
  ];
}

function gerarDiferenciacaoPedagogica(
  tema: string,
  disc: string,
  faixa: ReturnType<typeof detectFaixaEtaria>,
  sumario?: string,
): { dificuldades: string; avancados: string } {
  // Tomlinson: dificuldades = diferenciação do processo e produto
  //            avançados = diferenciação do conteúdo e produto
  // Vygotsky ZDP: mediação por pares para alunos com dificuldades
  const foco = focoDoSumario(sumario, tema);
  const discLow = disc.toLowerCase();
  const isMat =
    discLow.includes("matem") ||
    discLow.includes("física") ||
    discLow.includes("fisica");

  const dificuldades = isMat
    ? `Diferenciação do processo e produto (Tomlinson): fornecer ficha de nível 1 com exercícios simplificados de ${foco} já com o 1.º passo resolvido como modelo; usar material manipulável (pedras, palitos) para tornar o conceito concreto; reduzir para 5 exercícios em vez de 10; trabalho em par com colega mais avançado (mediação por pares — Vygotsky ZDP); permitir consulta do manual durante os exercícios.`
    : `Diferenciação do processo e produto (Tomlinson): fornecer ficha simplificada sobre ${foco} com linguagem acessível e frases-modelo; permitir consulta do manual durante os exercícios; reduzir a extensão da produção (de 10 linhas para 5); trabalho em par com colega mais avançado (mediação por pares — Vygotsky ZDP). O professor regista as dificuldades observadas para planificação de apoio (Perrenoud).`;

  const avancados = isMat
    ? `Diferenciação do conteúdo e produto (Tomlinson): propor ficha de nível 2 com exercícios de maior complexidade sobre ${foco}; desafiar a criar 2 problemas originais com dados de situações reais angolanas (mercado, transporte, agricultura); apresentar a resolução ao resto da turma com explicação do raciocínio (produto mais elaborado).`
    : `Diferenciação do conteúdo e produto (Tomlinson): propor análise adicional aprofundada de ${foco} com exemplos de maior complexidade não abordados na aula; solicitar produção mais extensa com argumentação (mínimo 15 linhas); desafiar a pesquisar e apresentar à turma um exemplo adicional da realidade angolana não visto na aula.`;

  return { dificuldades, avancados };
}

function gerarAvaliacao(disc: string, natureza: TemaNatureza): string {
  // Luckesi — avaliação formativa como processo dialógico, não apenas mensuração
  // Perrenoud — regulação das aprendizagens com base nos resultados observados
  // Ponderação padrão: ficha 50% + participação oral 30% + perguntas de controlo 20%
  return `Avaliação formativa (Luckesi — processo dialógico): correcção dos exercícios da ficha (evidência de desempenho) 50% + participação oral nas actividades (processo dialógico) 30% + qualidade das respostas às perguntas de controlo (retenção imediata) 20% = 100%. O professor circula durante os exercícios para feedback imediato e regista observações qualitativas sobre dificuldades individuais para planificação de apoio (regulação Perrenoud).`;
}

export function buildTemplatePlan(
  classe: string,
  disciplina: string,
  tema: string,
  duracao: string,
  sumario?: string,
): LessonPlanAIResult {
  const faixa = detectFaixaEtaria(classe);
  const natureza = detectTemaNatureza(tema);
  const discLow = disciplina.toLowerCase();

  const { geral: objGeral, especificos: objEspecificos } =
    natureza === "procedimental"
      ? gerarObjetivosProcedimental(tema, disciplina, faixa, sumario)
      : gerarObjetivosConceptual(tema, disciplina, faixa, sumario);

  const conteudos = gerarConteudos(tema, disciplina, faixa, natureza, sumario);
  const { principais, detalhado, meios } = gerarMetodos(
    disciplina,
    faixa,
    natureza,
  );
  const desenvolvimento = gerarDesenvolvimento(
    tema,
    disciplina,
    duracao,
    faixa,
  );
  const perguntasControlo = gerarPerguntasControlo(
    tema,
    disciplina,
    faixa,
    natureza,
    sumario,
  );
  const tpc = gerarTPC(tema, disciplina, faixa, sumario);
  const diferenciacao = gerarDiferenciacaoPedagogica(tema, disciplina, faixa, sumario);
  const avaliacao = gerarAvaliacao(disciplina, natureza);

  return {
    sumario: sumario || `${tema} — ${disciplina}, ${classe}`,
    faixaEtaria: `${faixa.faixa} (${faixa.nivel})`,
    objetivoGeral: objGeral,
    objetivosEspecificos: objEspecificos,
    conteudos,
    metodosPrincipais: principais,
    metodos: detalhado,
    meios,
    desenvolvimentoAula: desenvolvimento,
    perguntasControlo,
    tarefaDeCasa: tpc,
    tarefasPraticas: tpc.map((t) => t.descricao),
    avaliacao,
    diferenciacaoPedagogica: diferenciacao,
    observacoes: `Adequar os exemplos ao nível cognitivo e ao contexto cultural da turma. Usar a terminologia do sistema angolano: "sumário", "TPC", "quadro negro", "ficha de exercícios". Contextualizar sempre com exemplos da realidade angolana.`,
    score: 78,
    sugestoes: [
      "Incluir texto ou exercício de autor angolano para maior contextualização",
      "Diversificar os meios de ensino com recursos visuais (cartazes, esquemas no quadro)",
      "Planificar actividade de recuperação para os alunos que não atingiram os objectivos",
    ],
  };
}

export async function generateLessonPlanOffline(
  classe: string,
  disciplina: string,
  tema: string,
  duracao: string,
  onStatus: (s: GenerationStatus) => void,
  sumario?: string,
): Promise<LessonPlanAIResult> {
  if (Platform.OS === "web") {
    try {
      return await generateWithQwen(
        classe,
        disciplina,
        tema,
        duracao,
        onStatus,
        sumario,
      );
    } catch (err: any) {
      onStatus({ stage: "error", error: err.message });
      throw err;
    }
  } else {
    onStatus({ stage: "generating", message: "A gerar plano pedagógico..." });
    await new Promise((r) => setTimeout(r, 500));
    const result = buildTemplatePlan(
      classe,
      disciplina,
      tema,
      duracao,
      sumario,
    );
    onStatus({ stage: "done" });
    return result;
  }
}

export function isModelCachedWeb(): boolean {
  if (Platform.OS !== "web") return false;
  return pipelineInstance !== null;
}

export function resetModel(): void {
  pipelineInstance = null;
  pipelineLoading = false;
  pipelineLoadCallbacks = [];
}
