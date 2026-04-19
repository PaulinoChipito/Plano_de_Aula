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

export type LessonPlanAIResult = {
  sumario: string;
  objetivoGeral: string;
  objetivosEspecificos: string[];
  conteudos: string[];
  metodosPrincipais: string;
  metodos: string;
  meios: string;
  desenvolvimentoAula: DesenvolvimentoEtapaAI[];
  perguntasControlo: string[];
  tarefasPraticas: string[];
  avaliacao: string;
  observacoes: string;
  score: number;
  sugestoes: string[];
};

const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";

let pipelineInstance: any = null;
let pipelineLoading = false;
let pipelineLoadCallbacks: Array<(err?: Error) => void> = [];

function buildPrompt(
  classe: string,
  disciplina: string,
  tema: string,
  duracao: string,
): string {
  return `Gera um plano de aula completo para professor angolano com estes dados:
- Classe: ${classe}
- Disciplina: ${disciplina}
- Tema (Sumário): ${tema}
- Duração: ${duracao} minutos

Responde APENAS com JSON válido (sem markdown) seguindo exactamente esta estrutura:
{
  "sumario": "título curto e descritivo da aula",
  "objetivoGeral": "objectivo geral da aula usando verbos como: compreender, desenvolver, analisar",
  "objetivosEspecificos": ["O aluno será capaz de [verbo] [conteúdo] [condição]", "...3 a 4 objectivos específicos observáveis"],
  "conteudos": ["conceito ou tópico 1", "conceito ou tópico 2", "3 a 5 conteúdos"],
  "metodosPrincipais": "Método A + Método B + Método C",
  "metodos": "MÉTODO [NOME]: descrição breve. MÉTODO [NOME]: descrição. TÉCNICAS: técnicas usadas.",
  "meios": "lista dos recursos: quadro, giz, fichas, manual, ...",
  "desenvolvimentoAula": [
    {"etapa": "Motivação", "duracao": "X min", "actividadesProfessor": "o que o professor faz", "actividadesAlunos": "o que os alunos fazem"},
    {"etapa": "Desenvolvimento", "duracao": "X min", "actividadesProfessor": "...", "actividadesAlunos": "..."},
    {"etapa": "Consolidação", "duracao": "X min", "actividadesProfessor": "...", "actividadesAlunos": "..."},
    {"etapa": "Síntese e Avaliação", "duracao": "X min", "actividadesProfessor": "...", "actividadesAlunos": "..."}
  ],
  "perguntasControlo": ["pergunta aberta de verificação da compreensão 1", "pergunta 2", "pergunta 3"],
  "tarefasPraticas": ["tarefa prática que o aluno executa/produz 1", "tarefa 2"],
  "avaliacao": "descrição da avaliação formativa com critérios percentuais",
  "observacoes": "notas pedagógicas para o professor",
  "score": 82,
  "sugestoes": ["sugestão de melhoria 1", "sugestão 2", "sugestão 3"]
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
    onStatus({ stage: "downloading", progress: 0, message: "A iniciar descarga do modelo Qwen2.5..." });

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
): Promise<LessonPlanAIResult> {
  await loadPipeline(onStatus);

  onStatus({ stage: "generating", message: "A gerar plano de aula com IA local..." });

  const messages = [
    {
      role: "system",
      content:
        "És um especialista em pedagogia e planificação de aulas em Angola. Respondes sempre em português e apenas com JSON válido, sem formatação markdown. Segues o guia metodológico angolano do Ministério da Educação.",
    },
    {
      role: "user",
      content: buildPrompt(classe, disciplina, tema, duracao),
    },
  ];

  const result = await pipelineInstance(messages, {
    max_new_tokens: 1500,
    temperature: 0.7,
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
    try {
      parsed = JSON.parse(partial);
    } catch {
      return buildTemplatePlan(classe, disciplina, tema, duracao);
    }
  }

  return mergeWithDefaults(parsed, classe, disciplina, tema, duracao);
}

function mergeWithDefaults(
  parsed: any,
  classe: string,
  disciplina: string,
  tema: string,
  duracao: string,
): LessonPlanAIResult {
  const template = buildTemplatePlan(classe, disciplina, tema, duracao);
  return {
    sumario: parsed.sumario || template.sumario,
    objetivoGeral: parsed.objetivoGeral || template.objetivoGeral,
    objetivosEspecificos: parsed.objetivosEspecificos?.length
      ? parsed.objetivosEspecificos
      : template.objetivosEspecificos,
    conteudos: parsed.conteudos?.length ? parsed.conteudos : template.conteudos,
    metodosPrincipais: parsed.metodosPrincipais || template.metodosPrincipais,
    metodos: parsed.metodos || template.metodos,
    meios: parsed.meios || template.meios,
    desenvolvimentoAula: parsed.desenvolvimentoAula?.length
      ? parsed.desenvolvimentoAula
      : template.desenvolvimentoAula,
    perguntasControlo: parsed.perguntasControlo?.length
      ? parsed.perguntasControlo
      : template.perguntasControlo,
    tarefasPraticas: parsed.tarefasPraticas?.length
      ? parsed.tarefasPraticas
      : template.tarefasPraticas,
    avaliacao: parsed.avaliacao || template.avaliacao,
    observacoes: parsed.observacoes || template.observacoes,
    score: typeof parsed.score === "number" ? parsed.score : template.score,
    sugestoes: parsed.sugestoes?.length ? parsed.sugestoes : template.sugestoes,
  };
}

export function buildTemplatePlan(
  classe: string,
  disciplina: string,
  tema: string,
  duracao: string,
): LessonPlanAIResult {
  const total = parseInt(duracao) || 45;
  const disc = disciplina.trim() || "Disciplina";
  const temaStr = tema.trim();

  const motivMin = Math.max(5, Math.round(total * 0.11));
  const devMin = Math.round(total * 0.44);
  const consMin = Math.round(total * 0.33);
  const sintMin = Math.max(3, total - motivMin - devMin - consMin);

  const objetivosMap: Record<string, string[]> = {
    matematica: [
      `O aluno será capaz de identificar e enunciar os conceitos fundamentais de ${temaStr} com exactidão.`,
      `O aluno será capaz de aplicar os algoritmos de ${temaStr} na resolução de pelo menos 5 exercícios sem erros.`,
      `O aluno será capaz de resolver problemas contextualizados relacionados com ${temaStr}, apresentando o raciocínio completo.`,
      `O aluno será capaz de verificar os próprios resultados usando estimativa e substituição.`,
    ],
    fisica: [
      `O aluno será capaz de enunciar as leis e princípios de ${temaStr} com linguagem científica correcta.`,
      `O aluno será capaz de aplicar as fórmulas de ${temaStr} na resolução de problemas quantitativos.`,
      `O aluno será capaz de relacionar ${temaStr} com fenómenos observáveis no quotidiano angolano.`,
    ],
    quimica: [
      `O aluno será capaz de descrever os processos e reacções químicas de ${temaStr}.`,
      `O aluno será capaz de identificar as substâncias e equações envolvidas em ${temaStr}.`,
      `O aluno será capaz de aplicar os conceitos de ${temaStr} em situações práticas e experimentais.`,
    ],
    biologia: [
      `O aluno será capaz de identificar e caracterizar os elementos biológicos de ${temaStr} sem consulta.`,
      `O aluno será capaz de explicar os processos e mecanismos de ${temaStr} com rigor científico.`,
      `O aluno será capaz de relacionar ${temaStr} com a saúde pública e o meio ambiente angolano.`,
    ],
    historia: [
      `O aluno será capaz de situar cronologicamente os eventos de ${temaStr} com precisão.`,
      `O aluno será capaz de analisar as causas e consequências de ${temaStr} com argumentação histórica.`,
      `O aluno será capaz de relacionar ${temaStr} com o contexto histórico e social angolano.`,
    ],
    portugues: [
      `O aluno será capaz de identificar e caracterizar os elementos fundamentais de ${temaStr} a partir de um texto dado.`,
      `O aluno será capaz de produzir um texto respeitando as regras de ${temaStr} com pelo menos 70% de correcção.`,
      `O aluno será capaz de analisar exemplos de ${temaStr} em textos da literatura angolana.`,
    ],
    geografa: [
      `O aluno será capaz de localizar e descrever os aspectos geográficos de ${temaStr} com rigor.`,
      `O aluno será capaz de interpretar mapas, gráficos e dados relacionados com ${temaStr}.`,
      `O aluno será capaz de relacionar ${temaStr} com o desenvolvimento social e económico de Angola.`,
    ],
  };

  const discKey = Object.keys(objetivosMap).find((k) =>
    disc.toLowerCase().includes(k),
  );

  const objetivosEspecificos = discKey
    ? objetivosMap[discKey]
    : [
        `O aluno será capaz de identificar e enunciar os conceitos fundamentais de ${temaStr} com precisão.`,
        `O aluno será capaz de explicar a importância e as aplicações de ${temaStr} no contexto angolano.`,
        `O aluno será capaz de aplicar os conhecimentos de ${temaStr} na resolução de pelo menos 3 exercícios práticos.`,
        `O aluno será capaz de relacionar ${temaStr} com outros conteúdos da disciplina e com a realidade do seu bairro.`,
      ];

  const conteudosMap: Record<string, string[]> = {
    matematica: [`Conceito de ${temaStr}`, `Propriedades e regras de ${temaStr}`, `Algoritmo de resolução`, `Problemas contextualizados no quotidiano`],
    fisica: [`Definição e grandezas de ${temaStr}`, `Leis e princípios de ${temaStr}`, `Fórmulas e unidades SI`, `Aplicações práticas`],
    historia: [`Contexto histórico de ${temaStr}`, `Causas de ${temaStr}`, `Desenvolvimento e consequências`, `Impacto no contexto angolano`],
    portugues: [`Conceito e características de ${temaStr}`, `Estrutura e elementos de ${temaStr}`, `Análise de exemplos textuais`, `Produção escrita`],
  };

  const discConteudoKey = Object.keys(conteudosMap).find((k) =>
    disc.toLowerCase().includes(k),
  );

  const conteudos = discConteudoKey
    ? conteudosMap[discConteudoKey]
    : [
        `Conceito e definição de ${temaStr}`,
        `Características e propriedades de ${temaStr}`,
        `Exemplos e aplicações no quotidiano angolano`,
        `Exercícios de consolidação`,
      ];

  const metodosStr = `MÉTODO EXPOSITIVO DIALOGADO: apresentação e explicação dos conceitos de ${temaStr} com participação activa dos alunos. MÉTODO ACTIVO-PARTICIPATIVO: exercícios práticos e resolução de problemas pelos alunos. MÉTODO DEMONSTRATIVO: resolução de exemplos passo a passo pelo professor. TÉCNICAS: questionamento oral graduado, exercícios individuais e em pares, correcção colectiva no quadro.`;

  const meiosStr = `Quadro negro e giz, manual escolar de ${disc}, fichas de exercícios, caderno do aluno`;

  const desenvolvimentoAula: DesenvolvimentoEtapaAI[] = [
    {
      etapa: "Motivação",
      duracao: `${motivMin} min`,
      actividadesProfessor: `Apresenta uma situação-problema ou questão motivadora relacionada com ${temaStr}; regista as respostas dos alunos no quadro; estabelece a ligação com o conteúdo anterior.`,
      actividadesAlunos: `Respondem oralmente; partilham conhecimentos prévios; levantam hipóteses sobre o tema.`,
    },
    {
      etapa: "Desenvolvimento",
      duracao: `${devMin} min`,
      actividadesProfessor: `Expõe os conceitos fundamentais de ${temaStr} com exemplos progressivos; resolve exemplos demonstrativos no quadro explicando cada etapa; formula perguntas de verificação da compreensão.`,
      actividadesAlunos: `Tomam notas; acompanham a explicação; respondem às perguntas orais; colocam dúvidas; copiam os exemplos resolvidos.`,
    },
    {
      etapa: "Consolidação",
      duracao: `${consMin} min`,
      actividadesProfessor: `Distribui ficha de exercícios; circula pela sala e apoia os alunos com dificuldades; orienta a correcção colectiva no quadro.`,
      actividadesAlunos: `Resolvem os exercícios individualmente ou em pares; comparam resultados; um aluno vai ao quadro corrigir; registam as correcções.`,
    },
    {
      etapa: "Síntese e Avaliação",
      duracao: `${sintMin} min`,
      actividadesProfessor: `Faz a síntese dos conteúdos abordados; formula as perguntas de controlo; regista o sumário no quadro; indica o TPC.`,
      actividadesAlunos: `Respondem às perguntas de controlo; registam o sumário e o TPC no caderno.`,
    },
  ];

  const perguntasControlo = [
    `O que é ${temaStr} e qual a sua importância em ${disc}?`,
    `Quais são as principais características ou regras de ${temaStr}? Explica com as tuas próprias palavras.`,
    `Dá um exemplo de aplicação de ${temaStr} numa situação do teu quotidiano em Angola.`,
  ];

  const tarefasPraticas = [
    `Resolve 3 exercícios sobre ${temaStr} do manual, apresentando todos os passos e verificando os resultados.`,
    `Cria um problema original sobre ${temaStr} baseado numa situação real do teu bairro ou escola. Troca com o colega do lado para ele resolver.`,
  ];

  const avaliacao = `Avaliação formativa contínua: observação da participação oral (20%), correcção dos exercícios da ficha (50%), resolução do problema contextualizado (30%). O professor circula durante os exercícios para feedback imediato.`;

  const observacoes = `O professor deve adequar os exemplos ao nível e ao contexto cultural da turma. Para alunos com dificuldades, usar material manipulável e simplificar os exercícios. Valorizar a participação oral mesmo que incompleta.`;

  return {
    sumario: `${temaStr} — ${disc}, ${classe}`,
    objetivoGeral: `Que os alunos compreendam e apliquem os conceitos fundamentais de ${temaStr} no contexto de ${disc}, desenvolvendo competências de raciocínio e resolução de problemas.`,
    objetivosEspecificos,
    conteudos,
    metodosPrincipais: "Expositivo Dialogado + Activo-Participativo + Demonstrativo",
    metodos: metodosStr,
    meios: meiosStr,
    desenvolvimentoAula,
    perguntasControlo,
    tarefasPraticas,
    avaliacao,
    observacoes,
    score: 72,
    sugestoes: [
      "Incluir exemplos práticos contextualizados na realidade angolana para maior significância",
      "Adicionar actividades em grupo cooperativo para desenvolver competências sociais",
      "Diversificar os meios de ensino com recursos visuais (cartazes, diagramas, mapas conceptuais)",
    ],
  };
}

export async function generateLessonPlanOffline(
  classe: string,
  disciplina: string,
  tema: string,
  duracao: string,
  onStatus: (s: GenerationStatus) => void,
): Promise<LessonPlanAIResult> {
  if (Platform.OS === "web") {
    try {
      return await generateWithQwen(classe, disciplina, tema, duracao, onStatus);
    } catch (err: any) {
      onStatus({ stage: "error", error: err.message });
      throw err;
    }
  } else {
    onStatus({ stage: "generating", message: "A gerar plano..." });
    await new Promise((r) => setTimeout(r, 400));
    const result = buildTemplatePlan(classe, disciplina, tema, duracao);
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
