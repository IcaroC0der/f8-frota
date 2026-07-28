import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Chart } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { formatBRL, formatBRLk, formatDate } from "./utils";
// Importar "@/lib/charts" também registra os controllers do Chart.js (side-effect).
import { palette, moduleColors, seriesColors, brlTick } from "./charts";

export interface ReportData {
  rows: any[];
  filtersText: string;
  totals: {
    total: number;
    monthlyAvg: number;
    monthsCount: number;
    fuel: number;
    maint: number;
    oper: number;
    count: number;
  };
  monthly: any[];
  byPlate: any[];
  // Comparação entre dois períodos (opcional). O Período A é o próprio `totals`.
  compare?: {
    labelA: string;
    labelB: string;
    totalsB: { total: number; fuel: number; maint: number; oper: number; count: number };
  };
}

/** Linhas de uma tabela comparativa A×B: [métrica, A, B, Δ, Δ%]. */
function comparisonRows(a: any, b: any): (string | number)[][] {
  const cur = (v: number) => formatBRL(v);
  const row = (label: string, av: number, bv: number, isCur = true) => {
    const f = isCur ? cur : (v: number) => String(v);
    const d = av - bv;
    const dp = bv !== 0 ? (d / bv) * 100 : av > 0 ? 100 : 0;
    const s = d >= 0 ? "+" : "";
    return [label, f(av), f(bv), `${s}${f(d)}`, `${s}${dp.toFixed(1)}%`];
  };
  return [
    row("Custo Total", a.total, b.total),
    row("Abastecimento", a.fuel, b.fuel),
    row("Manutenção", a.maint, b.maint),
    row("Operacional", a.oper, b.oper),
    row("Registros", a.count, b.count, false),
  ];
}

/** Colore Δ/Δ% (positivo = aumento de custo = vermelho; negativo = verde). */
const cmpCellColor = (d: any) => {
  if ((d.column.index === 3 || d.column.index === 4) && d.section === "body") {
    const t = String(d.cell.raw);
    if (t.startsWith("+")) d.cell.styles.textColor = [239, 68, 68];
    else if (t.startsWith("-")) d.cell.styles.textColor = [34, 197, 94];
  }
};

/* ============================================================================
 * Renderização de gráficos do Chart.js como imagem PNG (para embutir no PDF).
 * Renderiza num canvas offscreen em alta resolução (2x) e devolve um data URL.
 * ========================================================================== */
const whiteBg = {
  id: "whiteBg",
  beforeDraw(c: any) {
    const { ctx } = c;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.restore();
  },
};

/** Renderiza `cfg` num canvas de `wPt`×`hPt` (pontos do PDF) a 2x e retorna PNG. */
function chartImage(cfg: any, wPt: number, hPt: number): string {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(wPt * scale);
  canvas.height = Math.round(hPt * scale);
  const holder = document.createElement("div");
  holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${canvas.width}px;height:${canvas.height}px`;
  holder.appendChild(canvas);
  document.body.appendChild(holder);
  const chart = new Chart(canvas, {
    ...cfg,
    options: { ...(cfg.options || {}), responsive: false, maintainAspectRatio: false, animation: false, devicePixelRatio: 1 },
    // ChartDataLabels registrado só aqui (não afeta os gráficos das telas).
    plugins: [whiteBg, ChartDataLabels, ...((cfg.plugins as any[]) || [])],
  });
  // JPEG (fundo branco garantido pelo plugin) — PDF muito mais leve que PNG.
  const url = canvas.toDataURL("image/jpeg", 0.92);
  chart.destroy();
  holder.remove();
  return url;
}

// Fontes maiores porque o canvas 2x é reduzido ao caber na largura do PDF.
const fLegend = { size: 22 };
const fTick = { size: 18 };
const fVal = { size: 20, weight: "bold" as const };
const INK = "#171717";
const GRAY = "#525252";
const GRID = "rgba(0,0,0,0.06)";

// Contraste do rótulo dentro da fatia: texto escuro sobre cor clara, branco sobre escura.
const hexLum = (hex: string) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
const arcLabelColor = (ctx: any) => {
  const bg = ctx.dataset.backgroundColor?.[ctx.dataIndex];
  return typeof bg === "string" && bg.startsWith("#") && hexLum(bg) > 0.6 ? "#171717" : "#ffffff";
};

function cfgDoughnut(labels: string[], values: number[], colors: string[]) {
  return {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      cutout: "55%",
      layout: { padding: 10 },
      plugins: {
        legend: { position: "right", labels: { usePointStyle: true, boxWidth: 12, padding: 12, font: fLegend, color: INK } },
        datalabels: {
          color: arcLabelColor,
          font: fVal,
          formatter: (v: number, ctx: any) => {
            const tot = ctx.dataset.data.reduce((s: number, x: number) => s + x, 0);
            return v > 0 && v / tot >= 0.05 ? formatBRLk(v) : "";
          },
        },
      },
    },
  };
}
function cfgBar(labels: string[], values: number[], color: string | string[], isLiters = false) {
  const bg = Array.isArray(color) ? color : labels.map(() => color);
  return {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: bg, borderRadius: 6, maxBarThickness: 60 }] },
    options: {
      layout: { padding: { top: 26, right: 8, bottom: 4, left: 8 } },
      plugins: {
        legend: { display: false },
        datalabels: { anchor: "end", align: "top", color: INK, font: fVal, formatter: (v: number) => (v > 0 ? (isLiters ? `${Math.round(v)} L` : formatBRLk(v)) : "") },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: fTick, color: GRAY, maxRotation: 30, minRotation: 0, autoSkip: true } },
        y: { grid: { color: GRID }, ticks: { font: fTick, color: GRAY, callback: (v: any) => (isLiters ? `${v} L` : brlTick(v)) } },
      },
    },
  };
}
function cfgHBar(labels: string[], values: number[], colors: string[]) {
  return {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 5, maxBarThickness: 40 }] },
    options: {
      indexAxis: "y",
      layout: { padding: { top: 4, right: 76, bottom: 4, left: 8 } },
      plugins: {
        legend: { display: false },
        datalabels: { anchor: "end", align: "right", clamp: true, color: INK, font: fVal, formatter: (v: number) => (v > 0 ? formatBRLk(v) : "") },
      },
      scales: {
        x: { grid: { color: GRID }, ticks: { font: fTick, color: GRAY, callback: (v: any) => brlTick(v) } },
        y: { grid: { display: false }, ticks: { font: fTick, color: GRAY } },
      },
    },
  };
}
function cfgLine(labels: string[], datasets: any[]) {
  return {
    type: "line",
    data: { labels, datasets },
    options: {
      layout: { padding: { top: 26, right: 44, bottom: 4, left: 8 } },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 12, padding: 14, font: fLegend, color: INK } },
        datalabels: {
          align: "top",
          color: (ctx: any) => ctx.dataset.borderColor,
          font: fVal,
          display: (ctx: any) => ctx.dataIndex === ctx.dataset.data.length - 1,
          formatter: (v: number) => (v > 0 ? formatBRLk(v) : ""),
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: fTick, color: GRAY } },
        y: { grid: { color: GRID }, ticks: { font: fTick, color: GRAY, callback: (v: any) => brlTick(v) } },
      },
    },
  };
}
function cfgGrouped(labels: string[], datasets: any[]) {
  return {
    type: "bar",
    data: { labels, datasets },
    options: {
      layout: { padding: { top: 26, right: 8, bottom: 4, left: 8 } },
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 12, padding: 14, font: fLegend, color: INK } },
        datalabels: { anchor: "end", align: "top", color: INK, font: { size: 16, weight: "bold" as const }, formatter: (v: number) => (v > 0 ? formatBRLk(v) : "") },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: fTick, color: GRAY } },
        y: { grid: { color: GRID }, ticks: { font: fTick, color: GRAY, callback: (v: any) => brlTick(v) } },
      },
    },
  };
}

export function exportRelatorioPDF(data: ReportData) {
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  let y = margin;

  // Header background (F8 Ink)
  doc.setFillColor(23, 23, 23); // #171717
  doc.rect(0, 0, pageWidth, 120, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO GERAL DE CUSTOS", pageWidth / 2, 50, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Sistema de Gestão de Frota · Custos Consolidados", pageWidth / 2, 75, { align: "center" });

  const emissao = new Date().toLocaleDateString("pt-BR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Data de emissão: ${emissao}`, pageWidth / 2, 95, { align: "center" });

  y = 140;

  // Filtros aplicados box
  doc.setFillColor(249, 250, 251); // #f9fafb gray-50
  doc.roundedRect(margin, y, pageWidth - margin * 2, 60, 6, 6, "F");
  doc.setTextColor(10, 10, 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("FILTROS APLICADOS", margin + 15, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(115, 115, 115);
  doc.text(data.filtersText, margin + 15, y + 35);
  doc.text(`Total de registros: ${data.totals.count}`, margin + 15, y + 48);

  y += 80;

  // KPIs
  const kpis = [
    { label: "CUSTO TOTAL", value: formatBRL(data.totals.total), color: [59, 130, 246] }, // blue
    { label: "MÉDIA MENSAL", value: formatBRL(data.totals.monthlyAvg), color: [168, 85, 247] }, // purple
    { label: "ABASTECIMENTO", value: formatBRL(data.totals.fuel), color: [245, 158, 11] }, // yellow/orange
    { label: "MANUTENÇÃO", value: formatBRL(data.totals.maint), color: [239, 68, 68] }, // red
    { label: "OPERACIONAL", value: formatBRL(data.totals.oper), color: [34, 197, 94] }, // green
    { label: "REGISTROS", value: String(data.totals.count), color: [115, 115, 115] }, // gray
  ];

  const kpiWidth = (pageWidth - margin * 2 - 20) / 3;
  const kpiHeight = 60;

  for (let i = 0; i < kpis.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const kpiX = margin + col * (kpiWidth + 10);
    const kpiY = y + row * (kpiHeight + 10);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(229, 231, 235); // border gray-200
    doc.setLineWidth(1);
    doc.roundedRect(kpiX, kpiY, kpiWidth, kpiHeight, 6, 6, "FD");

    // Color strip on left
    doc.setFillColor(kpis[i].color[0], kpis[i].color[1], kpis[i].color[2]);
    doc.rect(kpiX, kpiY, 6, kpiHeight, "F");

    doc.setTextColor(115, 115, 115);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(kpis[i].label, kpiX + 15, kpiY + 20);

    doc.setTextColor(10, 10, 10);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(kpis[i].value, kpiX + 15, kpiY + 40);
  }

  y += 150;

  // Add page numbers
  const addFooters = () => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFillColor(243, 244, 246);
      doc.rect(0, pageHeight - 30, pageWidth, 30, "F");
      doc.setTextColor(115, 115, 115);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Sistema de Gestão de Frota", margin, pageHeight - 12);
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth / 2, pageHeight - 12, { align: "center" });
      doc.text(`Página ${i} de ${pages}`, pageWidth - margin, pageHeight - 12, { align: "right" });
    }
  };

  // COMPARATIVO DE PERÍODOS (opcional)
  if (data.compare) {
    doc.setTextColor(10, 10, 10);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("COMPARATIVO DE PERÍODOS", margin, y);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(115, 115, 115);
    doc.text(`Período A: ${data.compare.labelA}   ·   Período B: ${data.compare.labelB}`, margin, y + 14);
    y += 24;
    autoTable(doc, {
      startY: y,
      head: [["MÉTRICA", "PERÍODO A", "PERÍODO B", "VARIAÇÃO", "%"]],
      body: comparisonRows(data.totals, data.compare.totalsB),
      theme: "plain",
      headStyles: { fillColor: [23, 23, 23], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 8, textColor: [10, 10, 10] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      margin: { left: margin, right: margin },
      didParseCell: cmpCellColor,
      didDrawPage: (d) => { y = d.cursor?.y || y; },
    });
    y += 20;
  }

  // RESUMO POR TIPO DE CUSTO
  const tipoBody = [
    ["Abastecimento", formatBRL(data.totals.fuel), data.totals.total > 0 ? `${((data.totals.fuel / data.totals.total) * 100).toFixed(1)}%` : "0%"],
    ["Manutenção", formatBRL(data.totals.maint), data.totals.total > 0 ? `${((data.totals.maint / data.totals.total) * 100).toFixed(1)}%` : "0%"],
    ["Operacional", formatBRL(data.totals.oper), data.totals.total > 0 ? `${((data.totals.oper / data.totals.total) * 100).toFixed(1)}%` : "0%"],
    ["TOTAL GERAL", formatBRL(data.totals.total), "100%"]
  ];

  autoTable(doc, {
    startY: y,
    head: [["TIPO", "VALOR TOTAL", "% DO TOTAL"]],
    body: tipoBody,
    theme: "plain",
    headStyles: { fillColor: [23, 23, 23], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 8, textColor: [10, 10, 10] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => { y = data.cursor?.y || y; }
  });

  // ===== EVOLUÇÃO MENSAL — tabela em página nova, gráfico logo abaixo =====
  doc.addPage();
  y = margin;

  // Tabela mês a mês
  const monthlyBody = data.monthly.map(m => [
    m.mes, formatBRL(m.abastecimento), formatBRL(m.manutencao), formatBRL(m.operacional), formatBRL(m.total)
  ]);
  autoTable(doc, {
    startY: y,
    head: [["MÊS", "ABASTECIMENTO", "MANUTENÇÃO", "OPERACIONAL", "TOTAL"]],
    body: monthlyBody,
    theme: "plain",
    headStyles: { fillColor: [23, 23, 23], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 8, textColor: [10, 10, 10] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
    didDrawPage: (d) => { y = d.cursor?.y || y; },
  });
  y += 24;

  // Gráfico mensal (abaixo da tabela)
  if (data.monthly.length) {
    const cw = pageWidth - margin * 2;
    const chartH = 200;
    if (y + chartH + 24 > pageHeight - 40) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 10, 10);
    doc.text("EVOLUÇÃO MENSAL", margin, y);
    y += 12;
    const monthlyChart = {
      type: "bar",
      data: {
        labels: data.monthly.map((m: any) => m.mes),
        datasets: [
          { label: "Abastecimento", data: data.monthly.map((m: any) => m.abastecimento), backgroundColor: moduleColors[0], stack: "s", borderRadius: 3 },
          { label: "Manutenção", data: data.monthly.map((m: any) => m.manutencao), backgroundColor: moduleColors[1], stack: "s", borderRadius: 3 },
          { label: "Operacional", data: data.monthly.map((m: any) => m.operacional), backgroundColor: moduleColors[2], stack: "s", borderRadius: 3 },
        ],
      },
      options: {
        layout: { padding: 8 },
        plugins: {
          legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 12, padding: 14, font: fLegend, color: INK } },
          datalabels: { display: false },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { font: fTick, color: GRAY } },
          y: { stacked: true, grid: { color: GRID }, ticks: { font: fTick, color: GRAY, callback: (v: any) => brlTick(v) } },
        },
      },
    };
    doc.addImage(chartImage(monthlyChart, cw, chartH), "JPEG", margin, y, cw, chartH);
    y += chartH + 16;
  }

  // RESUMO POR PLACA
  doc.addPage();
  const placaBody = data.byPlate.map(p => [
    p.placa, p.lanctos, formatBRL(p.abastecimento), formatBRL(p.manutencao), formatBRL(p.operacional), formatBRL(p.total)
  ]);

  autoTable(doc, {
    startY: margin,
    head: [["PLACA", "LANÇTOS", "ABASTECIMENTO", "MANUTENÇÃO", "OPERACIONAL", "TOTAL"]],
    body: placaBody,
    theme: "plain",
    headStyles: { fillColor: [23, 23, 23], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 6, textColor: [10, 10, 10] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
  });

  // DETALHAMENTO
  doc.addPage();
  const rowBody = data.rows.map(r => [
    formatDate(r.date), r.module, r.plate || "—", r.description, r.supplier || "—", formatBRL(r.total_value)
  ]);

  autoTable(doc, {
    startY: margin,
    head: [["DATA", "TIPO", "PLACA", "DESCRIÇÃO", "FORNECEDOR", "VALOR (R$)"]],
    body: rowBody,
    theme: "plain",
    headStyles: { fillColor: [23, 23, 23], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 6, textColor: [10, 10, 10] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
  });

  addFooters();
  doc.save("relatorio-frota.pdf");
}

export function exportRelatorioExcel(data: ReportData) {
  const wb = XLSX.utils.book_new();

  // 1. Resumo Sheet
  const resumoData = [
    ["RELATÓRIO GERAL DE CUSTOS"],
    ["Filtros Aplicados:", data.filtersText],
    [],
    ["MÉTRICAS GERAIS"],
    ["Custo Total", data.totals.total],
    ["Média Mensal", data.totals.monthlyAvg],
    ["Abastecimento", data.totals.fuel],
    ["Manutenção", data.totals.maint],
    ["Operacional", data.totals.oper],
    ["Registros", data.totals.count],
    []
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(resumoData);
  XLSX.utils.book_append_sheet(wb, ws1, "Resumo");

  // 2. Comparativo Mensal
  const ws2 = XLSX.utils.json_to_sheet(data.monthly.map(m => ({
    "Mês": m.mes,
    "Abastecimento": m.abastecimento,
    "Manutenção": m.manutencao,
    "Operacional": m.operacional,
    "Total": m.total
  })));
  XLSX.utils.book_append_sheet(wb, ws2, "Mensal");

  // 3. Por Placa
  const ws3 = XLSX.utils.json_to_sheet(data.byPlate.map(p => ({
    "Placa": p.placa,
    "Lançamentos": p.lanctos,
    "Abastecimento": p.abastecimento,
    "Manutenção": p.manutencao,
    "Operacional": p.operacional,
    "Total": p.total
  })));
  XLSX.utils.book_append_sheet(wb, ws3, "Por Placa");

  // 4. Detalhamento
  const ws4 = XLSX.utils.json_to_sheet(data.rows.map(r => ({
    "Data": formatDate(r.date),
    "Tipo": r.module,
    "Categoria": r._cat || "",
    "Placa": r.plate || "—",
    "Descrição": r.description,
    "Fornecedor": r.supplier || "—",
    "Valor (R$)": r.total_value
  })));
  XLSX.utils.book_append_sheet(wb, ws4, "Lançamentos");

  XLSX.writeFile(wb, "relatorio-frota.xlsx");
}

export function exportAnalisePDF(data: ReportData) {
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageWidth - margin * 2;

  let y = margin;

  // ---- dados derivados (respeitam os filtros já aplicados em data.rows) ----
  const rows = data.rows;
  const val = (r: any) => Number(r.total_value || 0);
  const mKey = (d: string) => (d || "").slice(0, 7);
  const mLabel = (k: string) => { const [yy, mm] = k.split("-"); return mm ? `${mm}/${yy.slice(2)}` : k; };
  const months = [...new Set(rows.map((r) => mKey(r.date)).filter(Boolean))].sort() as string[];
  const modRows = (m: string) => rows.filter((r) => r.module === m);
  const sumBy = (arr: any[], keyFn: (r: any) => string): [string, number][] => {
    const acc: Record<string, number> = {};
    for (const r of arr) { const k = keyFn(r) || "Outros"; acc[k] = (acc[k] || 0) + val(r); }
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  };
  const topN = (entries: [string, number][], n: number): [string, number][] => {
    if (entries.length <= n) return entries;
    const head = entries.slice(0, n);
    const rest = entries.slice(n).reduce((s, e) => s + e[1], 0);
    return rest > 0 ? [...head, ["Outros", rest] as [string, number]] : head;
  };
  const sc = (i: number) => seriesColors[i % seriesColors.length];

  // ---- helpers de layout ----
  const addFooters = () => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFillColor(249, 250, 251);
      doc.rect(0, pageHeight - 30, pageWidth, 30, "F");
      doc.setTextColor(115, 115, 115);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Sistema de Gestão de Frota · Análise de Despesas", margin, pageHeight - 12);
      doc.text(new Date().toLocaleString("pt-BR"), pageWidth / 2, pageHeight - 12, { align: "center" });
      doc.text(`Página ${i}`, pageWidth - margin, pageHeight - 12, { align: "right" });
    }
  };
  const drawHeader = (title: string) => {
    doc.setFillColor(255, 213, 0); // F8 Yellow
    doc.rect(margin, y, 6, 20, "F");
    doc.setTextColor(23, 23, 23);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title.toUpperCase(), margin + 15, y + 15);
    y += 40;
  };
  const ensureSpace = (h: number) => { if (y + h > pageHeight - 44) { doc.addPage(); y = margin; } };
  const sectionBanner = (title: string) => {
    ensureSpace(52);
    doc.setFillColor(23, 23, 23);
    doc.roundedRect(margin, y, contentW, 30, 6, 6, "F");
    doc.setFillColor(255, 213, 0);
    doc.rect(margin, y, 6, 30, "F");
    doc.setTextColor(255, 213, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(title.toUpperCase(), margin + 18, y + 20);
    y += 46;
  };
  const chartBlock = (title: string, cfg: any, h = 180) => {
    ensureSpace(h + 30);
    doc.setTextColor(23, 23, 23);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(title, margin, y + 4);
    y += 14;
    doc.addImage(chartImage(cfg, contentW, h), "JPEG", margin, y, contentW, h);
    y += h + 16;
  };

  // --- Page 1: Capa (identidade F8) ---
  doc.setFillColor(23, 23, 23); // F8 Ink
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setTextColor(255, 213, 0); // F8 Yellow
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("ANÁLISE DE", pageWidth / 2, 200, { align: "center" });
  doc.text("DESPESAS DA FROTA", pageWidth / 2, 240, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório Gerencial de Custos Consolidados", pageWidth / 2, 280, { align: "center" });

  doc.setFillColor(38, 38, 38);
  doc.roundedRect(margin, 350, pageWidth - margin * 2, 60, 8, 8, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 213, 0);
  doc.text("PERÍODO DA ANÁLISE", pageWidth / 2, 375, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.text(data.filtersText.includes("De:") ? data.filtersText : "Todo o período", pageWidth / 2, 395, { align: "center" });

  doc.roundedRect(margin, 450, pageWidth - margin * 2, 60, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 213, 0);
  doc.text("FILTROS APLICADOS", pageWidth / 2, 475, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.text(data.filtersText, pageWidth / 2, 495, { align: "center" });

  const indW = (pageWidth - margin * 2 - 30) / 4;
  const indicators = [
    { label: "CUSTO TOTAL", val: formatBRL(data.totals.total) },
    { label: "VEÍCULOS", val: String(data.byPlate.length) },
    { label: "REGISTROS", val: String(data.totals.count) },
    { label: "MESES", val: String(data.totals.monthsCount) }
  ];

  for (let i = 0; i < 4; i++) {
    const ix = margin + i * (indW + 10);
    doc.setFillColor(38, 38, 38);
    doc.roundedRect(ix, 600, indW, 70, 8, 8, "F");
    doc.setTextColor(255, 213, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(indicators[i].label, ix + indW / 2, 625, { align: "center" });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(indicators[i].val, ix + indW / 2, 650, { align: "center" });
  }

  // --- Page 2: Resumo Executivo ---
  doc.addPage();
  y = margin;
  drawHeader("RESUMO EXECUTIVO");

  const execBoxes = [
    { label: "CUSTO TOTAL DA FROTA", val: formatBRL(data.totals.total) },
    { label: "CUSTO MÉDIO POR VEÍCULO", val: formatBRL(data.byPlate.length ? data.totals.total / data.byPlate.length : 0) },
    { label: "MÉDIA MENSAL", val: formatBRL(data.totals.monthlyAvg) },
    { label: "TOTAL DE REGISTROS", val: String(data.totals.count) },
    { label: "VEÍCULOS ANALISADOS", val: String(data.byPlate.length) },
    { label: "MESES NO PERÍODO", val: String(data.totals.monthsCount) }
  ];

  const bxW = (pageWidth - margin * 2 - 20) / 3;
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const bx = margin + col * (bxW + 10);
    const by = y + row * 80;
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(bx, by, bxW, 70, 6, 6, "FD");
    doc.setFillColor(255, 213, 0);
    doc.rect(bx, by, bxW, 6, "F");
    doc.setTextColor(115, 115, 115);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(execBoxes[i].label, bx + 10, by + 25);
    doc.setTextColor(23, 23, 23);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(execBoxes[i].val, bx + 10, by + 50);
  }
  y += 180;

  // ================= COMPARATIVO DE PERÍODOS (opcional) =================
  if (data.compare) {
    const labelA = data.compare.labelA, labelB = data.compare.labelB, tB = data.compare.totalsB;
    doc.addPage();
    y = margin;
    sectionBanner("Comparativo de Períodos");
    doc.setFontSize(9);
    doc.setTextColor(115, 115, 115);
    doc.setFont("helvetica", "normal");
    doc.text(`Período A: ${labelA}       |       Período B: ${labelB}`, margin, y);
    y += 20;
    const mods = ["Abastecimento", "Manutenção", "Operacional"];
    chartBlock(`${labelA}  ×  ${labelB}`, cfgGrouped(mods, [
      { label: `A · ${labelA}`, data: [data.totals.fuel, data.totals.maint, data.totals.oper], backgroundColor: palette.primary, borderRadius: 6 },
      { label: `B · ${labelB}`, data: [tB.fuel, tB.maint, tB.oper], backgroundColor: palette.slate, borderRadius: 6 },
    ]), 190);
    autoTable(doc, {
      startY: y,
      head: [["MÉTRICA", "PERÍODO A", "PERÍODO B", "VARIAÇÃO", "%"]],
      body: comparisonRows(data.totals, tB),
      theme: "plain",
      headStyles: { fillColor: [23, 23, 23], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 8, textColor: [10, 10, 10] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      margin: { left: margin, right: margin },
      didParseCell: cmpCellColor,
    });
  }

  // ================= VISÃO GERAL =================
  doc.addPage();
  y = margin;
  sectionBanner("Visão Geral");

  if (months.length) {
    const lineDs = ([["Abastecimento", moduleColors[0]], ["Manutenção", moduleColors[1]], ["Operacional", moduleColors[2]]] as [string, string][])
      .map(([mod, c]) => ({
        label: mod,
        data: months.map((k) => modRows(mod).filter((r) => mKey(r.date) === k).reduce((s, r) => s + val(r), 0)),
        borderColor: c, backgroundColor: c, tension: 0.35, fill: false, pointRadius: 2, borderWidth: 3,
      }));
    chartBlock("Evolução de Custos (mensal)", cfgLine(months.map(mLabel), lineDs), 190);
  }

  chartBlock(
    "Composição de Custos por Módulo",
    cfgDoughnut(["Abastecimento", "Manutenção", "Operacional"], [data.totals.fuel, data.totals.maint, data.totals.oper], moduleColors),
    170,
  );

  const catEntries = topN(sumBy(rows, (r) => r._cat), 8);
  chartBlock(
    "Custos Totais por Categoria",
    cfgDoughnut(catEntries.map((e) => e[0]), catEntries.map((e) => e[1]), catEntries.map((_, i) => sc(i))),
    170,
  );

  if (months.length >= 2) {
    const cur = months[months.length - 1], prev = months[months.length - 2];
    const mods = ["Abastecimento", "Manutenção", "Operacional"];
    const totFor = (m: string, mod: string) => modRows(mod).filter((r) => mKey(r.date) === m).reduce((s, r) => s + val(r), 0);
    chartBlock(
      "Comparativo Mensal por Módulo",
      cfgGrouped(mods, [
        { label: `Anterior (${mLabel(prev)})`, data: mods.map((md) => totFor(prev, md)), backgroundColor: palette.slate, borderRadius: 6 },
        { label: `Atual (${mLabel(cur)})`, data: mods.map((md) => totFor(cur, md)), backgroundColor: palette.primary, borderRadius: 6 },
      ]),
      190,
    );
  }

  // ================= MANUTENÇÃO =================
  const mrows = modRows("Manutenção");
  if (mrows.length) {
    sectionBanner("Manutenção");

    const isPrev = (c?: string) => !!c && c.toUpperCase().includes("PREVENTIV");
    const prevTotal = mrows.filter((r) => isPrev(r.classification)).reduce((s, r) => s + val(r), 0);
    const corrTotal = mrows.reduce((s, r) => s + val(r), 0) - prevTotal;
    chartBlock("Preventivo × Corretivo", cfgDoughnut(["Preventivo", "Corretivo"], [prevTotal, corrTotal], [palette.success, palette.destructive]), 170);

    const grp = topN(sumBy(mrows, (r) => r.cost_group), 8);
    chartBlock("Manutenção por Grupo de Custo", cfgBar(grp.map((e) => e[0]), grp.map((e) => e[1]), grp.map((_, i) => sc(i))), 190);

    chartBlock(
      "Custo de Manutenção Mensal",
      cfgBar(months.map(mLabel), months.map((k) => mrows.filter((r) => mKey(r.date) === k).reduce((s, r) => s + val(r), 0)), palette.destructive),
      180,
    );
  }

  // ================= ABASTECIMENTO =================
  const frows = modRows("Abastecimento");
  if (frows.length) {
    sectionBanner("Abastecimento");

    const ct = topN(sumBy(frows, (r) => r.cost_type), 8);
    chartBlock("Custo por Tipo de Combustível", cfgDoughnut(ct.map((e) => e[0]), ct.map((e) => e[1]), ct.map((_, i) => sc(i))), 170);

    chartBlock(
      "Custo de Abastecimento Mensal",
      cfgBar(months.map(mLabel), months.map((k) => frows.filter((r) => mKey(r.date) === k).reduce((s, r) => s + val(r), 0)), palette.warning),
      180,
    );

    if (frows.some((r) => Number(r.quantity) > 0)) {
      chartBlock(
        "Litros Abastecidos por Mês",
        cfgBar(months.map(mLabel), months.map((k) => frows.filter((r) => mKey(r.date) === k).reduce((s, r) => s + Number(r.quantity || 0), 0)), palette.primary, true),
        180,
      );
    }
  }

  // ================= RANKING DE VEÍCULOS =================
  doc.addPage();
  y = margin;
  drawHeader("RANKING DE VEÍCULOS POR CUSTO");
  const byPlateDesc = [...data.byPlate];

  doc.setFontSize(11);
  doc.setTextColor(23, 23, 23);
  doc.setFont("helvetica", "bold");
  doc.text("Maiores Custos (Top 10)", margin, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    head: [["#", "PLACA", "LANÇTOS", "CUSTO TOTAL", "% DO TOTAL"]],
    body: byPlateDesc.slice(0, 10).map((p, i) => [i + 1, p.placa, p.lanctos, formatBRL(p.total), data.totals.total ? `${((p.total / data.totals.total) * 100).toFixed(1)}%` : "0%"]),
    theme: "plain",
    headStyles: { fillColor: [23, 23, 23], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 6 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
    didDrawPage: (d) => { y = d.cursor?.y || y; }
  });

  addFooters();
  doc.save("analise-despesas-frota.pdf");
}

/* ============================================================================
 * Relatório por Veículo — uma página por placa selecionada, com KPIs de custo
 * (total + por módulo) e o detalhamento dos lançamentos. Identidade F8.
 * ========================================================================== */
export function exportVeiculosPDF(data: { vehicles: any[]; rows: any[]; periodLabel?: string; fuelRecords?: any[] }) {
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageWidth - margin * 2;
  let y = margin;

  const val = (r: any) => Number(r.total_value || 0);
  const pctOf = (v: number, t: number) => (t > 0 ? `${((v / t) * 100).toFixed(1)}%` : "0%");

  const addFooters = () => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFillColor(249, 250, 251);
      doc.rect(0, pageHeight - 30, pageWidth, 30, "F");
      doc.setTextColor(115, 115, 115);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Sistema de Gestão de Frota · Relatório por Veículo", margin, pageHeight - 12);
      doc.text(new Date().toLocaleString("pt-BR"), pageWidth / 2, pageHeight - 12, { align: "center" });
      doc.text(`Página ${i}`, pageWidth - margin, pageHeight - 12, { align: "right" });
    }
  };
  const sectionBanner = (title: string) => {
    doc.setFillColor(23, 23, 23);
    doc.roundedRect(margin, y, contentW, 32, 6, 6, "F");
    doc.setFillColor(255, 213, 0);
    doc.rect(margin, y, 6, 32, "F");
    doc.setTextColor(255, 213, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, margin + 18, y + 21);
    y += 48;
  };
  const kpiRow = (boxes: { label: string; value: string; color: number[] }[]) => {
    const n = boxes.length;
    const w = (contentW - (n - 1) * 8) / n;
    boxes.forEach((b, i) => {
      const bx = margin + i * (w + 8);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(1);
      doc.roundedRect(bx, y, w, 54, 6, 6, "FD");
      doc.setFillColor(b.color[0], b.color[1], b.color[2]);
      doc.rect(bx, y, w, 5, "F");
      doc.setTextColor(115, 115, 115);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(b.label, bx + 8, y + 24);
      doc.setTextColor(23, 23, 23);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(b.value, bx + 8, y + 43);
    });
    y += 54 + 16;
  };

  // ---- agrega por veículo (respeita as placas selecionadas) ----
  const perVeh = data.vehicles
    .map((v) => {
      const pr = data.rows.filter((r) => r.plate === v.plate);
      const sum = (m: string) => pr.filter((r) => r.module === m).reduce((s, r) => s + val(r), 0);
      return { v, pr, total: pr.reduce((s, r) => s + val(r), 0), fuel: sum("Abastecimento"), maint: sum("Manutenção"), oper: sum("Operacional"), count: pr.length };
    })
    .sort((a, b) => b.total - a.total);

  const grandTotal = perVeh.reduce((s, x) => s + x.total, 0);
  const totalRegs = perVeh.reduce((s, x) => s + x.count, 0);
  const selPlates = new Set(data.vehicles.map((v) => v.plate));
  const allDates = data.rows.filter((r) => selPlates.has(r.plate)).map((r) => r.date).filter(Boolean).sort();
  const periodo = data.periodLabel
    || (allDates.length ? `${formatDate(allDates[0])} — ${formatDate(allDates[allDates.length - 1])}` : "Todo o período");

  // ---- Capa ----
  doc.setFillColor(23, 23, 23);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setTextColor(255, 213, 0);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO", pageWidth / 2, 200, { align: "center" });
  doc.text("POR VEÍCULO", pageWidth / 2, 240, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Custos consolidados por placa", pageWidth / 2, 280, { align: "center" });

  doc.setFillColor(38, 38, 38);
  doc.roundedRect(margin, 350, contentW, 60, 8, 8, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 213, 0);
  doc.text("PERÍODO", pageWidth / 2, 375, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.text(periodo, pageWidth / 2, 395, { align: "center" });

  const indW = (contentW - 30) / 3;
  const inds = [
    { l: "VEÍCULOS", v: String(perVeh.length) },
    { l: "LANÇAMENTOS", v: String(totalRegs) },
    { l: "CUSTO TOTAL", v: formatBRL(grandTotal) },
  ];
  for (let i = 0; i < 3; i++) {
    const ix = margin + i * (indW + 15);
    doc.setFillColor(38, 38, 38);
    doc.roundedRect(ix, 470, indW, 70, 8, 8, "F");
    doc.setTextColor(255, 213, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(inds[i].l, ix + indW / 2, 495, { align: "center" });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text(inds[i].v, ix + indW / 2, 520, { align: "center" });
  }

  // ---- Preço médio por combustível (capa) ----
  if (data.fuelRecords?.length) {
    const selP = new Set(data.vehicles.map((v) => v.plate));
    const fRecs = data.fuelRecords.filter((r) => selP.has(r.plate) && r.unit === "LT" && Number(r.quantity) > 0
      && (!data.periodLabel || true));
    const fuelAcc: Record<string, { cost: number; liters: number; count: number }> = {};
    for (const r of fRecs) {
      const t = r.cost_type || "N/A";
      const b = (fuelAcc[t] ??= { cost: 0, liters: 0, count: 0 });
      b.cost += Number(r.total_value || 0);
      b.liters += Number(r.quantity);
      b.count++;
    }
    const fuelTypes = Object.entries(fuelAcc).sort((a, b) => b[1].count - a[1].count);
    if (fuelTypes.length) {
      const fuelY = 570;
      doc.setTextColor(255, 213, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("PREÇO MÉDIO POR COMBUSTÍVEL (R$/L)", pageWidth / 2, fuelY, { align: "center" });

      const cols = Math.min(fuelTypes.length, 4);
      const fW = (contentW - (cols - 1) * 10) / cols;
      let fRow = 0;
      fuelTypes.forEach(([type, v], i) => {
        const col = i % cols;
        if (i > 0 && col === 0) fRow++;
        const fx = margin + col * (fW + 10);
        const fy = fuelY + 14 + fRow * 56;
        doc.setFillColor(38, 38, 38);
        doc.roundedRect(fx, fy, fW, 48, 5, 5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(type, fx + 8, fy + 16);
        doc.setTextColor(255, 213, 0);
        doc.setFontSize(11);
        doc.text(`R$ ${(v.liters > 0 ? v.cost / v.liters : 0).toFixed(4).replace(".", ",")}`, fx + 8, fy + 32);
        doc.setTextColor(160, 160, 160);
        doc.setFontSize(7);
        doc.text(`${Math.round(v.liters).toLocaleString("pt-BR")} L  ·  ${v.count} abast.`, fx + 8, fy + 43);
      });
    }
  }

  // ---- uma página por veículo ----
  perVeh.forEach((veh) => {
    doc.addPage();
    y = margin;
    sectionBanner(`${veh.v.plate}${veh.v.vehicle_model ? "   ·   " + veh.v.vehicle_model : ""}`);
    doc.setFontSize(9);
    doc.setTextColor(115, 115, 115);
    doc.setFont("helvetica", "normal");
    doc.text(`Categoria: ${veh.v.category_name || "—"}     |     Empresa: ${veh.v.company || "—"}     |     ${veh.count} lançamento(s)`, margin, y);
    y += 22;

    kpiRow([
      { label: "CUSTO TOTAL", value: formatBRL(veh.total), color: [59, 130, 246] },
      { label: "ABASTECIMENTO", value: formatBRL(veh.fuel), color: [245, 158, 11] },
      { label: "MANUTENÇÃO", value: formatBRL(veh.maint), color: [239, 68, 68] },
      { label: "OPERACIONAL", value: formatBRL(veh.oper), color: [34, 197, 94] },
    ]);

    if (!veh.count) {
      doc.setTextColor(115, 115, 115);
      doc.setFontSize(10);
      doc.text("Nenhum lançamento registrado para este veículo no período.", margin, y + 10);
      return;
    }

    const acc: Record<string, any> = {};
    for (const r of veh.pr) {
      const k = r.module + "||" + (r.description || "Outros");
      (acc[k] ??= { mod: r.module, desc: r.description || "Outros", qty: 0, total: 0 });
      acc[k].qty++;
      acc[k].total += val(r);
    }
    // Visão gráfica por veículo: custos por tipo (barras horizontais, cor por módulo)
    const modColor = (m: string) => (m === "Abastecimento" ? moduleColors[0] : m === "Manutenção" ? moduleColors[1] : moduleColors[2]);
    const items = Object.values(acc).sort((a: any, b: any) => b.total - a.total) as any[];
    const top = items.slice(0, 10);
    const chartH = Math.max(130, Math.min(230, top.length * 24 + 46));
    if (y + chartH > pageHeight - 44) { doc.addPage(); y = margin; }
    doc.addImage(
      chartImage(cfgHBar(top.map((x) => x.desc), top.map((x) => x.total), top.map((x) => modColor(x.mod))), contentW, chartH),
      "JPEG", margin, y, contentW, chartH,
    );
    y += chartH + 14;

    const body = items.map((x: any) => [x.mod, x.desc, x.qty, formatBRL(x.total), pctOf(x.total, veh.total)]);

    autoTable(doc, {
      startY: y,
      head: [["MÓDULO", "DESCRIÇÃO", "LANÇTS", "VALOR", "%"]],
      body,
      theme: "plain",
      headStyles: { fillColor: [23, 23, 23], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 6, textColor: [10, 10, 10] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      margin: { left: margin, right: margin },
    });
  });

  addFooters();
  doc.save("relatorio-por-veiculo.pdf");
}
