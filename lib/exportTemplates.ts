import {
  ClassGroup,
  Student,
  StudentGrade,
  AttendanceRecord,
  TeacherProfile,
  GradeEntry,
} from "@/lib/storage";
import { ExcelSheetSpec } from "@/lib/exports";

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

const baseStylePortrait = `
  <style>
    @page { size: A4 portrait; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #111; margin: 0; padding: 0; font-size: 10pt; }
    .header { text-align: center; margin-bottom: 8px; }
    .header .school { font-size: 13pt; font-weight: 700; letter-spacing: .3px; }
    .header .doc { font-size: 11pt; font-weight: 600; margin-top: 4px; text-transform: uppercase; }
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
    @page { size: A4 landscape; margin: 10mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #111; margin: 0; padding: 0; font-size: 9.5pt; }
    .header { text-align: center; margin-bottom: 8px; }
    .header .school { font-size: 13pt; font-weight: 700; letter-spacing: .3px; }
    .header .doc { font-size: 11pt; font-weight: 600; margin-top: 4px; text-transform: uppercase; }
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

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}

// ===== Lista de Alunos =====

export function studentsListHtml(turma: ClassGroup, profile: TeacherProfile): string {
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
    <div class="header">
      <div class="school">${escape(escola.toUpperCase())}</div>
      <div class="doc">Lista de Alunos</div>
    </div>
    <div class="meta">
      <div class="left"><b>Turma:</b> ${escape(turma.designacao)} &nbsp;&nbsp; <b>Disciplina:</b> ${escape(turma.disciplina)}</div>
      <div class="right"><b>Ano Lectivo:</b> ${anoLectivo()} &nbsp;&nbsp; <b>Total:</b> ${turma.alunos.length}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th class="num-col">Nº</th>
          <th class="name-col" style="text-align:center">Nome do Aluno</th>
          <th>Idade</th>
          <th>Telefone do Encarregado</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="4" style="padding:14px">Sem alunos</td></tr>`}</tbody>
    </table>
    <div class="footer">
      <div class="prof">Professor(a): ${escape(profile.nome || "________________________")}</div>
      <div>Emitido em: ${NOW()}</div>
    </div>
    <div class="system">Processado pelo Sistema EcoEducacional · Gestão Pedagógica · Utilizador: ${escape(profile.nome || "professor")}</div>
  `;
  return htmlDoc(`Lista de Alunos - ${turma.designacao}`, body);
}

export function studentsListExcel(turma: ClassGroup, profile: TeacherProfile): ExcelSheetSpec {
  const escola = profile.instituicao || "Instituição de Ensino";
  const sorted = [...turma.alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  const rows: (string | number | null)[][] = [
    [escola.toUpperCase()],
    ["Lista de Alunos"],
    [],
    [`Turma: ${turma.designacao}`, "", `Disciplina: ${turma.disciplina}`, "", `Ano Lectivo: ${anoLectivo()}`],
    [],
    ["Nº", "Nome do Aluno", "Idade", "Telefone Encarregado"],
    ...sorted.map((a, i) => [i + 1, a.nome, a.idade || "", a.telefoneEncarregado || ""] as (string | number)[]),
    [],
    [`Total: ${turma.alunos.length}`],
    [`Professor(a): ${profile.nome || ""}`],
    [`Emitido em: ${NOW()}`],
  ];
  return {
    name: `Alunos`,
    rows,
    colWidths: [6, 38, 8, 22],
    merges: [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    ],
  };
}

// ===== Mini-Pauta =====

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

function calcLinha(student: Student, grade: StudentGrade | undefined): AlunoLinha {
  const macA = grade ? macAvg(grade.mac) : null;
  const nptA = grade?.npt ?? null;
  const mtA =
    macA !== null && nptA !== null
      ? Math.round(((macA + nptA) / 2) * 10) / 10
      : macA !== null
        ? macA
        : nptA;
  const empty: AlunoTrimestre = { mac: null, npt: null, mt: null };
  const t1: AlunoTrimestre = { mac: macA, npt: nptA, mt: mtA };
  const trimestresComNota = [t1.mt, empty.mt, empty.mt].filter((v) => v !== null) as number[];
  const mfd = trimestresComNota.length > 0
    ? Math.round((trimestresComNota.reduce((a, b) => a + b, 0) / 3) * 10) / 10
    : null;
  const mf = mfd;
  return {
    nome: student.nome,
    t1,
    t2: empty,
    t3: empty,
    mfd,
    ne: null,
    recurso: null,
    mf,
    presente: !!grade && (grade.mac.length > 0 || grade.npt !== null),
  };
}

interface TrimestreStats {
  presentes: number;
  ausentes: number;
  negativasMF: number;
  negativasF: number;
  positivasMF: number;
  positivasF: number;
}

function calcStats(linhas: AlunoLinha[], trim: "t1" | "t2" | "t3"): TrimestreStats {
  let presentes = 0,
    ausentes = 0,
    negativasMF = 0,
    positivasMF = 0;
  for (const l of linhas) {
    const t = l[trim];
    const tem = t.mac !== null || t.npt !== null;
    if (tem) {
      presentes++;
      if ((t.mt ?? 0) < 10) negativasMF++;
      else positivasMF++;
    } else ausentes++;
  }
  return {
    presentes,
    ausentes,
    negativasMF,
    negativasF: 0,
    positivasMF,
    positivasF: 0,
  };
}

export function miniPautaHtml(
  turma: ClassGroup,
  grades: StudentGrade[],
  profile: TeacherProfile,
): string {
  const escola = profile.instituicao || "Instituição de Ensino";
  const sorted = [...turma.alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  const linhas = sorted.map((s) =>
    calcLinha(
      s,
      grades.find((g) => g.alunoId === s.id && g.turmaId === turma.id),
    ),
  );

  const rowsHtml = linhas
    .map(
      (l, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="name-col">${escape(l.nome)}</td>
        <td>${fmt(l.t1.mac)}</td><td>${fmt(l.t1.npt)}</td><td>${fmt(l.t1.mt)}</td>
        <td>${fmt(l.t2.mac)}</td><td>${fmt(l.t2.npt)}</td><td>${fmt(l.t2.mt)}</td>
        <td>${fmt(l.t3.mac)}</td><td>${fmt(l.t3.npt)}</td><td>${fmt(l.t3.mt)}</td>
        <td>${fmt(l.mfd)}</td>
        <td>${fmt(l.ne)}</td>
        <td>${fmt(l.recurso)}</td>
        <td><b>${fmt(l.mf)}</b></td>
      </tr>`,
    )
    .join("");

  const total = linhas.length;
  const statsT1 = calcStats(linhas, "t1");
  const statsT2 = calcStats(linhas, "t2");
  const statsT3 = calcStats(linhas, "t3");

  const statsRow = (label: string, s: TrimestreStats) => {
    const denom = total > 0 ? total : 1;
    const negPct = (s.negativasMF / denom) * 100;
    const posPct = (s.positivasMF / denom) * 100;
    return `
      <tr>
        <td class="name-col">${label}</td>
        <td>${s.presentes}</td>
        <td>${s.ausentes}</td>
        <td>${s.negativasMF}</td>
        <td>${s.negativasF}</td>
        <td>${fmtPct(negPct)}</td>
        <td>${s.positivasMF}</td>
        <td>${s.positivasF}</td>
        <td>${fmtPct(posPct)}</td>
      </tr>`;
  };

  const body = `
    <div class="header">
      <div class="school">${escape(escola.toUpperCase())}</div>
      <div class="doc">Mini-Pauta do Professor</div>
    </div>
    <div class="meta">
      <div class="left"><b>Curso:</b> ${escape(profile.nivelEnsino || "—")} &nbsp;&nbsp; <b>Turma:</b> ${escape(turma.designacao)}</div>
      <div class="right"><b>Disciplina:</b> ${escape(turma.disciplina)} &nbsp;&nbsp; <b>Ano Lectivo:</b> ${anoLectivo()}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th rowspan="2" class="num-col">Nº</th>
          <th rowspan="2" class="name-col" style="text-align:center">Nome do Aluno</th>
          <th colspan="3">1º Trimestre</th>
          <th colspan="3">2º Trimestre</th>
          <th colspan="3">3º Trimestre</th>
          <th rowspan="2">MFD</th>
          <th rowspan="2">NE</th>
          <th rowspan="2">Recurso</th>
          <th rowspan="2">MF</th>
        </tr>
        <tr>
          <th>MAC</th><th>NPT</th><th>MT</th>
          <th>MAC</th><th>NPT</th><th>MT</th>
          <th>MAC</th><th>NPT</th><th>MT</th>
        </tr>
      </thead>
      <tbody>${rowsHtml || `<tr><td colspan="15" style="padding:14px">Sem alunos</td></tr>`}</tbody>
    </table>

    <div class="stats-title">Estatística por Trimestre</div>
    <table class="stats-table">
      <thead>
        <tr>
          <th rowspan="2" class="name-col" style="text-align:center">Trimestre</th>
          <th colspan="2">Alunos</th>
          <th colspan="3">Negativas</th>
          <th colspan="3">Positivas</th>
        </tr>
        <tr>
          <th>Presentes</th><th>Ausentes</th>
          <th>MF</th><th>F</th><th>%</th>
          <th>MF</th><th>F</th><th>%</th>
        </tr>
      </thead>
      <tbody>
        ${statsRow("1º Trimestre", statsT1)}
        ${statsRow("2º Trimestre", statsT2)}
        ${statsRow("3º Trimestre", statsT3)}
      </tbody>
    </table>

    <div class="footer">
      <div class="prof">Professor(a): ${escape(profile.nome || "________________________")}</div>
      <div>Emitido em: ${NOW()}</div>
    </div>
    <div class="system">Processado pelo Sistema EcoEducacional · Gestão Pedagógica · Utilizador: ${escape(profile.nome || "professor")}</div>
  `;
  return htmlDoc(`Mini-Pauta - ${turma.designacao}`, body, true);
}

export function miniPautaExcel(
  turma: ClassGroup,
  grades: StudentGrade[],
  profile: TeacherProfile,
): ExcelSheetSpec {
  const escola = profile.instituicao || "Instituição de Ensino";
  const sorted = [...turma.alunos].sort((a, b) => a.nome.localeCompare(b.nome));
  const linhas = sorted.map((s) =>
    calcLinha(
      s,
      grades.find((g) => g.alunoId === s.id && g.turmaId === turma.id),
    ),
  );

  const rows: (string | number | null)[][] = [
    [escola.toUpperCase()],
    ["Mini-Pauta do Professor"],
    [],
    [
      `Curso: ${profile.nivelEnsino || "—"}`,
      "",
      `Turma: ${turma.designacao}`,
      "",
      `Disciplina: ${turma.disciplina}`,
      "",
      `Ano Lectivo: ${anoLectivo()}`,
    ],
    [],
    [
      "Nº",
      "Nome do Aluno",
      "1T MAC",
      "1T NPT",
      "1T MT",
      "2T MAC",
      "2T NPT",
      "2T MT",
      "3T MAC",
      "3T NPT",
      "3T MT",
      "MFD",
      "NE",
      "Recurso",
      "MF",
    ],
    ...linhas.map((l, i) => [
      i + 1,
      l.nome,
      l.t1.mac,
      l.t1.npt,
      l.t1.mt,
      l.t2.mac,
      l.t2.npt,
      l.t2.mt,
      l.t3.mac,
      l.t3.npt,
      l.t3.mt,
      l.mfd,
      l.ne,
      l.recurso,
      l.mf,
    ]),
    [],
    ["Estatística por Trimestre"],
    ["Trimestre", "Presentes", "Ausentes", "Negativas MF", "Negativas F", "Negativas %", "Positivas MF", "Positivas F", "Positivas %"],
    ...(["t1", "t2", "t3"] as const).map((t, i) => {
      const s = calcStats(linhas, t);
      const denom = linhas.length > 0 ? linhas.length : 1;
      return [
        `${i + 1}º Trimestre`,
        s.presentes,
        s.ausentes,
        s.negativasMF,
        s.negativasF,
        Math.round((s.negativasMF / denom) * 1000) / 10,
        s.positivasMF,
        s.positivasF,
        Math.round((s.positivasMF / denom) * 1000) / 10,
      ];
    }),
    [],
    [`Professor(a): ${profile.nome || ""}`],
    [`Emitido em: ${NOW()}`],
  ];
  return {
    name: "Mini-Pauta",
    rows,
    colWidths: [4, 32, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 7],
    merges: [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } },
    ],
  };
}

// ===== Mapa de Presenças =====

export function attendanceMapHtml(
  turma: ClassGroup,
  records: AttendanceRecord[],
  profile: TeacherProfile,
): string {
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
            return `<td>P</td>`;
          }
          return `<td style="color:#b91c1c"><b>F</b></td>`;
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
  let totalPres = 0,
    totalReg = 0;
  for (const r of turmaRecords) {
    for (const x of r.registos) {
      totalReg++;
      if (x.presente) totalPres++;
    }
  }
  const pctGeral = totalReg > 0 ? Math.round((totalPres / totalReg) * 1000) / 10 : 0;

  const body = `
    <div class="header">
      <div class="school">${escape(escola.toUpperCase())}</div>
      <div class="doc">Mapa de Presenças</div>
    </div>
    <div class="meta">
      <div class="left"><b>Turma:</b> ${escape(turma.designacao)} &nbsp;&nbsp; <b>Disciplina:</b> ${escape(turma.disciplina)}</div>
      <div class="right"><b>Ano Lectivo:</b> ${anoLectivo()} &nbsp;&nbsp; <b>Sessões:</b> ${totalSessoes}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th class="num-col">Nº</th>
          <th class="name-col" style="text-align:center">Nome do Aluno</th>
          ${headerCols || `<th>Sem registos</th>`}
          <th>Total</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>${bodyRows || `<tr><td colspan="5" style="padding:14px">Sem alunos</td></tr>`}</tbody>
    </table>
    <div class="stats-title">Resumo Geral</div>
    <table class="stats-table" style="width:auto">
      <tbody>
        <tr><td class="name-col"><b>Total de sessões</b></td><td>${totalSessoes}</td></tr>
        <tr><td class="name-col"><b>Total de presenças registadas</b></td><td>${totalPres} de ${totalReg}</td></tr>
        <tr><td class="name-col"><b>Frequência média</b></td><td>${fmtPct(pctGeral)}%</td></tr>
      </tbody>
    </table>
    <div class="footer">
      <div class="prof">Professor(a): ${escape(profile.nome || "________________________")}</div>
      <div>Emitido em: ${NOW()}</div>
    </div>
    <div class="system">Processado pelo Sistema EcoEducacional · Gestão Pedagógica · Utilizador: ${escape(profile.nome || "professor")}</div>
    <div style="margin-top:6px;font-size:8.5pt;color:#555">Legenda: P = Presente · F = Falta · — = Sem registo</div>
  `;
  return htmlDoc(`Mapa de Presenças - ${turma.designacao}`, body, true);
}

export function attendanceMapExcel(
  turma: ClassGroup,
  records: AttendanceRecord[],
  profile: TeacherProfile,
): ExcelSheetSpec {
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

  const header: (string | number)[] = ["Nº", "Nome do Aluno", ...datas, "Total", "%"];
  const dataRows = sorted.map((aluno, i) => {
    let pres = 0;
    const cells = turmaRecords.map((r) => {
      const reg = r.registos.find((x) => x.alunoId === aluno.id);
      if (!reg) return "—";
      if (reg.presente) {
        pres++;
        return "P";
      }
      return "F";
    });
    const total = turmaRecords.length;
    const pct = total > 0 ? Math.round((pres / total) * 1000) / 10 : 0;
    return [i + 1, aluno.nome, ...cells, `${pres}/${total}`, pct];
  });

  const rows: (string | number | null)[][] = [
    [escola.toUpperCase()],
    ["Mapa de Presenças"],
    [],
    [
      `Turma: ${turma.designacao}`,
      "",
      `Disciplina: ${turma.disciplina}`,
      "",
      `Ano Lectivo: ${anoLectivo()}`,
      "",
      `Sessões: ${turmaRecords.length}`,
    ],
    [],
    header,
    ...dataRows,
    [],
    [`Professor(a): ${profile.nome || ""}`],
    [`Emitido em: ${NOW()}`],
  ];
  const colWidths = [4, 32, ...datas.map(() => 7), 8, 7];
  return {
    name: "Presencas",
    rows,
    colWidths,
    merges: [
      { s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: header.length - 1 } },
    ],
  };
}
