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

const SYSTEM_PROMPT = `És um especialista em pedagogia e planificação didáctica com experiência no sistema de ensino angolano (INIDE). A tua função é gerar planos de aula completos, rigorosos e prontos a usar, adaptados ao contexto cultural, linguístico e desenvolvimental dos alunos angolanos.

FAIXA ETÁRIA (tabela de referência):
— 1ª a 4ª classe → 6–10 anos → Primário: linguagem simples, conteúdos concretos, actividades lúdicas.
— 5ª a 6ª classe → 10–12 anos → Primário avançado: abstracção gradual, classificações simples.
— 7ª a 9ª classe → 12–15 anos → I Ciclo Secundário: raciocínio abstracto em desenvolvimento, análise elementar.
— 10ª a 12ª classe → 15–18 anos → II Ciclo Secundário: pensamento crítico, análise e síntese, argumentação.
— Ensino Superior → +18 anos → nível académico: terminologia técnica, investigação.

REGRA CRÍTICA — NATUREZA DO TEMA:
A) TEMA CONCEPTUAL (ex: "Classe dos adjetivos", "O verbo") → objectivos: identificar, classificar, distinguir, definir, caracterizar.
B) TEMA PROCEDIMENTAL (ex: "Leitura e interpretação", "Resolução de equações") → NUNCA "definir leitura" ou "compreender a importância". Os objectivos descrevem O QUE O ALUNO FAZ: ler, interpretar, inferir, resumir, resolver, calcular, produzir.
C) TEMA MISTO → combina objectivos conceptuais e procedimentais.

REGRAS DE OBJECTIVOS:
— Objectivo Geral: 1 único verbo no infinitivo + competência central.
— Objectivos Específicos (3 a 5): formato OBRIGATÓRIO: VERBO + [o quê] + [a partir de quê] + [critério mensurável].
— Progressão de complexidade: do mais simples ao mais exigente.
— PROIBIDO: linguagem vaga como "compreender a importância", "desenvolver competências" sem critério.

PERGUNTAS DE CONTROLO: exactamente 3, com progressão:
— 1ª: recordação/identificação
— 2ª: compreensão/explicação com palavras próprias  
— 3ª: aplicação/análise em contexto angolano concreto

TPC: exercício com referência ao manual + tarefa criativa contextualizada em Angola + tempo estimado.

DIFERENCIAÇÃO PEDAGÓGICA: adaptações para alunos com dificuldades + extensão para alunos avançados.

QUALIDADE LINGUÍSTICA: terminologia angolana ("sumário", "TPC", "ficha de exercícios", "correcção colectiva", "quadro negro"), exemplos contextualizados em Angola, português europeu/angolano (não brasileiro).

Responde SEMPRE com JSON válido e sem markdown.`;

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
  else if (classeNum >= 5 && classeNum <= 6) nivel = "Ensino Primário avançado (10–12 anos)";
  else if (classeNum >= 7 && classeNum <= 9) nivel = "I Ciclo do Ensino Secundário (12–15 anos)";
  else if (classeNum >= 10 && classeNum <= 12) nivel = "II Ciclo do Ensino Secundário (15–18 anos)";
  else nivel = "Ensino Superior (+18 anos)";

  const sumarioLine = sumario
    ? `Sumário (descrição detalhada do que o professor vai leccionar): "${sumario}"`
    : "";

  return `Gera um plano de aula completo para:
Classe: ${classe} | Nível: ${nivel}
Disciplina: ${disciplina}
Tema: ${tema}
${sumarioLine}
Duração: ${duracao} minutos

Responde APENAS com este JSON (sem markdown):
{
  "sumario": "${sumario ? sumario : `título descritivo da aula (tema + disciplina + classe)`}",
  "faixaEtaria": "${nivel}",
  "objetivoGeral": "1 verbo infinitivo + competência central da aula (sem 'e', sem encadeamento)",
  "objetivosEspecificos": [
    "VERBO + [o quê] + [a partir de quê] + [critério mensurável concreto]",
    "VERBO + [o quê] + [a partir de quê] + [critério mensurável]",
    "VERBO + [o quê] + [a partir de quê] + [critério mensurável mais exigente]"
  ],
  "conteudos": ["subtema 1 concreto", "subtema 2", "subtema 3", "subtema 4"],
  "metodosPrincipais": "Método A + Método B",
  "metodos": "MÉTODO [NOME]: justificação breve. TÉCNICAS: técnicas específicas usadas.",
  "meios": "recursos concretos com autores/títulos angolanos se aplicável",
  "desenvolvimentoAula": [
    {"etapa": "Motivação", "duracao": "X min", "actividadesProfessor": "situação concreta da realidade angolana para motivar", "actividadesAlunos": "resposta e participação dos alunos"},
    {"etapa": "Desenvolvimento", "duracao": "X min", "actividadesProfessor": "exemplos progressivos do simples ao complexo", "actividadesAlunos": "notas, resposta e acompanhamento"},
    {"etapa": "Consolidação", "duracao": "X min", "actividadesProfessor": "distribui ficha; circula; orienta correcção colectiva", "actividadesAlunos": "exercício individual; correcção no quadro"},
    {"etapa": "Síntese e Avaliação", "duracao": "X min", "actividadesProfessor": "síntese dos conteúdos; perguntas de controlo; registo do sumário", "actividadesAlunos": "respostas; registo do sumário e TPC"}
  ],
  "perguntasControlo": [
    "1ª (recordação): pergunta directa sobre o conteúdo ensinado",
    "2ª (compreensão): explica com as tuas próprias palavras...",
    "3ª (aplicação): contexto angolano concreto — como aplicarias... / que exemplo do teu bairro/escola..."
  ],
  "tarefaDeCasa": [
    {"descricao": "exercício concreto do manual", "referencia": "Manual de ${disciplina}, pág. X, ex. Y", "tempoEstimado": "15 min"},
    {"descricao": "tarefa criativa contextualizada na realidade angolana", "referencia": "Caderno do aluno", "tempoEstimado": "10 min"}
  ],
  "avaliacao": "instrumentos usados durante a aula com critérios e ponderações (total = 100%)",
  "diferenciacaoPedagogica": {
    "dificuldades": "adaptações específicas para alunos com dificuldades de aprendizagem",
    "avancados": "extensão e aprofundamento para alunos avançados"
  },
  "observacoes": "notas adicionais para o professor",
  "score": 85,
  "sugestoes": ["sugestão 1 de melhoria", "sugestão 2", "sugestão 3"]
}`;
}

function extractJSON(text: string): string {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return cleaned;
}

async function loadPipeline(onStatus: (s: GenerationStatus) => void): Promise<void> {
  if (pipelineInstance) return;
  if (pipelineLoading) {
    return new Promise((resolve, reject) => {
      pipelineLoadCallbacks.push((err) => { if (err) reject(err); else resolve(); });
    });
  }
  pipelineLoading = true;
  try {
    onStatus({ stage: "downloading", progress: 0, message: "A iniciar descarga do modelo Qwen2.5..." });
    const { pipeline } = await import("@huggingface/transformers");
    pipelineInstance = await pipeline("text-generation", MODEL_ID, {
      dtype: "q4f16" as any,
      progress_callback: (info: any) => {
        if (info.status === "downloading" || info.status === "progress") {
          const pct = info.total > 0 ? Math.round((info.loaded / info.total) * 100) : 0;
          onStatus({ stage: "downloading", progress: pct, message: `A descarregar modelo: ${pct}%` });
        } else if (info.status === "initiate") {
          onStatus({ stage: "downloading", message: "A preparar modelo..." });
        } else if (info.status === "done") {
          onStatus({ stage: "loading", message: "A carregar modelo na memória..." });
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
  onStatus({ stage: "generating", message: "A gerar plano de aula com IA local..." });
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildPrompt(classe, disciplina, tema, duracao, sumario) },
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
    rawText = assistantMsg?.content ?? generated[generated.length - 1]?.content ?? "";
  } else {
    rawText = String(generated ?? "");
  }
  const jsonStr = extractJSON(rawText);
  let parsed: any = {};
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    const partial = jsonStr.replace(/,?\s*$/, "}");
    try { parsed = JSON.parse(partial); } catch { return buildTemplatePlan(classe, disciplina, tema, duracao, sumario); }
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
    objetivosEspecificos: parsed.objetivosEspecificos?.length ? parsed.objetivosEspecificos : tmpl.objetivosEspecificos,
    conteudos: parsed.conteudos?.length ? parsed.conteudos : tmpl.conteudos,
    metodosPrincipais: parsed.metodosPrincipais || tmpl.metodosPrincipais,
    metodos: parsed.metodos || tmpl.metodos,
    meios: parsed.meios || tmpl.meios,
    desenvolvimentoAula: parsed.desenvolvimentoAula?.length ? parsed.desenvolvimentoAula : tmpl.desenvolvimentoAula,
    perguntasControlo: parsed.perguntasControlo?.length ? parsed.perguntasControlo : tmpl.perguntasControlo,
    tarefaDeCasa: parsed.tarefaDeCasa?.length ? parsed.tarefaDeCasa : tmpl.tarefaDeCasa,
    tarefasPraticas: parsed.tarefaDeCasa?.length
      ? parsed.tarefaDeCasa.map((t: any) => t.descricao || t)
      : tmpl.tarefasPraticas,
    avaliacao: parsed.avaliacao || tmpl.avaliacao,
    diferenciacaoPedagogica: parsed.diferenciacaoPedagogica || tmpl.diferenciacaoPedagogica,
    observacoes: parsed.observacoes || tmpl.observacoes,
    score: typeof parsed.score === "number" ? parsed.score : tmpl.score,
    sugestoes: parsed.sugestoes?.length ? parsed.sugestoes : tmpl.sugestoes,
  };
}

function detectFaixaEtaria(classe: string): { faixa: string; nivel: string; classeNum: number } {
  const n = parseInt(classe.replace(/[^\d]/g, "")) || 0;
  if (n >= 1 && n <= 4) return { faixa: "6–10 anos", nivel: "Ensino Primário", classeNum: n };
  if (n >= 5 && n <= 6) return { faixa: "10–12 anos", nivel: "Ensino Primário avançado", classeNum: n };
  if (n >= 7 && n <= 9) return { faixa: "12–15 anos", nivel: "I Ciclo do Ensino Secundário", classeNum: n };
  if (n >= 10 && n <= 12) return { faixa: "15–18 anos", nivel: "II Ciclo do Ensino Secundário", classeNum: n };
  return { faixa: "+18 anos", nivel: "Ensino Superior", classeNum: n };
}

type TemaNatureza = "conceptual" | "procedimental" | "misto";

function detectTemaNatureza(tema: string): TemaNatureza {
  const t = tema.toLowerCase();
  const procedimentalKeywords = [
    "leitura", "interpretação", "interpretacao", "produção", "producao", "redacção", "redacao",
    "resolução", "resolucao", "cálculo", "calculo", "construção", "construcao",
    "análise", "analise", "aplicação", "aplicacao", "representação", "representacao",
    "resumo", "resumir", "elaboração", "elaboracao", "escrita", "composição", "composicao",
    "leitura e interpretação", "texto narrativo", "texto descritivo", "texto argumentativo",
  ];
  const conceptualKeywords = [
    "classe", "categorias", "conceito", "definição", "definicao", "estrutura",
    "tipos", "características", "caracteristicas", "propriedades", "regras",
    "adjetivos", "adjectivos", "verbo", "substantivo", "pronome", "advérbio",
    "adverbio", "pontuação", "pontuacao", "morfologia", "sintaxe", "gramática",
    "gramatica", "equação", "equacao", "teorema", "lei de", "princípio", "principio",
    "célula", "celula", "função", "funcao", "sistema", "processo", "ciclo",
  ];
  const isProcedimental = procedimentalKeywords.some((k) => t.includes(k));
  const isConceptual = conceptualKeywords.some((k) => t.includes(k));
  if (isProcedimental && isConceptual) return "misto";
  if (isProcedimental) return "procedimental";
  return "conceptual";
}

function gerarObjetivosConceptual(tema: string, disc: string, faixa: ReturnType<typeof detectFaixaEtaria>): { geral: string; especificos: string[] } {
  const { nivel, classeNum } = faixa;
  const isSuperior = classeNum === 0 || nivel === "Ensino Superior";

  const geral = `Identificar e caracterizar os conceitos fundamentais de ${tema} no domínio de ${disc}.`;

  if (classeNum <= 6) {
    return {
      geral,
      especificos: [
        `Reconhecer ${tema} em exemplos concretos do quotidiano, identificando correctamente pelo menos 4 dos 5 exemplos apresentados.`,
        `Distinguir ${tema} de outras categorias semelhantes, completando correctamente pelo menos 3 dos 5 exercícios de classificação da ficha.`,
        `Exemplificar ${tema} usando situações do seu bairro ou escola, produzindo pelo menos 2 exemplos originais correctos.`,
      ],
    };
  }
  if (classeNum <= 9) {
    return {
      geral,
      especificos: [
        `Definir ${tema} com as características essenciais, sem consulta, em pelo menos 3 linhas correctas.`,
        `Classificar exemplos de ${tema} a partir de uma ficha com 10 frases/casos, acertando pelo menos 7.`,
        `Distinguir ${tema} de categorias próximas, justificando a diferença com pelo menos 2 critérios correctos.`,
        `Produzir 3 exemplos originais de ${tema} contextualizados na realidade angolana, todos gramaticalmente correctos.`,
      ],
    };
  }
  if (classeNum <= 12) {
    return {
      geral: `Analisar e aplicar os conceitos de ${tema} em situações concretas no âmbito de ${disc}.`,
      especificos: [
        `Definir ${tema} com precisão terminológica, incluindo todos os critérios de classificação, sem consulta.`,
        `Classificar e caracterizar exemplos de ${tema} a partir de textos/situações propostas, acertando pelo menos 80% dos casos.`,
        `Comparar ${tema} com categorias relacionadas, identificando semelhanças e diferenças com base em pelo menos 3 critérios.`,
        `Analisar exemplos autênticos de ${tema} em textos/situações da realidade angolana, justificando a classificação.`,
      ],
    };
  }
  return {
    geral: `Analisar criticamente os fundamentos teóricos e aplicações práticas de ${tema} no contexto de ${disc}.`,
    especificos: [
      `Definir ${tema} com rigor terminológico e científico, citando pelo menos 2 autores de referência.`,
      `Analisar as diferentes perspectivas teóricas sobre ${tema}, comparando pelo menos 2 abordagens.`,
      `Aplicar os conceitos de ${tema} na resolução de pelo menos 3 casos práticos do contexto angolano.`,
      `Avaliar criticamente as implicações de ${tema} para a prática profissional em Angola.`,
    ],
  };
}

function gerarObjetivosProcedimental(tema: string, disc: string, faixa: ReturnType<typeof detectFaixaEtaria>): { geral: string; especificos: string[] } {
  const { nivel, classeNum } = faixa;
  const discLow = disc.toLowerCase();
  const isMat = discLow.includes("matem") || discLow.includes("física") || discLow.includes("fisica");
  const isLing = discLow.includes("português") || discLow.includes("portugues") || discLow.includes("língua") || discLow.includes("lingua");

  if (isMat) {
    return {
      geral: `Resolver problemas envolvendo ${tema}, aplicando os procedimentos matemáticos correctos.`,
      especificos: [
        `Identificar os dados e a operação adequada em pelo menos 4 dos 5 problemas propostos sobre ${tema}.`,
        `Resolver exercícios de ${tema} aplicando o algoritmo correcto, com pelo menos 70% de acertos na ficha.`,
        `Verificar os resultados obtidos em ${tema} por um método alternativo (estimativa ou substituição) em pelo menos 3 exercícios.`,
        `Resolver 2 problemas contextualizados sobre ${tema} usando dados da realidade angolana, apresentando todos os passos.`,
      ],
    };
  }
  if (isLing) {
    if (classeNum <= 6) {
      return {
        geral: `Realizar actividades de ${tema} com compreensão e expressão adequadas ao nível da ${faixa.classeNum}ª classe.`,
        especificos: [
          `Ler o texto proposto em voz alta com entoação correcta, fazendo pausas nos sinais de pontuação.`,
          `Identificar as ideias principais do texto, respondendo correctamente a pelo menos 3 das 5 perguntas de interpretação.`,
          `Produzir 3 frases correctas sobre o tema do texto, usando vocabulário novo aprendido na aula.`,
        ],
      };
    }
    if (classeNum <= 9) {
      return {
        geral: `Interpretar e analisar textos relacionados com ${tema}, desenvolvendo competências de compreensão crítica.`,
        especificos: [
          `Identificar a ideia central e as ideias secundárias de um texto sobre ${tema}, respondendo correctamente a pelo menos 4 das 6 questões de interpretação.`,
          `Inferir o significado de pelo menos 3 palavras desconhecidas a partir do contexto do texto, sem recurso ao dicionário.`,
          `Resumir o texto em não mais de 5 linhas, preservando as ideias principais e a coerência textual.`,
          `Produzir um parágrafo de 6 a 8 linhas sobre ${tema}, usando os recursos linguísticos estudados na aula.`,
        ],
      };
    }
    return {
      geral: `Analisar e produzir textos relacionados com ${tema}, aplicando competências de leitura crítica e escrita elaborada.`,
      especificos: [
        `Identificar os elementos estruturais e os recursos linguísticos de um texto sobre ${tema}, justificando as escolhas do autor.`,
        `Analisar criticamente o ponto de vista do autor sobre ${tema}, fundamentando a análise com citações do texto.`,
        `Comparar dois textos sobre ${tema} identificando pelo menos 3 semelhanças e 3 diferenças na abordagem.`,
        `Produzir um texto de 15 a 20 linhas sobre ${tema}, respeitando a estrutura e os recursos linguísticos estudados.`,
      ],
    };
  }

  return {
    geral: `Aplicar os procedimentos e competências de ${tema} em situações concretas no âmbito de ${disc}.`,
    especificos: [
      `Identificar os elementos essenciais de ${tema} a partir de casos práticos, acertando pelo menos 70% dos exemplos propostos.`,
      `Executar correctamente os procedimentos de ${tema}, completando pelo menos 3 das 4 tarefas práticas propostas.`,
      `Verificar e corrigir os resultados de ${tema} usando os critérios aprendidos, em pelo menos 2 casos.`,
      `Aplicar ${tema} na resolução de um problema contextualizado na realidade angolana, apresentando todo o processo.`,
    ],
  };
}

function gerarConteudos(tema: string, disc: string, faixa: ReturnType<typeof detectFaixaEtaria>, natureza: TemaNatureza): string[] {
  const discLow = disc.toLowerCase();
  const isMat = discLow.includes("matem") || discLow.includes("física") || discLow.includes("fisica") || discLow.includes("quím") || discLow.includes("quim");
  const isLing = discLow.includes("português") || discLow.includes("portugues") || discLow.includes("língua") || discLow.includes("lingua");
  const isHist = discLow.includes("histór") || discLow.includes("histor");
  const isBio = discLow.includes("biolog") || discLow.includes("ciênc") || discLow.includes("cienc");
  const { classeNum } = faixa;

  if (natureza === "procedimental" && isLing) {
    if (classeNum <= 6) return [
      `Texto sobre ${tema}: vocabulário e estrutura`,
      "Compreensão oral e escrita: perguntas de interpretação",
      "Vocabulário novo: palavras do texto",
      "Produção escrita guiada",
    ];
    if (classeNum <= 9) return [
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

  if (isMat) return [
    `Conceito e definição de ${tema}`,
    `Propriedades e regras de ${tema}`,
    `Algoritmo/procedimento de ${tema}`,
    "Problemas contextualizados no quotidiano angolano",
    "Verificação e correcção dos resultados",
  ];

  if (isHist) return [
    `Contexto histórico e cronológico de ${tema}`,
    `Causas e factores de ${tema}`,
    `Desenvolvimento e consequências de ${tema}`,
    `Personagens e fontes históricas relevantes`,
    `Impacto de ${tema} em Angola e em África`,
  ];

  if (isBio) return [
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

function gerarMetodos(disc: string, faixa: ReturnType<typeof detectFaixaEtaria>, natureza: TemaNatureza): { principais: string; detalhado: string; meios: string } {
  const { classeNum } = faixa;
  const discLow = disc.toLowerCase();
  const isMat = discLow.includes("matem") || discLow.includes("física") || discLow.includes("fisica");
  const isLing = discLow.includes("português") || discLow.includes("portugues");

  if (isMat) return {
    principais: "Demonstrativo + Resolução de Problemas + Trabalho Independente",
    detalhado: `MÉTODO DEMONSTRATIVO: resolução progressiva e comentada no quadro negro, do exemplo simples ao complexo. MÉTODO DE RESOLUÇÃO DE PROBLEMAS: situações contextualizadas do quotidiano angolano para modelação matemática. MÉTODO DE TRABALHO INDEPENDENTE: exercícios individuais com correcção colectiva no quadro. TÉCNICAS: resolução progressiva por níveis de dificuldade; correcção colectiva no quadro; trabalho em pares.`,
    meios: `Quadro negro e giz, manual escolar de ${disc}, ficha de exercícios com 2 níveis de dificuldade, caderno do aluno`,
  };

  if (isLing && natureza === "procedimental") return {
    principais: "Analítico-Sintético + Activo-Participativo + Produção Escrita",
    detalhado: `MÉTODO ANALÍTICO-SINTÉTICO: análise do texto por partes e síntese das ideias. MÉTODO ACTIVO-PARTICIPATIVO: leitura em voz alta, questionamento oral, produção escrita guiada. TÉCNICAS: leitura em cadeia; questionamento oral com progressão cognitiva (da recordação à aplicação); produção orientada; correcção colectiva no quadro.`,
    meios: `Texto impresso de autor angolano, ficha de interpretação, quadro negro e giz, caderno do aluno, manual escolar de ${disc}`,
  };

  if (classeNum <= 6) return {
    principais: "Expositivo Dialogado + Activo-Participativo + Demonstrativo",
    detalhado: `MÉTODO EXPOSITIVO DIALOGADO: explicação simples e dialogada, com recurso a exemplos concretos do quotidiano. MÉTODO ACTIVO-PARTICIPATIVO: actividades práticas e lúdicas para fixação. MÉTODO DEMONSTRATIVO: exemplificação clara no quadro. TÉCNICAS: questionamento oral simples; exercícios práticos; trabalho em pares.`,
    meios: `Quadro negro e giz, cartaz ilustrativo, fichas de exercícios, manual escolar, material manipulável`,
  };

  return {
    principais: "Expositivo Dialogado + Elaboração Conjunta + Trabalho Independente",
    detalhado: `MÉTODO EXPOSITIVO DIALOGADO: apresentação dos conceitos com participação activa dos alunos. MÉTODO DE ELABORAÇÃO CONJUNTA: construção do conhecimento em conjunto professor-alunos com exemplos progressivos. MÉTODO DE TRABALHO INDEPENDENTE: exercícios individuais para consolidação. TÉCNICAS: questionamento oral graduado; análise de exemplos; produção individual; correcção colectiva no quadro.`,
    meios: `Quadro negro e giz, manual escolar de ${disc}, fichas de exercícios, caderno do aluno`,
  };
}

function gerarDesenvolvimento(tema: string, disc: string, duracao: string, faixa: ReturnType<typeof detectFaixaEtaria>): DesenvolvimentoEtapaAI[] {
  const total = parseInt(duracao) || 45;
  let motivMin: number, devMin: number, consMin: number, sintMin: number;

  if (total <= 45) { motivMin = 5; devMin = 20; consMin = 15; sintMin = 5; }
  else if (total <= 60) { motivMin = 5; devMin = 25; consMin = 20; sintMin = 10; }
  else { motivMin = 10; devMin = 40; consMin = 30; sintMin = 10; }

  const { classeNum } = faixa;
  const discLow = disc.toLowerCase();
  const isLing = discLow.includes("português") || discLow.includes("lingua") || discLow.includes("língua");
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
    { etapa: "Motivação", duracao: `${motivMin} min`, actividadesProfessor: motivProf, actividadesAlunos: motivAlun },
    { etapa: "Desenvolvimento", duracao: `${devMin} min`, actividadesProfessor: devProf, actividadesAlunos: devAlun },
    { etapa: "Consolidação", duracao: `${consMin} min`, actividadesProfessor: consProf, actividadesAlunos: consAlun },
    {
      etapa: "Síntese e Avaliação",
      duracao: `${sintMin} min`,
      actividadesProfessor: `Faz a síntese oral dos conteúdos abordados sobre ${tema}; coloca as 3 perguntas de controlo; regista o sumário no quadro negro; indica e explica o TPC.`,
      actividadesAlunos: `Respondem às perguntas de controlo; completam o sumário no caderno; registam o TPC; colocam dúvidas finais.`,
    },
  ];
}

function gerarPerguntasControlo(tema: string, disc: string, faixa: ReturnType<typeof detectFaixaEtaria>, natureza: TemaNatureza): string[] {
  const { classeNum } = faixa;
  const discLow = disc.toLowerCase();
  const isLing = discLow.includes("português") || discLow.includes("lingua") || discLow.includes("língua");
  const isMat = discLow.includes("matem") || discLow.includes("física") || discLow.includes("fisica");

  if (isMat) return [
    `1ª (recordação): O que é ${tema}? Dá a definição com as tuas próprias palavras.`,
    `2ª (compreensão): Explica, passo a passo, como se resolve um exercício de ${tema}. Que erros devemos evitar?`,
    `3ª (aplicação): Cria um problema sobre ${tema} baseado numa situação real do teu bairro ou mercado em Angola. Resolve-o.`,
  ];

  if (isLing && natureza === "procedimental") {
    if (classeNum <= 6) return [
      `1ª (recordação): Quais são as personagens do texto que lemos? O que aconteceu na história?`,
      `2ª (compreensão): Explica com as tuas palavras o que significa a parte mais importante do texto.`,
      `3ª (aplicação): Se fosses um dos personagens do texto, o que farias de diferente? Porquê?`,
    ];
    return [
      `1ª (recordação): Qual é a ideia central do texto que analisámos? Resume-a numa frase.`,
      `2ª (compreensão): Explica com as tuas próprias palavras o significado da expressão mais importante do texto. Porque a escolheste?`,
      `3ª (aplicação): Como se relaciona o tema do texto com a realidade que vives em Angola? Dá um exemplo concreto do teu bairro ou escola.`,
    ];
  }

  if (classeNum <= 6) return [
    `1ª (recordação): O que é ${tema}? Dá um exemplo que viste hoje na aula.`,
    `2ª (compreensão): Explica com as tuas palavras a diferença entre ${tema} e algo parecido que já conhecias.`,
    `3ª (aplicação): Onde podes encontrar ${tema} na tua escola ou em casa? Dá um exemplo real.`,
  ];

  return [
    `1ª (recordação): Define ${tema} com as características essenciais aprendidas hoje.`,
    `2ª (compreensão): Explica com as tuas próprias palavras por que razão ${tema} é importante em ${disc}. Usa um exemplo concreto.`,
    `3ª (aplicação): Analisa esta situação do contexto angolano: [situação relacionada com ${tema}]. Como aplicarias o que aprendeste hoje para a resolver ou explicar?`,
  ];
}

function gerarTPC(tema: string, disc: string, faixa: ReturnType<typeof detectFaixaEtaria>): TarefaDeCasaAI[] {
  const { classeNum } = faixa;
  const discLow = disc.toLowerCase();
  const isMat = discLow.includes("matem") || discLow.includes("física") || discLow.includes("fisica");
  const isLing = discLow.includes("português") || discLow.includes("lingua") || discLow.includes("língua");

  if (isMat) return [
    {
      descricao: `Resolve os exercícios de ${tema} do manual, apresentando todos os passos e verificando os resultados`,
      referencia: `Manual de ${disc}, pág. ____, exercícios n.º ____ a ____`,
      tempoEstimado: "20 min",
    },
    {
      descricao: `Cria 2 problemas originais sobre ${tema} baseados em situações reais que conheces em Angola (mercado, escola, família). Resolve-os e traz para a próxima aula`,
      referencia: "Caderno do aluno",
      tempoEstimado: "15 min",
    },
  ];

  if (isLing) {
    if (classeNum <= 6) return [
      {
        descricao: `Lê o texto da aula para um familiar em casa. Pede-lhe que te faça 2 perguntas sobre o texto e responde-as por escrito`,
        referencia: `Manual de ${disc}, pág. ____`,
        tempoEstimado: "15 min",
      },
      {
        descricao: "Escreve 3 frases sobre o que fizeste hoje, usando pelo menos 3 palavras novas que aprendeste na aula",
        referencia: "Caderno do aluno",
        tempoEstimado: "10 min",
      },
    ];
    return [
      {
        descricao: `Completa os exercícios de ${tema} do manual`,
        referencia: `Manual de ${disc}, pág. ____, exercícios n.º ____`,
        tempoEstimado: "20 min",
      },
      {
        descricao: `Escreve um texto de 10 a 15 linhas sobre ${tema}, usando um exemplo da realidade angolana que conheces bem (bairro, escola, mercado, família)`,
        referencia: "Caderno do aluno",
        tempoEstimado: "20 min",
      },
    ];
  }

  return [
    {
      descricao: `Estuda os conteúdos de ${tema} e responde às perguntas do manual`,
      referencia: `Manual de ${disc}, pág. ____, exercícios n.º ____`,
      tempoEstimado: "15 min",
    },
    {
      descricao: `Pesquisa um exemplo real de ${tema} na tua comunidade ou cidade. Descreve-o em 5 linhas e explica a relação com o que aprendeste`,
      referencia: "Caderno do aluno",
      tempoEstimado: "15 min",
    },
  ];
}

function gerarDiferenciacaoPedagogica(tema: string, disc: string, faixa: ReturnType<typeof detectFaixaEtaria>): { dificuldades: string; avancados: string } {
  const { classeNum } = faixa;
  const discLow = disc.toLowerCase();
  const isMat = discLow.includes("matem") || discLow.includes("física") || discLow.includes("fisica");

  const dificuldades = isMat
    ? `Para alunos com dificuldades: fornecer ficha de nível 1 com exercícios simplificados de ${tema}; usar material manipulável (pedras, palitos) para tornar o conceito concreto; trabalho em pares com colega de apoio; reduzir o número de exercícios na consolidação.`
    : `Para alunos com dificuldades: fornecer ficha simplificada sobre ${tema} com vocabulário acessível; permitir consulta do manual durante os exercícios; reduzir a extensão da produção escrita; trabalhar em par com um colega mais avançado.`;

  const avancados = isMat
    ? `Para alunos avançados: propor exercícios de nível 2 com maior grau de complexidade sobre ${tema}; desafiar a criar 2 problemas originais com dados do quotidiano angolano; pedir explicação do raciocínio ao resto da turma.`
    : `Para alunos avançados: propor análise adicional mais aprofundada sobre ${tema}; solicitar produção escrita mais extensa com argumentação elaborada; desafiar a pesquisar e apresentar um exemplo adicional não abordado na aula.`;

  return { dificuldades, avancados };
}

function gerarAvaliacao(disc: string, natureza: TemaNatureza): string {
  const discLow = disc.toLowerCase();
  const isMat = discLow.includes("matem") || discLow.includes("física") || discLow.includes("fisica");

  if (isMat) return `Avaliação formativa: observação da resolução dos exercícios (50%) + correcção da ficha (30%) + participação oral nas perguntas de controlo (20%). Total = 100%. O professor circula durante os exercícios para feedback imediato e regista as dificuldades observadas.`;

  if (natureza === "procedimental") return `Avaliação formativa: qualidade da leitura/produção (40%) + correcção da ficha de interpretação/exercícios (40%) + participação oral nas perguntas de controlo (20%). Total = 100%.`;

  return `Avaliação formativa: correcção dos exercícios da ficha (50%) + participação oral (30%) + qualidade das respostas às perguntas de controlo (20%). Total = 100%. O professor regista observações sobre os alunos com dificuldades para planificação de apoio.`;
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
      ? gerarObjetivosProcedimental(tema, disciplina, faixa)
      : gerarObjetivosConceptual(tema, disciplina, faixa);

  const conteudos = gerarConteudos(tema, disciplina, faixa, natureza);
  const { principais, detalhado, meios } = gerarMetodos(disciplina, faixa, natureza);
  const desenvolvimento = gerarDesenvolvimento(tema, disciplina, duracao, faixa);
  const perguntasControlo = gerarPerguntasControlo(tema, disciplina, faixa, natureza);
  const tpc = gerarTPC(tema, disciplina, faixa);
  const diferenciacao = gerarDiferenciacaoPedagogica(tema, disciplina, faixa);
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
      return await generateWithQwen(classe, disciplina, tema, duracao, onStatus, sumario);
    } catch (err: any) {
      onStatus({ stage: "error", error: err.message });
      throw err;
    }
  } else {
    onStatus({ stage: "generating", message: "A gerar plano pedagógico..." });
    await new Promise((r) => setTimeout(r, 500));
    const result = buildTemplatePlan(classe, disciplina, tema, duracao, sumario);
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
