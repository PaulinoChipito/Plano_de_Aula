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

// ═══ CAMADA 1 — SYSTEM PROMPT (Bloco 1: Regras absolutas) ═══
const SYSTEM_PROMPT = `Você é um planificador pedagógico angolano. Gere um plano de aula seguindo EXACTAMENTE o formato do exemplo fornecido.

REGRAS ABSOLUTAS:
1. O Objectivo Geral menciona o MESMO conteúdo dos Objectivos Específicos.
2. Use verbos de Bloom diferentes: OE1=Recordar, OE2=Compreender, OE3=Aplicar.
3. Cada OE tem Comportamento + Condição + Critério (Mager).
4. As 4 etapas seguem Gagné: Motivação (Gagné 1-2), Desenvolvimento (Gagné 3-6), Consolidação (Gagné 7-8), Síntese e Avaliação (Gagné 9).
5. Actividades de Desenvolvimento são do tipo de aula indicado. Nunca leitura em cadeia se for Teórica ou Experimental.
6. Use terminologia angolana: sumário, TPC, quadro negro, ficha de exercícios, correcção colectiva.
7. As 3 perguntas de controlo usam os MESMOS verbos dos 3 OEs: (Recordação), (Compreensão), (Aplicação).
8. Avaliação formativa (Luckesi): ficha 50%, participação 30%, controlo 20%. Total: 100%.
9. Diferenciação (Tomlinson) por conteúdo, processo e produto.
10. Todas as frases completas. Nunca truncadas. Nunca campos vazios.
Responde APENAS com JSON válido. Sem markdown. Sem texto fora do JSON.`;

// ═══ CAMADA 2 — EXEMPLO PERFEITO (Bloco 2: Few-shot com o plano de Matemática 7ª) ═══
const EXAMPLE_JSON = JSON.stringify({
  sumario: "Equações do 1º grau com uma incógnita",
  faixaEtaria: "I Ciclo do Ensino Secundário (12–15 anos)",
  objetivoGeral:
    "Resolver equações do primeiro grau com uma incógnita aplicadas a situações do comércio angolano, acertando pelo menos 7 em 10 exercícios.",
  objetivosEspecificos: [
    "(Recordar) Identificar os elementos de uma equação do primeiro grau, sem consulta, enumerando pelo menos 3 componentes correctos.",
    "(Compreender) Explicar o método de resolução de equações do primeiro grau, com consulta do caderno, descrevendo as 3 etapas essenciais.",
    "(Aplicar) Resolver problemas do comércio angolano (preços, trocos) usando equações do primeiro grau, a partir de uma ficha com 8 casos, acertando pelo menos 6.",
  ],
  conteudos: [
    "Conceito e elementos de uma equação do primeiro grau.",
    "Propriedades e etapas de resolução de equações.",
    "Exemplos práticos de equações aplicadas ao comércio angolano.",
    "Aplicação e exercícios de consolidação.",
  ],
  metodosPrincipais:
    "Método Expositivo Dialogado + Método de Resolução de Problemas",
  metodos:
    "Método Expositivo Dialogado: explica no quadro os elementos da equação; alunos respondem oralmente e copiam exemplos. Método de Resolução de Problemas: apresenta situação do comércio angolano; alunos resolvem com mediação do professor. Técnicas: questionamento oral graduado; análise de exemplos numéricos; resolução individual; correcção colectiva no quadro.",
  meios:
    "quadro negro e giz, manual escolar de Matemática (INIDE), fichas de exercícios, caderno do aluno, calculadora simples",
  desenvolvimentoAula: [
    {
      etapa: "Motivação (Gagné 1-2)",
      duracao: "10 min",
      actividadesProfessor:
        "Apresenta problema real: vendedor no mercado do Sambizanga que precisa calcular preços; regista respostas no quadro; liga à aula anterior sobre expressões algébricas.",
      actividadesAlunos:
        "Respondem oralmente; partilham conhecimentos prévios; levantam hipóteses sobre como resolver.",
    },
    {
      etapa: "Desenvolvimento (Gagné 3-6)",
      duracao: "40 min",
      actividadesProfessor:
        "Escreve equação no quadro negro; explica elementos (incógnita, 1º membro, 2º membro); demonstra resolução passo a passo; distribui ficha com 8 problemas comerciais angolanos.",
      actividadesAlunos:
        "Copiam exemplos; resolvem exercícios guiados; preenchem ficha individualmente; levantam dúvidas.",
    },
    {
      etapa: "Consolidação (Gagné 7-8)",
      duracao: "30 min",
      actividadesProfessor:
        "Circula pela sala dando feedback imediato; orienta correcção colectiva no quadro; regista erros comuns.",
      actividadesAlunos:
        "Verificam respostas; participam na correcção colectiva; corrigem erros no caderno.",
    },
    {
      etapa: "Síntese e Avaliação (Gagné 9)",
      duracao: "10 min",
      actividadesProfessor:
        "Faz síntese oral; coloca 3 perguntas de controlo; regista sumário no quadro negro; indica os 2 TPCs.",
      actividadesAlunos:
        "Respondem às perguntas; completam sumário no caderno; registam os 2 TPCs.",
    },
  ],
  perguntasControlo: [
    "(Recordação) Identifica os 3 elementos essenciais de uma equação do primeiro grau com uma incógnita.",
    "(Compreensão) Explica com as tuas palavras por que razão as equações são úteis no comércio angolano. Usa um exemplo concreto.",
    "(Aplicação) Um vendedor no mercado do Sambizanga vende 5 pacotes de arroz e recebe 500 kz de troco de 2000 kz. Monta a equação que representa esta situação e resolve-a.",
  ],
  tarefaDeCasa: [
    {
      descricao:
        "Completa os exercícios sobre equações do primeiro grau do manual, apresentando todos os passos.",
      referencia:
        "Manual de Matemática 7ª classe (INIDE), Unidade III, páginas 45-47.",
      tempoEstimado: "20 min",
    },
    {
      descricao:
        "Resolve 3 problemas do teu bairro ou mercado usando equações do primeiro grau. Apresenta todos os passos no caderno.",
      referencia: "Caderno do aluno.",
      tempoEstimado: "20 min",
    },
  ],
  avaliacao:
    "Correcção dos exercícios da ficha (evidência de desempenho): 50%. Participação oral na resolução dos problemas (processo dialógico): 30%. Qualidade das respostas às perguntas de controlo (retenção imediata): 20%. Total: 100%. O professor regista observações qualitativas sobre dificuldades para regulação das aprendizagens.",
  diferenciacaoPedagogica: {
    dificuldades:
      "Alunos com dificuldades (processo e produto — Tomlinson): ficha com problemas numéricos mais simples; consulta do manual permitida; redução da extensão da produção; trabalho em par com colega mais avançado (mediação por pares — Vygotsky).",
    avancados:
      "Alunos avançados (conteúdo e produto — Tomlinson): análise adicional de problemas com duas incógnitas; produção mais extensa com argumentação do raciocínio; desafio de criar um problema original do seu bairro.",
  },
  observacoes:
    "Adequar exemplos ao nível cognitivo e contexto cultural da turma. Contextualizar sempre com exemplos da realidade angolana.",
  score: 90,
  sugestoes: [
    "Verificar se todos os alunos têm acesso ao manual indicado",
    "Preparar ficha de recuperação para a próxima aula",
    "Incluir representação gráfica das equações para visualização",
  ],
});

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

// ═══ CAMADA 3 — INSTRUÇÃO DE GERAÇÃO (Bloco 3) ═══
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
  const sumarioLine = sumario ? `- SUMÁRIO: ${sumario}` : "";

  return `EXEMPLO DE PLANO PERFEITO (segue EXACTAMENTE este formato JSON):
${EXAMPLE_JSON}

AGORA GERE O PLANO DE AULA PARA:
- DISCIPLINA: ${disciplina}
- CLASSE/ANO: ${classe} (${nivel})
- TEMA: ${tema}
- TIPO DE AULA: ${tipoAula}
- DURAÇÃO: ${duracao} minutos
${sumarioLine}

SIGA EXACTAMENTE O MESMO FORMATO JSON DO EXEMPLO ACIMA.
Adapta todos os conteúdos, verbos, exemplos e contextos à nova disciplina, classe e tema.
USE OS MESMOS VERBOS DE BLOOM NOS 3 OEs: OE1=(Recordar), OE2=(Compreender), OE3=(Aplicar).
USE OS MESMOS LABELS NAS PERGUNTAS: PC1=(Recordação), PC2=(Compreensão), PC3=(Aplicação).
TPC: exactamente 2 tarefas com 20 min cada.
Avaliação: 50% + 30% + 20% = 100%.
Responde APENAS com JSON válido. Sem markdown. Sem texto fora do JSON.`;
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
  const plan = mergeWithDefaults(
    parsed,
    classe,
    disciplina,
    tema,
    duracao,
    sumario,
  );
  const erros = validatePlan(plan, tema);
  if (erros.length > 0) {
    console.warn("[validatePlan] Problemas detectados:", erros);
    plan.sugestoes = [
      ...erros.map((e) => `⚠️ ${e}`),
      ...(plan.sugestoes || []),
    ].slice(0, 5);
  }
  return plan;
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

// ═══ VALIDAÇÃO DO PLANO (Bloco 3 — pseudocódigo Python implementado em TypeScript) ═══
function validatePlan(plan: LessonPlanAIResult, tema: string): string[] {
  const erros: string[] = [];

  // Regra 1: OG contém palavras do Tema
  const temaWords = tema
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const ogLower = plan.objetivoGeral.toLowerCase();
  if (temaWords.length > 0 && !temaWords.some((w) => ogLower.includes(w))) {
    erros.push(
      "ERRO 1: Objectivo Geral não menciona o conteúdo do Tema. Verificar coerência vertical.",
    );
  }

  // Regra 2: Exactamente 3 OEs
  if (plan.objetivosEspecificos.length !== 3) {
    erros.push(
      `ERRO 2: Devem existir exactamente 3 Objectivos Específicos (encontrados: ${plan.objetivosEspecificos.length}).`,
    );
  }

  // Regra 3: Verbos dos OEs diferentes
  const verbos = plan.objetivosEspecificos.map((oe) =>
    oe
      .replace(/^\([^)]+\)\s*/i, "")
      .trim()
      .split(/\s+/)[0]
      .toLowerCase(),
  );
  if (new Set(verbos).size < verbos.length) {
    erros.push(
      "ERRO 3: Os verbos dos Objectivos Específicos estão repetidos. Cada OE deve usar verbo de Bloom diferente.",
    );
  }

  // Regra 4: Cada OE tem 3 componentes Mager (pelo menos 2 vírgulas)
  plan.objetivosEspecificos.forEach((oe, i) => {
    const commas = (oe.match(/,/g) || []).length;
    if (commas < 2) {
      erros.push(
        `ERRO 4: OE${i + 1} não tem os 3 componentes de Mager (Comportamento + Condição + Critério).`,
      );
    }
  });

  // Regra 5: As 4 etapas de Gagné existem no desenvolvimento
  const etapas = plan.desenvolvimentoAula.map((e) => e.etapa.toLowerCase());
  if (!etapas.some((e) => e.includes("motivação") || e.includes("motivacao")))
    erros.push("ERRO 5: Etapa Motivação (Gagné 1-2) em falta no desenvolvimento.");
  if (!etapas.some((e) => e.includes("desenvolvimento")))
    erros.push("ERRO 5: Etapa Desenvolvimento (Gagné 3-6) em falta.");
  if (!etapas.some((e) => e.includes("consolidação") || e.includes("consolidacao")))
    erros.push("ERRO 5: Etapa Consolidação (Gagné 7-8) em falta.");
  if (
    !etapas.some(
      (e) =>
        e.includes("síntese") ||
        e.includes("sintese") ||
        e.includes("avaliação") ||
        e.includes("avaliacao"),
    )
  )
    erros.push("ERRO 5: Etapa Síntese/Avaliação (Gagné 9) em falta.");

  // Regra 6: Frases truncadas (terminam em palavras incompletas)
  const truncPattern = /\b(do|no|para o|teu|seu|com o|de o|na)\s*\.?\s*$/i;
  [...plan.objetivosEspecificos, ...plan.perguntasControlo].forEach(
    (text, i) => {
      if (truncPattern.test(text.trim())) {
        erros.push(`ERRO 6: Frase truncada detectada no texto ${i + 1}.`);
      }
    },
  );

  // Regra 7: Terminologia angolana presente
  const fullText = JSON.stringify(plan).toLowerCase();
  if (!fullText.includes("tpc") && !fullText.includes("tarefa de casa")) {
    erros.push("ERRO 7: Terminologia angolana TPC/Tarefa de Casa em falta.");
  }
  if (!fullText.includes("quadro") && !fullText.includes("ficha")) {
    erros.push(
      "ERRO 7: Terminologia angolana (quadro negro / ficha de exercícios) em falta.",
    );
  }

  // Regra 8: Perguntas de controlo alinhadas aos OEs (labels correctos)
  if (plan.perguntasControlo.length === 3) {
    const expectedLabels = ["recordação", "compreensão", "aplicação"];
    plan.perguntasControlo.forEach((pc, i) => {
      if (!pc.toLowerCase().includes(expectedLabels[i])) {
        erros.push(
          `ERRO 8: Pergunta de controlo ${i + 1} não tem label (${expectedLabels[i]}) alinhado ao OE${i + 1}.`,
        );
      }
    });
  }

  // Regra 9: Percentuais somam 100%
  const percentages = (plan.avaliacao.match(/(\d+)%/g) || []).map((p) =>
    parseInt(p),
  );
  if (percentages.length >= 2) {
    const sum = percentages.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      erros.push(
        `ERRO 9: Os percentuais da avaliação somam ${sum}% (devem somar 100%).`,
      );
    }
  }

  // Regra 10: TPC exactamente 2 tarefas
  if (plan.tarefaDeCasa && plan.tarefaDeCasa.length !== 2) {
    erros.push(
      `ERRO 10: Devem existir exactamente 2 TPCs (encontrados: ${plan.tarefaDeCasa.length}).`,
    );
  }

  return erros;
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
        `(Recordar) Reconhecer ${foco} em exemplos concretos apresentados em sala, sem consulta, identificando correctamente pelo menos 4 dos 5 exemplos da ficha.`,
        `(Compreender) Descrever as características principais de ${foco} a partir dos exemplos do manual, em pelo menos 2 linhas correctas.`,
        `(Aplicar) Produzir 2 exemplos originais de ${foco} usando situações do bairro ou escola em Angola, ambos gramaticalmente correctos.`,
      ],
    };
  }
  if (classeNum <= 9) {
    return {
      geral,
      especificos: [
        `(Recordar) Definir ${foco} com as características essenciais aprendidas, sem consulta, em pelo menos 3 linhas correctas.`,
        `(Compreender) Classificar exemplos de ${foco} a partir de uma ficha com 10 casos, acertando pelo menos 7 dos 10.`,
        `(Aplicar) Distinguir ${foco} de categorias próximas em textos ou situações da realidade angolana, justificando com pelo menos 2 critérios correctos.`,
      ],
    };
  }
  if (classeNum <= 12) {
    return {
      geral,
      especificos: [
        `(Recordar) Explicar ${foco} com precisão terminológica, incluindo todos os critérios de classificação, sem consulta, em pelo menos 4 linhas.`,
        `(Compreender) Aplicar os conceitos de ${foco} na resolução de pelo menos 3 casos práticos de uma ficha contextualizada na realidade angolana, acertando no mínimo 2.`,
        `(Aplicar) Analisar exemplos autênticos de ${foco} em situações do quotidiano angolano, justificando a classificação com pelo menos 3 critérios correctos.`,
      ],
    };
  }
  return {
    geral,
    especificos: [
      `(Recordar) Definir ${foco} com rigor terminológico, sem consulta, em pelo menos 5 linhas com critérios completos.`,
      `(Compreender) Comparar ${foco} com conceitos relacionados, identificando pelo menos 3 semelhanças e 3 diferenças a partir de textos propostos.`,
      `(Aplicar) Avaliar criticamente as implicações de ${foco} em contextos angolanos concretos, argumentando com pelo menos 2 fundamentos teóricos.`,
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
      geral: `Resolver problemas envolvendo ${tema}, aplicando os procedimentos matemáticos correctos em ${disc}.`,
      especificos: [
        `(Recordar) Identificar os dados, a incógnita e a operação adequada em pelo menos 4 dos 5 exercícios propostos sobre ${foco}, a partir da ficha, sem consulta.`,
        `(Compreender) Resolver exercícios de ${foco} aplicando o algoritmo correcto, a partir da ficha com 10 exercícios, acertando pelo menos 7.`,
        `(Aplicar) Demonstrar a verificação dos resultados de ${foco} por substituição ou estimativa, em pelo menos 2 problemas contextualizados na realidade angolana, apresentando todos os passos.`,
      ],
    };
  }
  if (isLing) {
    if (classeNum <= 6) {
      return {
        geral: `Realizar actividades de ${tema} com compreensão e expressão adequadas ao nível da ${classeNum}ª classe de ${disc}.`,
        especificos: [
          `(Recordar) Reconhecer as personagens e os acontecimentos principais do texto sobre ${foco}, respondendo a pelo menos 3 das 5 perguntas de interpretação da ficha, sem consulta.`,
          `(Compreender) Descrever a ideia principal do texto sobre ${foco} com as suas próprias palavras, em pelo menos 2 frases correctas.`,
          `(Aplicar) Produzir 3 frases correctas sobre ${foco} usando pelo menos 3 palavras novas aprendidas na aula, no caderno.`,
        ],
      };
    }
    if (classeNum <= 9) {
      return {
        geral: `Interpretar e analisar textos relacionados com ${tema}, desenvolvendo competências de compreensão crítica em ${disc}.`,
        especificos: [
          `(Recordar) Identificar a ideia central e 2 ideias secundárias do texto sobre ${foco}, respondendo correctamente a pelo menos 4 das 6 questões de interpretação da ficha.`,
          `(Compreender) Resumir o texto sobre ${foco} em não mais de 5 linhas, preservando as ideias principais e a coerência textual, no caderno, sem consulta.`,
          `(Aplicar) Redigir um parágrafo de 6 a 8 linhas sobre ${foco} usando um exemplo da realidade angolana, respeitando a estrutura e os recursos linguísticos estudados.`,
        ],
      };
    }
    return {
      geral: `Analisar e produzir textos relacionados com ${tema}, aplicando competências de leitura crítica e escrita elaborada em ${disc}.`,
      especificos: [
        `(Recordar) Explicar os elementos estruturais e os recursos linguísticos de um texto sobre ${foco}, justificando pelo menos 2 escolhas do autor, a partir do texto proposto.`,
        `(Compreender) Produzir um texto de 15 a 20 linhas sobre ${foco} contextualizado na realidade angolana, respeitando a estrutura e os recursos linguísticos estudados.`,
        `(Aplicar) Analisar criticamente o ponto de vista do autor sobre ${foco}, fundamentando com pelo menos 2 citações directas do texto proposto.`,
      ],
    };
  }

  return {
    geral: `Aplicar os procedimentos e competências de ${tema} em situações concretas no âmbito de ${disc}.`,
    especificos: [
      `(Recordar) Reconhecer os elementos essenciais de ${foco} a partir de casos práticos da ficha, acertando pelo menos 7 dos 10 exemplos propostos, sem consulta.`,
      `(Compreender) Executar correctamente os procedimentos de ${foco} completando pelo menos 3 das 4 tarefas práticas propostas, com mediação do professor quando necessário.`,
      `(Aplicar) Demonstrar a aplicação de ${foco} na resolução de um problema contextualizado na realidade angolana, apresentando todo o processo com pelo menos 2 passos correctos.`,
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
      `(Recordação) Identifica os dados e a incógnita do seguinte exercício de ${foco} apresentado no quadro negro.`,
      `(Compreensão) Explica, passo a passo, como resolverias um exercício de ${foco} usando o método aprendido hoje. Usa um exemplo concreto.`,
      `(Aplicação) A Joana vende peixe no mercado do Roque Santeiro em Luanda. Ela recebeu 2 000 kz e quer calcular ${foco}. Monta a equação e resolve-a, apresentando todos os passos.`,
    ];

  if (isLing && natureza === "procedimental") {
    if (classeNum <= 6)
      return [
        `(Recordação) Reconhece as personagens e os dois acontecimentos principais do texto sobre ${foco} que lemos hoje.`,
        `(Compreensão) Explica com as tuas palavras o que aconteceu na parte mais importante do texto sobre ${foco}.`,
        `(Aplicação) O Mateus, um aluno do teu bairro no Lubango, encontra a mesma situação do texto. Produz 2 frases a descrever o que ele faria, usando as palavras novas da aula.`,
      ];
    return [
      `(Recordação) Identifica a ideia central do texto sobre ${foco} que analisámos. Escreve-a numa frase completa.`,
      `(Compreensão) Explica com as tuas palavras como se relaciona ${foco} com a realidade angolana. Usa um exemplo concreto do texto.`,
      `(Aplicação) O Kiala, aluno de uma escola em Luanda, lê este texto sobre ${foco}. Redige um parágrafo de 4 linhas que relaciona ${foco} com uma situação concreta que o Kiala vive no seu bairro.`,
    ];
  }

  if (classeNum <= 6)
    return [
      `(Recordação) Reconhece um exemplo de ${foco} entre os casos que o professor apresentou hoje. Indica qual é e porquê.`,
      `(Compreensão) Descreve com as tuas palavras as características principais de ${foco} que aprendemos hoje.`,
      `(Aplicação) A Joana mora num bairro do Lubango e encontrou um exemplo de ${foco} no seu caminho para a escola. Produz 2 frases a descrever esse exemplo usando o que aprendeste.`,
    ];

  return [
    `(Recordação) Identifica as características essenciais de ${foco} aprendidas hoje, sem consultar o caderno.`,
    `(Compreensão) Explica com as tuas próprias palavras como se aplica ${foco} numa situação concreta. Usa um exemplo dado na aula de hoje.`,
    `(Aplicação) A Ana, vendedeira no mercado do Roque Santeiro em Luanda, encontra uma situação ligada a ${foco}. Demonstra como aplicarias o que aprendeste hoje para resolver o problema dela.`,
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
