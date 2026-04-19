import { Platform } from "react-native";

export type GenerationStatus = {
  stage: "idle" | "downloading" | "loading" | "generating" | "done" | "error";
  progress?: number;
  message?: string;
  error?: string;
};

export type LessonPlanAIResult = {
  sumario: string;
  objetivoGeral: string;
  objetivosEspecificos: string[];
  metodos: string;
  meios: string;
  atividades: { descricao: string; tempo: string }[];
  perguntasControlo: string[];
  perguntasTarefa: string[];
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
  return `Gera um plano de aula completo e detalhado em portugues com os seguintes dados:
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

O score pedagogico deve ser entre 0-100. As sugestoes devem ser 3 melhorias para o plano.`;
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
        "Você é um especialista em pedagogia e planificação de aulas. Responda sempre em português e apenas com JSON válido, sem formatação markdown.",
    },
    {
      role: "user",
      content: buildPrompt(classe, disciplina, tema, duracao),
    },
  ];

  const result = await pipelineInstance(messages, {
    max_new_tokens: 1024,
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
      return generateTemplatePlan(classe, disciplina, tema, duracao);
    }
  }

  return {
    sumario: parsed.sumario || `Aula sobre ${tema} para ${classe} de ${disciplina}`,
    objetivoGeral: parsed.objetivoGeral || `Compreender os conceitos fundamentais de ${tema}`,
    objetivosEspecificos: parsed.objetivosEspecificos?.length
      ? parsed.objetivosEspecificos
      : [`Identificar os principais conceitos de ${tema}`, `Aplicar os conhecimentos adquiridos`],
    metodos: parsed.metodos || "Método expositivo, elaboração conjunta e trabalho independente",
    meios: parsed.meios || "Quadro, giz, livro didático e materiais de apoio",
    atividades: parsed.atividades?.length
      ? parsed.atividades
      : buildActivities(duracao),
    perguntasControlo: parsed.perguntasControlo?.length
      ? parsed.perguntasControlo
      : [`O que entendeu sobre ${tema}?`, `Como se aplica ${tema} na prática?`],
    perguntasTarefa: parsed.perguntasTarefa?.length
      ? parsed.perguntasTarefa
      : [`Resolva os exercícios sobre ${tema} da página 45`, `Pesquise mais sobre ${tema}`],
    score: typeof parsed.score === "number" ? parsed.score : 78,
    sugestoes: parsed.sugestoes?.length
      ? parsed.sugestoes
      : [
          "Adicionar atividades práticas para maior engajamento",
          "Incluir exemplos do quotidiano dos alunos",
          "Diversificar os métodos de avaliação",
        ],
  };
}

function buildActivities(duracao: string): { descricao: string; tempo: string }[] {
  const total = parseInt(duracao) || 45;
  const intro = Math.round(total * 0.15);
  const dev = Math.round(total * 0.55);
  const practice = Math.round(total * 0.20);
  const conclusion = total - intro - dev - practice;
  return [
    { descricao: "Introdução e motivação dos alunos", tempo: `${intro} min` },
    { descricao: "Exposição e desenvolvimento do conteúdo", tempo: `${dev} min` },
    { descricao: "Exercícios práticos e consolidação", tempo: `${practice} min` },
    { descricao: "Síntese e perguntas de controlo", tempo: `${conclusion} min` },
  ];
}

export function generateTemplatePlan(
  classe: string,
  disciplina: string,
  tema: string,
  duracao: string,
): LessonPlanAIResult {
  const total = parseInt(duracao) || 45;
  const disc = disciplina.trim() || "disciplina";
  const temaLower = tema.trim().toLowerCase();

  const objetivosMap: Record<string, string[]> = {
    matematica: [
      `Identificar e aplicar os conceitos de ${tema}`,
      `Resolver problemas utilizando ${tema}`,
      `Desenvolver o raciocínio lógico-matemático relacionado com ${tema}`,
    ],
    fisica: [
      `Compreender os fenómenos físicos relacionados com ${tema}`,
      `Aplicar leis e fórmulas de ${tema} na resolução de problemas`,
      `Relacionar ${tema} com situações do quotidiano`,
    ],
    quimica: [
      `Descrever os processos químicos de ${tema}`,
      `Identificar as substâncias e reações envolvidas em ${tema}`,
      `Aplicar ${tema} em contextos práticos e laboratoriais`,
    ],
    biologia: [
      `Identificar e caracterizar os elementos de ${tema}`,
      `Explicar os processos biológicos relacionados com ${tema}`,
      `Relacionar ${tema} com a saúde e o meio ambiente`,
    ],
    historia: [
      `Contextualizar os eventos históricos de ${tema}`,
      `Analisar as causas e consequências de ${tema}`,
      `Relacionar ${tema} com o presente e tirar lições`,
    ],
    geografa: [
      `Localizar e descrever os aspectos geográficos de ${tema}`,
      `Analisar a influência de ${tema} na sociedade e no ambiente`,
      `Interpretar mapas e dados relacionados com ${tema}`,
    ],
  };

  const discKey = Object.keys(objetivosMap).find((k) =>
    disc.toLowerCase().includes(k),
  );

  const objetivosEspecificos = discKey
    ? objetivosMap[discKey]
    : [
        `Identificar os conceitos fundamentais de ${tema}`,
        `Compreender a importância e aplicação de ${tema}`,
        `Desenvolver competências práticas relacionadas com ${tema}`,
      ];

  const intro = Math.round(total * 0.12);
  const revisao = Math.round(total * 0.13);
  const exposicao = Math.round(total * 0.35);
  const praticoF = Math.round(total * 0.25);
  const sintese = total - intro - revisao - exposicao - praticoF;

  return {
    sumario: `Aula sobre ${tema} — ${disc}, ${classe}. Duração: ${duracao} minutos.`,
    objetivoGeral: `Que os alunos compreendam e apliquem os conceitos fundamentais de ${tema} no contexto de ${disc}.`,
    objetivosEspecificos,
    metodos: "Método expositivo, elaboração conjunta e trabalho independente",
    meios: "Quadro negro, giz, livro didático e fichas de exercícios",
    atividades: [
      { descricao: "Saudação e motivação — ligação ao conteúdo anterior", tempo: `${intro} min` },
      { descricao: `Revisão dos conhecimentos prévios sobre ${temaLower}`, tempo: `${revisao} min` },
      { descricao: `Exposição e desenvolvimento: conceitos de ${temaLower}`, tempo: `${exposicao} min` },
      { descricao: "Exercícios práticos e elaboração conjunta", tempo: `${praticoF} min` },
      { descricao: "Síntese, perguntas de controlo e encerramento", tempo: `${sintese} min` },
    ],
    perguntasControlo: [
      `O que é ${tema} e qual a sua importância em ${disc}?`,
      `Quais são as principais características de ${tema}?`,
      `Como se aplica ${tema} no quotidiano?`,
    ],
    perguntasTarefa: [
      `Resolva os exercícios propostos sobre ${tema} no livro`,
      `Elabore um resumo sobre o que aprendeu de ${tema} hoje`,
    ],
    score: 72,
    sugestoes: [
      "Incluir exemplos práticos do quotidiano dos alunos para maior contextualização",
      "Adicionar atividades em grupo para promover o trabalho cooperativo",
      "Diversificar os recursos didáticos com vídeos ou imagens ilustrativas",
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
    const result = generateTemplatePlan(classe, disciplina, tema, duracao);
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
