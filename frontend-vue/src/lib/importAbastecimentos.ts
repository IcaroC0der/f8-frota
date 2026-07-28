/**
 * Importação de abastecimentos em massa — planilha (CSV/XLSX) ou PDF.
 *
 * O Base44 usava uma integração de IA (ExtractDataFromUploadedFile) para ler
 * qualquer arquivo contra o schema de abastecimento. Aqui a leitura é
 * determinística: uma planilha-modelo com colunas conhecidas + um parser do
 * layout do "RELATÓRIO DE COMBUSTÍVEL" (mesmo conjunto de colunas).
 */
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
// Worker do pdf.js resolvido pelo Vite (?url → string).
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

export interface ImportRow {
  date: string; // YYYY-MM-DD
  invoice_number: string;
  supplier: string;
  plate: string;
  cost_name: string;
  cost_type: string;
  km: number | null;
  quantity: number;
  unit: string;
  total_value: number;
  observation: string;
}
export interface ParseResult {
  rows: ImportRow[];
  errors: string[];
}

// Colunas da planilha-modelo (rótulos do relatório do Base44).
export const TEMPLATE_HEADERS = [
  "DATA", "NRO NOTA", "FORNECEDOR", "VEÍCULO (PLACA)", "CUSTO", "TIPO DE CUSTO",
  "KM", "QUANTIDADE", "UNIDADE", "VALOR TOTAL", "OBSERVAÇÃO",
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().replace(/\s+/g, " ").trim();

// Sinônimos de cabeçalho → campo interno.
const HEADER_MAP: Record<string, keyof ImportRow> = {
  "DATA": "date",
  "NRO NOTA": "invoice_number", "NOTA": "invoice_number", "NF": "invoice_number",
  "NUMERO NOTA": "invoice_number", "NOTA FISCAL": "invoice_number", "INVOICE_NUMBER": "invoice_number",
  "FORNECEDOR": "supplier", "SUPPLIER": "supplier", "POSTO": "supplier",
  "VEICULO (PLACA)": "plate", "PLACA": "plate", "VEICULO": "plate", "PLATE": "plate",
  "CUSTO": "cost_name", "COST_NAME": "cost_name",
  "TIPO DE CUSTO": "cost_type", "TIPO": "cost_type", "COST_TYPE": "cost_type", "COMBUSTIVEL": "cost_type",
  "KM": "km", "QUILOMETRAGEM": "km",
  "QUANTIDADE": "quantity", "QTD": "quantity", "LITROS": "quantity", "QUANTITY": "quantity",
  "UNIDADE": "unit", "UNIT": "unit", "UN": "unit",
  "VALOR TOTAL": "total_value", "VALOR": "total_value", "TOTAL": "total_value", "TOTAL_VALUE": "total_value",
  "OBSERVACAO": "observation", "OBS": "observation", "OBSERVATION": "observation",
};

function parseNum(v: any): number {
  if (v == null || v === "") return NaN;
  if (typeof v === "number") return v;
  let s = String(v).replace(/r\$/i, "").trim();
  // BR: "3.345,00" (milhar '.' + decimal ','); nosso export usa '.' decimal.
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  s = s.replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

function parseDate(v: any): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

/** Constrói um ImportRow a partir de um objeto {campo: valorBruto}. Retorna erro se inválido. */
function buildRow(raw: Partial<Record<keyof ImportRow, any>>, ref: number): { row?: ImportRow; error?: string } {
  const date = parseDate(raw.date);
  const plate = String(raw.plate ?? "").trim().toUpperCase();
  const cost_name = String(raw.cost_name ?? "").trim() || "COMBUSTÍVEIS";
  const cost_type = String(raw.cost_type ?? "").trim();
  const quantity = parseNum(raw.quantity);
  const total_value = parseNum(raw.total_value);
  const missing: string[] = [];
  if (!date) missing.push("data");
  if (!plate) missing.push("placa");
  if (!cost_type) missing.push("tipo de custo");
  if (!Number.isFinite(quantity)) missing.push("quantidade");
  if (!Number.isFinite(total_value)) missing.push("valor total");
  if (missing.length) return { error: `Linha ${ref}: faltando ${missing.join(", ")}` };
  const km = parseNum(raw.km);
  const unit = (String(raw.unit ?? "").trim().toUpperCase() || "LT").slice(0, 4);
  return {
    row: {
      date: date!, plate, cost_name, cost_type, quantity, total_value,
      unit: unit === "UN" ? "UN" : "LT",
      km: Number.isFinite(km) ? Math.round(km) : null,
      invoice_number: String(raw.invoice_number ?? "").trim(),
      supplier: String(raw.supplier ?? "").trim(),
      observation: String(raw.observation ?? "").trim(),
    },
  };
}

/* ─────────────────────────── Planilha (CSV/XLSX) ─────────────────────────── */
export async function parseSpreadsheet(file: File): Promise<ParseResult> {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true, blankrows: false });
  const rows: ImportRow[] = [];
  const errors: string[] = [];
  if (!aoa.length) return { rows, errors: ["Planilha vazia"] };

  // Acha a linha de cabeçalho (a que mapeia DATA/PLACA).
  let headerIdx = aoa.findIndex((r) => r.some((c: any) => HEADER_MAP[norm(String(c ?? ""))] === "date")
    && r.some((c: any) => HEADER_MAP[norm(String(c ?? ""))] === "plate"));
  if (headerIdx < 0) headerIdx = 0;
  const header = aoa[headerIdx].map((c: any) => HEADER_MAP[norm(String(c ?? ""))] ?? null);

  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const r = aoa[i];
    if (!r || r.every((c: any) => c === "" || c == null)) continue;
    const raw: any = {};
    header.forEach((field, col) => { if (field) raw[field] = r[col]; });
    const { row, error } = buildRow(raw, i + 1);
    if (error) errors.push(error);
    else if (row) rows.push(row);
  }
  return { rows, errors };
}

/* ─────────────────────────────────── PDF ─────────────────────────────────── */
interface TItem { x: number; y: number; s: string; }

function groupLines(items: any[]): TItem[][] {
  const map: Record<number, TItem[]> = {};
  for (const it of items) {
    const s = (it.str ?? "").trim();
    if (!s) continue;
    const y = Math.round(it.transform[5]);
    (map[y] ??= []).push({ x: it.transform[4], y, s });
  }
  return Object.keys(map)
    .map(Number).sort((a, b) => b - a)
    .map((y) => map[y].sort((a, b) => a.x - b.x));
}

export async function parsePdf(file: File): Promise<ParseResult> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
  const rows: ImportRow[] = [];
  const errors: string[] = [];
  let colX: number[] = [];
  let colField: (keyof ImportRow | null)[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    for (const line of groupLines(tc.items)) {
      const joined = norm(line.map((i) => i.s).join(" "));
      // Cabeçalho: define as colunas (x de cada rótulo).
      if (joined.includes("DATA") && joined.includes("FORNECEDOR") && joined.includes("VALOR TOTAL")) {
        colX = line.map((i) => i.x);
        colField = line.map((i) => HEADER_MAP[norm(i.s)] ?? null);
        continue;
      }
      // Linha de dados: começa com uma data DD/MM/AAAA.
      const first = line[0];
      if (!first || !/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(first.s)) continue;
      if (!colX.length) continue;

      // Distribui cada item na coluna cujo x de cabeçalho é o maior <= x do item.
      const cells: Record<string, string[]> = {};
      for (const it of line) {
        let idx = 0;
        for (let c = 0; c < colX.length; c++) if (it.x >= colX[c] - 2) idx = c;
        const field = colField[idx];
        if (field) (cells[field] ??= []).push(it.s);
      }
      const raw: any = {};
      for (const k in cells) raw[k] = cells[k].join(" ").trim();
      const { row, error } = buildRow(raw, rows.length + errors.length + 1);
      if (error) errors.push(error);
      else if (row) rows.push(row);
    }
  }
  if (!rows.length && !errors.length) errors.push("Nenhuma linha de abastecimento reconhecida no PDF.");
  return { rows, errors };
}

/* ───────────────────────── Dispatcher + modelo ───────────────────────── */
export async function parseImportFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return parsePdf(file);
  return parseSpreadsheet(file);
}

/** Gera e baixa a planilha-modelo (XLSX) com cabeçalho + exemplo. */
export function downloadTemplate() {
  const example = [
    "2026-06-01", "5662", "POSTO SABADIN II LTDA", "ONP5G56", "COMBUSTÍVEIS",
    "ETANOL", 401813, 28.29, "LT", 138.34, "Observação opcional",
  ];
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, example]);
  ws["!cols"] = TEMPLATE_HEADERS.map((h, i) => ({ wch: i === 2 ? 34 : Math.max(10, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Abastecimentos");
  XLSX.writeFile(wb, "modelo-importacao-abastecimentos.xlsx");
}
