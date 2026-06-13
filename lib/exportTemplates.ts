import {
  ClassGroup,
  Student,
  StudentGrade,
  AttendanceRecord,
  TeacherProfile,
  GradeEntry,
  ExportHeader,
} from "@/lib/storage";
import { ExcelSheetSpec } from "@/lib/exports";
import { Language, translations } from "@/lib/i18n";

const SYSTEM_FOOTER = "Processado pelo Sistema EcoEducacional · Gestão Pedagógica";

const NOW = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
};

const anoLectivo = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  return d.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
};

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function macAvg(mac: GradeEntry[]): number | null {
  return avg(mac.map((m) => m.nota));
}

function fmt(n: number | null): string {
  if (n === null || n === undefined || isNaN(n as number)) return "";
  return (Math.round(n * 10) / 10).toString().replace(".", ",");
}

function fmtPct(n: number): string {
  return `${(Math.round(n * 10) / 10).toString().replace(".", ",")}`;
}

function getNegativeThreshold(turma: ClassGroup, profile: TeacherProfile): number {
  const nivel = (turma.nivelEnsino || profile.nivelEnsino || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return nivel.includes("primario") ? 5 : 10;
}

function isNegativeGrade(n: number | null, threshold: number): boolean {
  return n !== null && n !== undefined && !isNaN(n as number) && n < threshold;
}

function isPositiveGrade(n: number | null, threshold: number): boolean {
  return n !== null && n !== undefined && !isNaN(n as number) && n >= threshold;
}

function gradeTd(n: number | null, threshold: number, bold = false): string {
  const isNeg = isNegativeGrade(n, threshold);
  const isPos = isPositiveGrade(n, threshold);
  const style = isNeg
    ? ' style="color:#b91c1c;font-weight:700;"'
    : isPos
      ? ` style="color:#0000CD;${bold ? "font-weight:700;" : ""}"`
      : "";
  const value = bold && !isNeg && !isPos ? `<b>${fmt(n)}</b>` : fmt(n);
  return `<td${style}>${value}</td>`;
}

function gradeCellStyle(r: number, c: number, color: "negative" | "positive") {
  const isNegative = color === "negative";
  return {
    r,
    c,
    fontColor: isNegative ? "B91C1C" : "0000CD",
    bold: isNegative,
    numFmt: isNegative ? "[Red]0.0" : "[Blue]0.0",
  };
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}

const baseStylePortrait = `
  <style>
    @page {
      size: A4 portrait;
      margin: 1cm 2cm 2cm 2.5cm;
      @bottom-right {
        content: counter(page) " de " counter(pages);
        color: #555;
        font-size: 8pt;
      }
    }
    * { box-sizing: border-box; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #111; margin: 0; padding: 0; font-size: 10pt; }
    .doc-header { text-align: center; margin-bottom: 8px; }
    .doc-header img { max-height: 65px; max-width: 220px; display: block; margin: 0 auto 5px; object-fit: contain; }
    .doc-header .header-line { font-size: 10.5pt; font-weight: 600; text-align: center; margin: 1px 0; }
    .doc-header .school { font-size: 13pt; font-weight: 700; letter-spacing: .3px; }
    .doc-header .doc { font-size: 11pt; font-weight: 600; margin-top: 4px; text-transform: uppercase; }
    .meta { display: flex; justify-content: space-between; margin: 6px 0 8px; font-size: 9.5pt; }
    .meta .left, .meta .right { white-space: nowrap; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #333; padding: 4px 5px; text-align: center; vertical-align: middle; }
    thead th { background: #e8e8e8; font-weight: 700; font-size: 9pt; }
    .name-col { text-align: left; padding-left: 6px; }
    .num-col { width: 28px; }
    .small { font-size: 8.5pt; }
    .footer { display: flex; justify-content: space-between; margin-top: 16px; font-size: 9pt; }
    .footer .prof { font-style: italic; }
    .system { text-align: center; margin-top: 24px; font-size: 8pt; color: #555; border-top: 1px solid #ccc; padding-top: 4px; }
    .stats-table { margin-top: 12px; }
    .stats-table th { background: #d8d8d8; }
    .stats-title { font-weight: 700; font-size: 10pt; margin: 12px 0 4px; }
  </style>
`;

const baseStyleLandscape = `
  <style>
    @page {
      size: A4 landscape;
      margin: 1cm 2cm 2cm 2.5cm;
      @bottom-right {
        content: counter(page) " de " counter(pages);
        color: #555;
        font-size: 8pt;
      }
    }
    * { box-sizing: border-box; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #111; margin: 0; padding: 0; font-size: 9.5pt; }
    .doc-header { text-align: center; margin-bottom: 8px; }
    .doc-header img { max-height: 65px; max-width: 220px; display: block; margin: 0 auto 5px; object-fit: contain; }
    .doc-header .header-line { font-size: 10pt; font-weight: 600; text-align: center; margin: 1px 0; }
    .doc-header .school { font-size: 13pt; font-weight: 700; letter-spacing: .3px; }
    .doc-header .doc { font-size: 11pt; font-weight: 600; margin-top: 4px; text-transform: uppercase; }
    .meta { display: flex; justify-content: space-between; margin: 6px 0 8px; font-size: 9.5pt; }
    .meta .left, .meta .right { white-space: nowrap; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #333; padding: 3px 4px; text-align: center; vertical-align: middle; }
    thead th { background: #e8e8e8; font-weight: 700; font-size: 9pt; }
    .name-col { text-align: left; padding-left: 6px; }
    .num-col { width: 28px; }
    .small { font-size: 8.5pt; }
    .footer { display: flex; justify-content: space-between; margin-top: 16px; font-size: 9pt; }
    .footer .prof { font-style: italic; }
    .system { text-align: center; margin-top: 24px; font-size: 8pt; color: #555; border-top: 1px solid #ccc; padding-top: 4px; }
    .stats-table { margin-top: 12px; }
    .stats-table th { background: #d8d8d8; }
    .stats-title { font-weight: 700; font-size: 10pt; margin: 12px 0 4px; }
  </style>
`;

function htmlDoc(title: string, body: string, landscape = false): string {
  const style = landscape ? baseStyleLandscape : baseStylePortrait;
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>${title}</title>${style}</head><body>${body}</body></html>`;
}

function renderDocHeader(
  header: ExportHeader | null,
  escola: string,
  docTitle: string,
): string {
  if (!header || (!header.logoBase64 && header.linhas.length === 0)) {
    return `
      <div class="doc-header">
        <div class="school">${escape(escola.toUpperCase())}</div>
        <div class="doc">${escape(docTitle)}</div>
      </div>`;
  }
  const logoHtml = header.logoBase64
    ? `<img src="${header.logoBase64}" alt="logo" />`
    : "";
  const linesHtml = header.linhas
    .filter((l) => l.trim())
    .map((l) => `<div class="header-line">${escape(l)}</div>`)
    .join("");
  return `
    <div class="doc-header">
      ${logoHtml}
      ${linesHtml}
      ${escola ? `<div class="school">${escape(escola.toUpperCase())}</div>` : ""}
      <div class="doc">${escape(docTitle)}</div>
    </div>`;
}

// ===== Lista de Alunos =====

export function studentsListHtml(
  turma: ClassGroup,
  profile: TeacherProfile,
  header: ExportHeader | null = null,
  lang: Language = "pt",
): string {
  const t = translations[lang];
  const escola = profile.instituicao || "Instituição de Ensino";
  const sorted = [...turma.alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  const rows = sorted
    .map(
      (a, i) => `
      <tr>
        <td class="num-col">${i + 1}</td>
        <td class="name-col">${escape(a.nome)}</td>
        <td>${escape(a.idade || "")}</td>
        <td>${escape(a.telefoneEncarregado || "")}</td>
      </tr>`,
    )
    .join("");

  const body = `
    ${renderDocHeader(header, escola, t.exportStudentList)}
    <div class="meta">
      <div class="left"><b>${t.exportClass}:</b> ${escape(turma.designacao)} &nbsp;&nbsp; <b>${t.exportSubject}:</b> ${escape(turma.disciplina)}</div>
      <div class="right"><b>${t.exportSchoolYear}:</b> ${anoLectivo()} &nbsp;&nbsp; <b>${t.exportTotal}:</b> ${turma.alunos.length}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th class="num-col">${t.exportStudentNum}</th>
          <th class="name-col" style="text-align:center">${t.exportStudentName}</th>
          <th>${t.exportAge}</th>
          <th>${t.exportGuardianPhone}</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="4" style="padding:14px">${t.exportNoStudents}</td></tr>`}</tbody>
    </table>
    <div class="footer">
      <div class="prof">${t.exportTeacher}: ${escape(profile.nome || "________________________")}</div>
      <div>${t.exportIssuedAt}: ${NOW()}</div>
    </div>
    <div class="system">${SYSTEM_FOOTER}</div>
  `;
  return htmlDoc(`${t.exportStudentList} - ${turma.designacao}`, body);
}

export function studentsListExcel(
  turma: ClassGroup,
  profile: TeacherProfile,
  header: ExportHeader | null = null,
  lang: Language = "pt",
): ExcelSheetSpec {
  const t = translations[lang];
  const escola = header?.linhas[0] || profile.instituicao || "Instituição de Ensino";
  const sorted = [...turma.alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  const rows: (string | number | null)[][] = [
    [escola.toUpperCase()],
    [t.exportStudentList],
    [],
    [`${t.exportClass}: ${turma.designacao}`, "", `${t.exportSubject}: ${turma.disciplina}`, "", `${t.exportSchoolYear}: ${anoLectivo()}`],
    [],
    [t.exportStudentNum, t.exportStudentName, t.exportAge, t.exportGuardianPhone],
    ...sorted.map((a, i) => [i + 1, a.nome, a.idade || "", a.telefoneEncarregado || ""] as (string | number)[]),
    [],
    [`${t.exportTotal}: ${turma.alunos.length}`],
    [`${t.exportTeacher}: ${profile.nome || ""}`],
    [`${t.exportIssuedAt}: ${NOW()}`],
  ];
  return {
    name: t.exportStudentList,
    rows,
    colWidths: [6, 38, 8, 22],
    merges: [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    ],
  };
}

// ===== Mini-Pauta (trimestre específico) =====

interface AlunoTrimestre {
  mac: number | null;
  npt: number | null;
  mt: number | null;
}

interface AlunoLinha {
  nome: string;
  t1: AlunoTrimestre;
  t2: AlunoTrimestre;
  t3: AlunoTrimestre;
  mfd: number | null;
  ne: number | null;
  recurso: number | null;
  mf: number | null;
  presente: boolean;
}

interface TrimestreStats {
  presentes: number;
  ausentes: number;
  negativasMF: number;
  negativasF: number;
  positivasMF: number;
  positivasF: number;
}

function calcTrimestre(grade: StudentGrade | undefined): AlunoTrimestre {
  const macA = grade ? macAvg(grade.mac) : null;
  const nptA = grade?.npt ?? null;
  // Trimestral average: MAC plus NPT divided by 2.
  const mtA =
    macA !== null && nptA !== null
      ? Math.round(((macA + nptA) / 2) * 10) / 10
      : macA !== null
        ? macA
        : nptA;
  return { mac: macA, npt: nptA, mt: mtA };
}

function calcTerceiroTrimestrePautaCompleta(grade: StudentGrade | undefined): AlunoTrimestre {
  const macA = grade ? macAvg(grade.mac) : null;
  return { mac: macA, npt: null, mt: macA };
}

function isExamClass(turma: ClassGroup): boolean {
  return /^\s*(6|9|12)(?!\d)/.test(turma.designacao.trim());
}

function calcStats(linhas: AlunoLinha[], trim: "t1" | "t2" | "t3", threshold = 10): TrimestreStats {
  let presentes = 0, ausentes = 0, negativasMF = 0, positivasMF = 0;
  for (const l of linhas) {
    const t = l[trim];
    const tem = t.mac !== null || t.npt !== null;
    if (tem) {
      presentes++;
      if ((t.mt ?? 0) < threshold) negativasMF++;
      else positivasMF++;
    } else ausentes++;
  }
  return { presentes, ausentes, negativasMF, negativasF: 0, positivasMF, positivasF: 0 };
}

function statsRowHtml(label: string, s: TrimestreStats, total: number, t: typeof translations.pt): string {
  const denom = total > 0 ? total : 1;
  const negPct = (s.negativasMF / denom) * 100;
  const posPct = (s.positivasMF / denom) * 100;
  return `
    <tr>
      <td class="name-col">${label}</td>
      <td>${s.presentes}</td><td>${s.ausentes}</td>
      <td>${s.negativasMF}</td><td>${s.negativasF}</td><td>${fmtPct(negPct)}%</td>
      <td>${s.positivasMF}</td><td>${s.positivasF}</td><td>${fmtPct(posPct)}%</td>
    </tr>`;
}

export function miniPautaHtml(
  turma: ClassGroup,
  grades: StudentGrade[],
  profile: TeacherProfile,
  periodoLabel = "",
  header: ExportHeader | null = null,
  lang: Language = "pt",
): string {
  const t = translations[lang];
  const escola = profile.instituicao || "Instituição de Ensino";
  const threshold = getNegativeThreshold(turma, profile);
  const sorted = [...turma.alunos].sort((a, b) => a.nome.localeCompare(b.nome));

  const linhas = sorted.map((s) => {
    const grade = grades.find((g) => g.alunoId === s.id && g.turmaId === turma.id);
    const tr = calcTrimestre(grade);
    return { nome: s.nome, ...tr, presente: !!grade && (grade.mac.length > 0 || grade.npt !== null) };
  });

  const total = linhas.length;
  const presentes = linhas.filter((l) => l.presente).length;
  const ausentes = total - presentes;
  const negativas = linhas.filter((l) => l.presente && (l.mt ?? 0) < threshold).length;
  const positivas = linhas.filter((l) => l.presente && (l.mt ?? 0) >= threshold).length;
  const denom = total > 0 ? total : 1;

  const rowsHtml = linhas
    .map((l, i) => {
      return `
      <tr>
        <td>${i + 1}</td>
        <td class="name-col">${escape(l.nome)}</td>
        ${gradeTd(l.mac, threshold)}
        ${gradeTd(l.npt, threshold)}
        ${gradeTd(l.mt, threshold)}
      </tr>`;
    })
    .join("");

  const periodoStr = periodoLabel ? ` — ${periodoLabel}` : "";
  const nivelLabel = turma.nivelEnsino || profile.nivelEnsino || "—";
  const docTitle = `${t.exportMiniPauta}${periodoStr}`;

  const body = `
    ${renderDocHeader(header, escola, docTitle)}
    <div class="meta">
      <div class="left"><b>${t.exportCourse}:</b> ${escape(nivelLabel)} &nbsp;&nbsp; <b>${t.exportClass}:</b> ${escape(turma.designacao)}</div>
      <div class="right"><b>${t.exportSubject}:</b> ${escape(turma.disciplina)} &nbsp;&nbsp; <b>${t.exportSchoolYear}:</b> ${anoLectivo()}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th class="num-col">${t.exportStudentNum}</th>
          <th class="name-col" style="text-align:center">${t.exportStudentName}</th>
          <th>MAC</th><th>NPT</th><th>MT</th>
        </tr>
      </thead>
      <tbody>${rowsHtml || `<tr><td colspan="5" style="padding:14px">${t.exportNoStudents}</td></tr>`}</tbody>
    </table>
    <div class="stats-title">${t.exportStats}${periodoStr}</div>
    <table class="stats-table" style="width:auto">
      <thead>
        <tr><th>${t.exportPresent}</th><th>${t.exportAbsent}</th><th>${t.exportNegative} (MT&lt;${threshold})</th><th>%</th><th>${t.exportPositive} (MT≥${threshold})</th><th>%</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${presentes}</td><td>${ausentes}</td>
          <td style="color:#b91c1c">${negativas}</td><td>${fmtPct((negativas / denom) * 100)}%</td>
          <td>${positivas}</td><td>${fmtPct((positivas / denom) * 100)}%</td>
        </tr>
      </tbody>
    </table>
    <div class="footer">
      <div class="prof">${t.exportTeacher}: ${escape(profile.nome || "________________________")}</div>
      <div>${t.exportIssuedAt}: ${NOW()}</div>
    </div>
    <div class="system">${SYSTEM_FOOTER}</div>
  `;
  return htmlDoc(`${t.exportMiniPauta} - ${turma.designacao}${periodoStr}`, body, false);
}

export function miniPautaExcel(
  turma: ClassGroup,
  grades: StudentGrade[],
  profile: TeacherProfile,
  periodoLabel = "",
  header: ExportHeader | null = null,
  lang: Language = "pt",
): ExcelSheetSpec {
  const t = translations[lang];
  const escola = header?.linhas[0] || profile.instituicao || "Instituição de Ensino";
  const threshold = getNegativeThreshold(turma, profile);
  const sorted = [...turma.alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  const linhas = sorted.map((s) => {
    const grade = grades.find((g) => g.alunoId === s.id && g.turmaId === turma.id);
    const tr = calcTrimestre(grade);
    return { nome: s.nome, ...tr, presente: !!grade && (grade.mac.length > 0 || grade.npt !== null) };
  });

  const total = linhas.length;
  const presentes = linhas.filter((l) => l.presente).length;
  const ausentes = total - presentes;
  const negativas = linhas.filter((l) => l.presente && (l.mt ?? 0) < threshold).length;
  const positivas = linhas.filter((l) => l.presente && (l.mt ?? 0) >= threshold).length;
  const denom = total > 0 ? total : 1;
  const periodoStr = periodoLabel ? ` — ${periodoLabel}` : "";
  const nivelLabel = turma.nivelEnsino || profile.nivelEnsino || "—";

  const rows: (string | number | null)[][] = [
    [escola.toUpperCase()],
    [`${t.exportMiniPauta}${periodoStr}`],
    [],
    [`${t.exportCourse}: ${nivelLabel}`, "", `${t.exportClass}: ${turma.designacao}`, "", `${t.exportSubject}: ${turma.disciplina}`, "", `${t.exportSchoolYear}: ${anoLectivo()}`],
    [],
    [t.exportStudentNum, t.exportStudentName, "MAC", "NPT", "MT"],
    ...linhas.map((l, i) => [i + 1, l.nome, l.mac, l.npt, l.mt]),
    [],
    [t.exportStats],
    [`${t.exportPresent}`, `${t.exportAbsent}`, `${t.exportNegative} (MT<${threshold})`, "% Neg.", `${t.exportPositive} (MT≥${threshold})`, "% Pos."],
    [presentes, ausentes, negativas, Math.round((negativas / denom) * 1000) / 10, positivas, Math.round((positivas / denom) * 1000) / 10],
    [],
    [`${t.exportTeacher}: ${profile.nome || ""}`],
    [`${t.exportIssuedAt}: ${NOW()}`],
  ];
  const cellStyles = linhas.flatMap((l, i) => {
    const r = 6 + i;
    return [l.mac, l.npt, l.mt].flatMap((value, idx) =>
      isNegativeGrade(value, threshold)
        ? [gradeCellStyle(r, 2 + idx, "negative")]
        : isPositiveGrade(value, threshold)
          ? [gradeCellStyle(r, 2 + idx, "positive")]
          : [],
    );
  });
  return {
    name: t.exportMiniPauta,
    rows,
    cellStyles,
    colWidths: [4, 32, 9, 9, 9],
    merges: [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    ],
  };
}

// ===== Pauta Completa (todos os períodos) =====

function calcLinhaCompleta(
  student: Student,
  turmaId: string,
  allGrades: StudentGrade[],
  periodKeys: string[],
  examClass: boolean,
): AlunoLinha {
  const sg = allGrades.filter((g) => g.alunoId === student.id && g.turmaId === turmaId);
  const empty: AlunoTrimestre = { mac: null, npt: null, mt: null };
  const getPeriodo = (key: string): AlunoTrimestre =>
    calcTrimestre(sg.find((g) => (g.periodo ?? "I") === key));

  const t1 = getPeriodo(periodKeys[0] ?? "I");
  const t2 = periodKeys[1] ? getPeriodo(periodKeys[1]) : empty;
  const gradeT3 = periodKeys[2]
    ? sg.find((g) => (g.periodo ?? "I") === periodKeys[2])
    : undefined;
  const t3 = periodKeys[2]
    ? examClass
      ? calcTerceiroTrimestrePautaCompleta(gradeT3)
      : getPeriodo(periodKeys[2])
    : empty;

  const isTrimestral = periodKeys.length >= 3;
  const ne = isTrimestral && examClass ? gradeT3?.npt ?? null : null;
  const mfd = isTrimestral
    ? t1.mt !== null && t2.mt !== null && t3.mt !== null
      ? Math.round(((t1.mt + t2.mt + t3.mt) / 3) * 10) / 10
      : null
    : avg([t1.mt, t2.mt].filter((v): v is number => v !== null));
  const mf = isTrimestral && examClass
    ? mfd !== null && ne !== null
      ? Math.round(((mfd + ne) / 2) * 10) / 10
      : null
    : mfd;

  return {
    nome: student.nome, t1, t2, t3, mfd, ne, recurso: null, mf,
    presente: sg.some((g) => g.mac.length > 0 || g.npt !== null),
  };
}

export function pautaCompletaHtml(
  turma: ClassGroup,
  allGrades: StudentGrade[],
  profile: TeacherProfile,
  periodKeys: string[],
  periodLabels: string[],
  header: ExportHeader | null = null,
  lang: Language = "pt",
): string {
  const t = translations[lang];
  const escola = profile.instituicao || "Instituição de Ensino";
  const threshold = getNegativeThreshold(turma, profile);
  const sorted = [...turma.alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  const examClass = isExamClass(turma);
  const linhas = sorted.map((s) => calcLinhaCompleta(s, turma.id, allGrades, periodKeys, examClass));
  const n = Math.min(periodKeys.length, 3);
  const tLabel = (i: number) => periodLabels[i] ?? `${i + 1}º ${t.exportPeriod}`;
  const total = linhas.length;
  const finalColumnsCount = examClass ? 4 : 1;
  const finalHeaderHtml = examClass
    ? `<th rowspan="2">${t.exportMFD}</th><th rowspan="2">${t.exportNE}</th><th rowspan="2">${t.exportRecurso}</th><th rowspan="2">${t.exportMF}</th>`
    : `<th rowspan="2">${t.exportMF}</th>`;

  const rowsHtml = linhas
    .map((l, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="name-col">${escape(l.nome)}</td>
        ${gradeTd(l.t1.mac, threshold)}${gradeTd(l.t1.npt, threshold)}${gradeTd(l.t1.mt, threshold)}
        ${n >= 2 ? `${gradeTd(l.t2.mac, threshold)}${gradeTd(l.t2.npt, threshold)}${gradeTd(l.t2.mt, threshold)}` : ""}
        ${n >= 3 ? `${gradeTd(l.t3.mac, threshold)}${gradeTd(l.t3.npt, threshold)}${gradeTd(l.t3.mt, threshold)}` : ""}
        ${examClass
          ? `${gradeTd(l.mfd, threshold)}${gradeTd(l.ne, threshold)}${gradeTd(l.recurso, threshold)}${gradeTd(l.mf, threshold, true)}`
          : `${gradeTd(l.mf, threshold, true)}`}
      </tr>`)
    .join("");

  const body = `
    ${renderDocHeader(header, escola, t.exportFullPauta)}
    <div class="meta">
      <div class="left"><b>${t.exportCourse}:</b> ${escape(turma.nivelEnsino || profile.nivelEnsino || "—")} &nbsp;&nbsp; <b>${t.exportClass}:</b> ${escape(turma.designacao)}</div>
      <div class="right"><b>${t.exportSubject}:</b> ${escape(turma.disciplina)} &nbsp;&nbsp; <b>${t.exportSchoolYear}:</b> ${anoLectivo()}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th rowspan="2" class="num-col">${t.exportStudentNum}</th>
          <th rowspan="2" class="name-col" style="text-align:center">${t.exportStudentName}</th>
          <th colspan="3">${tLabel(0)}</th>
          ${n >= 2 ? `<th colspan="3">${tLabel(1)}</th>` : ""}
          ${n >= 3 ? `<th colspan="3">${tLabel(2)}</th>` : ""}
          ${finalHeaderHtml}
        </tr>
        <tr>
          <th>MAC</th><th>NPT</th><th>MT</th>
          ${n >= 2 ? `<th>MAC</th><th>NPT</th><th>MT</th>` : ""}
          ${n >= 3 ? `<th>MAC</th><th>NPT</th><th>MT</th>` : ""}
        </tr>
      </thead>
      <tbody>${rowsHtml || `<tr><td colspan="${2 + n * 3 + finalColumnsCount}" style="padding:14px">${t.exportNoStudents}</td></tr>`}</tbody>
    </table>
    <div class="stats-title">${t.exportStatsByPeriod}</div>
    <table class="stats-table">
      <thead>
        <tr>
          <th rowspan="2" class="name-col" style="text-align:center">${t.exportPeriod}</th>
          <th colspan="2">Alunos</th>
          <th colspan="3">${t.exportNegative}</th>
          <th colspan="3">${t.exportPositive}</th>
        </tr>
        <tr>
          <th>${t.exportPresent}</th><th>${t.exportAbsent}</th>
          <th>${t.exportMF}</th><th>${t.exportF}</th><th>%</th>
          <th>${t.exportMF}</th><th>${t.exportF}</th><th>%</th>
        </tr>
      </thead>
      <tbody>
        ${statsRowHtml(tLabel(0), calcStats(linhas, "t1", threshold), total, t)}
        ${n >= 2 ? statsRowHtml(tLabel(1), calcStats(linhas, "t2", threshold), total, t) : ""}
        ${n >= 3 ? statsRowHtml(tLabel(2), calcStats(linhas, "t3", threshold), total, t) : ""}
      </tbody>
    </table>
    <div class="footer">
      <div class="prof">${t.exportTeacher}: ${escape(profile.nome || "________________________")}</div>
      <div>${t.exportIssuedAt}: ${NOW()}</div>
    </div>
    <div class="system">${SYSTEM_FOOTER}</div>
  `;
  return htmlDoc(`${t.exportFullPauta} - ${turma.designacao}`, body, true);
}

export function pautaCompletaExcel(
  turma: ClassGroup,
  allGrades: StudentGrade[],
  profile: TeacherProfile,
  periodKeys: string[],
  periodLabels: string[],
  header: ExportHeader | null = null,
  lang: Language = "pt",
): ExcelSheetSpec {
  const t = translations[lang];
  const escola = header?.linhas[0] || profile.instituicao || "Instituição de Ensino";
  const threshold = getNegativeThreshold(turma, profile);
  const sorted = [...turma.alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  const examClass = isExamClass(turma);
  const linhas = sorted.map((s) => calcLinhaCompleta(s, turma.id, allGrades, periodKeys, examClass));
  const n = Math.min(periodKeys.length, 3);
  const tLabel = (i: number) => periodLabels[i] ?? `${i + 1}º ${t.exportPeriod}`;

  const periodHeaders: string[] = [];
  for (let i = 0; i < n; i++) {
    periodHeaders.push(`${tLabel(i)} MAC`, `${tLabel(i)} NPT`, `${tLabel(i)} MT`);
  }
  const finalHeaders = examClass ? [t.exportMFD, t.exportNE, t.exportRecurso, t.exportMF] : [t.exportMF];
  const dataHeader = [t.exportStudentNum, t.exportStudentName, ...periodHeaders, ...finalHeaders];
  const totalCols = dataHeader.length;

  const dataRows = linhas.map((l, i) => {
    const pd: (number | null)[] = [];
    pd.push(l.t1.mac, l.t1.npt, l.t1.mt);
    if (n >= 2) pd.push(l.t2.mac, l.t2.npt, l.t2.mt);
    if (n >= 3) pd.push(l.t3.mac, l.t3.npt, l.t3.mt);
    return examClass
      ? [i + 1, l.nome, ...pd, l.mfd, l.ne, l.recurso, l.mf]
      : [i + 1, l.nome, ...pd, l.mf];
  });

  const statsData: (string | number | null)[][] = [
    [],
    [t.exportStatsByPeriod],
    [t.exportPeriod, t.exportPresent, t.exportAbsent, `${t.exportNegative} ${t.exportMF}`, `${t.exportNegative} ${t.exportF}`, "Neg. %", `${t.exportPositive} ${t.exportMF}`, `${t.exportPositive} ${t.exportF}`, "Pos. %"],
    ...(["t1", "t2", "t3"] as const).slice(0, n).map((tr, i) => {
      const s = calcStats(linhas, tr, threshold);
      const d = linhas.length > 0 ? linhas.length : 1;
      return [tLabel(i), s.presentes, s.ausentes, s.negativasMF, s.negativasF,
        Math.round((s.negativasMF / d) * 1000) / 10,
        s.positivasMF, s.positivasF,
        Math.round((s.positivasMF / d) * 1000) / 10];
    }),
  ];

  const rows: (string | number | null)[][] = [
    [escola.toUpperCase()],
    [t.exportFullPauta],
    [],
    [`${t.exportCourse}: ${profile.nivelEnsino || "—"}`, "", `${t.exportClass}: ${turma.designacao}`, "", `${t.exportSubject}: ${turma.disciplina}`, "", `${t.exportSchoolYear}: ${anoLectivo()}`],
    [],
    dataHeader,
    ...dataRows,
    ...statsData,
    [],
    [`${t.exportTeacher}: ${profile.nome || ""}`],
    [`${t.exportIssuedAt}: ${NOW()}`],
  ];
  const dataStartRow = 6;
  const cellStyles = linhas.flatMap((l, rowIndex) => {
    const r = dataStartRow + rowIndex;
    const values: (number | null)[] = [l.t1.mac, l.t1.npt, l.t1.mt];
    if (n >= 2) values.push(l.t2.mac, l.t2.npt, l.t2.mt);
    if (n >= 3) values.push(l.t3.mac, l.t3.npt, l.t3.mt);
    if (examClass) values.push(l.mfd, l.ne, l.recurso, l.mf);
    else values.push(l.mf);
    return values.flatMap((value, idx) =>
      isNegativeGrade(value, threshold)
        ? [gradeCellStyle(r, 2 + idx, "negative")]
        : isPositiveGrade(value, threshold)
          ? [gradeCellStyle(r, 2 + idx, "positive")]
          : [],
    );
  });
  return {
    name: t.exportFullPauta,
    rows,
    cellStyles,
    colWidths: [4, 32, ...periodHeaders.map(() => 8), ...(examClass ? [7, 7, 8, 7] : [7])],
    merges: [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
    ],
  };
}

// ===== Mapa de Presenças =====

export function attendanceMapHtml(
  turma: ClassGroup,
  records: AttendanceRecord[],
  profile: TeacherProfile,
  periodoLabel = "",
  header: ExportHeader | null = null,
  lang: Language = "pt",
): string {
  const t = translations[lang];
  const escola = profile.instituicao || "Instituição de Ensino";
  const sorted = [...turma.alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  const turmaRecords = records
    .filter((r) => r.turmaId === turma.id)
    .sort((a, b) => a.data.localeCompare(b.data));

  const datas = turmaRecords.map((r) => {
    const d = new Date(r.data);
    return isNaN(d.getTime())
      ? r.data
      : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const headerCols = datas
    .map((d) => `<th class="small">${escape(d)}</th>`)
    .join("");

  const bodyRows = sorted
    .map((aluno, i) => {
      let presencas = 0;
      const cells = turmaRecords
        .map((r) => {
          const reg = r.registos.find((x) => x.alunoId === aluno.id);
          if (!reg) return `<td>—</td>`;
          if (reg.presente) {
            presencas++;
            return `<td>${t.exportP}</td>`;
          }
          if (reg.justificada) return `<td style="color:#d97706"><b>${t.exportFJ}</b></td>`;
          return `<td style="color:#b91c1c"><b>${t.exportF}</b></td>`;
        })
        .join("");
      const total = turmaRecords.length;
      const pct = total > 0 ? Math.round((presencas / total) * 1000) / 10 : 0;
      return `
      <tr>
        <td class="num-col">${i + 1}</td>
        <td class="name-col">${escape(aluno.nome)}</td>
        ${cells}
        <td><b>${presencas}/${total}</b></td>
        <td><b>${fmtPct(pct)}%</b></td>
      </tr>`;
    })
    .join("");

  const totalSessoes = turmaRecords.length;
  let totalPres = 0, totalReg = 0;
  for (const r of turmaRecords) {
    for (const x of r.registos) {
      totalReg++;
      if (x.presente) totalPres++;
    }
  }
  const pctGeral = totalReg > 0 ? Math.round((totalPres / totalReg) * 1000) / 10 : 0;

  const periodoStr = periodoLabel ? ` — ${periodoLabel}` : "";
  const docTitle = `${t.exportAttendanceMap}${periodoStr}`;

  const body = `
    ${renderDocHeader(header, escola, docTitle)}
    <div class="meta">
      <div class="left"><b>${t.exportClass}:</b> ${escape(turma.designacao)} &nbsp;&nbsp; <b>${t.exportSubject}:</b> ${escape(turma.disciplina)}</div>
      <div class="right"><b>${t.exportSchoolYear}:</b> ${anoLectivo()} &nbsp;&nbsp; <b>Sessões:</b> ${totalSessoes}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th class="num-col">${t.exportStudentNum}</th>
          <th class="name-col" style="text-align:center">${t.exportStudentName}</th>
          ${headerCols || `<th>Sem registos</th>`}
          <th>${t.exportTotal}</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>${bodyRows || `<tr><td colspan="5" style="padding:14px">${t.exportNoStudents}</td></tr>`}</tbody>
    </table>
    <div class="stats-title">Resumo Geral</div>
    <table class="stats-table" style="width:auto">
      <tbody>
        <tr><td class="name-col"><b>${t.exportTotalLessons}</b></td><td>${totalSessoes}</td></tr>
        <tr><td class="name-col"><b>${t.exportPresent}</b></td><td>${totalPres} de ${totalReg}</td></tr>
        <tr><td class="name-col"><b>%</b></td><td>${fmtPct(pctGeral)}%</td></tr>
      </tbody>
    </table>
    <div class="footer">
      <div class="prof">${t.exportTeacher}: ${escape(profile.nome || "________________________")}</div>
      <div>${t.exportIssuedAt}: ${NOW()}</div>
    </div>
    <div style="margin-top:6px;font-size:8.5pt;color:#555">${t.exportP} = ${t.exportPresent} · ${t.exportF} = ${t.exportAbsent} · ${t.exportFJ} = ${t.exportJustified}</div>
    <div class="system">${SYSTEM_FOOTER}</div>
  `;
  return htmlDoc(`${t.exportAttendanceMap} - ${turma.designacao}${periodoStr}`, body, true);
}

export function attendanceMapExcel(
  turma: ClassGroup,
  records: AttendanceRecord[],
  profile: TeacherProfile,
  periodoLabel = "",
  header: ExportHeader | null = null,
  lang: Language = "pt",
): ExcelSheetSpec {
  const t = translations[lang];
  const escola = header?.linhas[0] || profile.instituicao || "Instituição de Ensino";
  const sorted = [...turma.alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  const turmaRecords = records
    .filter((r) => r.turmaId === turma.id)
    .sort((a, b) => a.data.localeCompare(b.data));

  const datas = turmaRecords.map((r) => {
    const d = new Date(r.data);
    return isNaN(d.getTime())
      ? r.data
      : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const excelHeader: (string | number)[] = [t.exportStudentNum, t.exportStudentName, ...datas, t.exportTotal, "%"];
  const dataRows = sorted.map((aluno, i) => {
    let pres = 0;
    const cells = turmaRecords.map((r) => {
      const reg = r.registos.find((x) => x.alunoId === aluno.id);
      if (!reg) return "—";
      if (reg.presente) { pres++; return t.exportP; }
      if (reg.justificada) return t.exportFJ;
      return t.exportF;
    });
    const total = turmaRecords.length;
    const pct = total > 0 ? Math.round((pres / total) * 1000) / 10 : 0;
    return [i + 1, aluno.nome, ...cells, `${pres}/${total}`, pct];
  });

  const periodoStr = periodoLabel ? ` — ${periodoLabel}` : "";
  const rows: (string | number | null)[][] = [
    [escola.toUpperCase()],
    [`${t.exportAttendanceMap}${periodoStr}`],
    [],
    [
      `${t.exportClass}: ${turma.designacao}`, "",
      `${t.exportSubject}: ${turma.disciplina}`, "",
      `${t.exportSchoolYear}: ${anoLectivo()}`, "",
      `Sessões: ${turmaRecords.length}`,
    ],
    [],
    excelHeader,
    ...dataRows,
    [],
    [`${t.exportTeacher}: ${profile.nome || ""}`],
    [`${t.exportIssuedAt}: ${NOW()}`],
  ];
  const colWidths = [4, 32, ...datas.map(() => 7), 8, 7];
  return {
    name: t.exportAttendanceMap,
    rows,
    colWidths,
    merges: [
      { s: { r: 0, c: 0 }, e: { r: 0, c: excelHeader.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: excelHeader.length - 1 } },
    ],
  };
}
