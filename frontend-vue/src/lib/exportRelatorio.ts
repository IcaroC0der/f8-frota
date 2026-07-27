import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatBRL, formatDate } from "./utils";

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

  y += 20;

  // COMPARATIVO MENSAL
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
  });

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
  
  let y = margin;

  // Helpers
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

  // --- Page 1: Cover ---
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
  
  for(let i=0; i<4; i++) {
    const ix = margin + i * (indW + 10);
    doc.setFillColor(38, 38, 38);
    doc.roundedRect(ix, 600, indW, 70, 8, 8, "F");
    doc.setTextColor(255, 213, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(indicators[i].label, ix + indW/2, 625, { align: "center" });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(indicators[i].val, ix + indW/2, 650, { align: "center" });
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
  for(let i=0; i<6; i++) {
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

  drawHeader("PARTICIPAÇÃO POR CATEGORIA DE CUSTO");
  const catRows = [
    ["Abastecimento", formatBRL(data.totals.fuel), data.totals.total ? `${((data.totals.fuel/data.totals.total)*100).toFixed(1)}%` : "0%"],
    ["Manutenção", formatBRL(data.totals.maint), data.totals.total ? `${((data.totals.maint/data.totals.total)*100).toFixed(1)}%` : "0%"],
    ["Operacional", formatBRL(data.totals.oper), data.totals.total ? `${((data.totals.oper/data.totals.total)*100).toFixed(1)}%` : "0%"],
    ["TOTAL GERAL", formatBRL(data.totals.total), "100%"]
  ];
  autoTable(doc, {
    startY: y,
    head: [["CATEGORIA", "VALOR TOTAL", "% DO TOTAL"]],
    body: catRows,
    theme: "plain",
    headStyles: { fillColor: [243, 244, 246], textColor: [115, 115, 115], fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 8 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin }
  });

  // --- Page 3: Evolução Mensal ---
  doc.addPage();
  y = margin;
  drawHeader("EVOLUÇÃO MENSAL POR TIPO");
  const monthlyBody = data.monthly.map(m => [
    m.mes, formatBRL(m.abastecimento), formatBRL(m.manutencao), formatBRL(m.operacional), formatBRL(m.total)
  ]);
  autoTable(doc, {
    startY: y,
    head: [["MÊS", "ABASTECIMENTO", "MANUTENÇÃO", "OPERACIONAL", "TOTAL"]],
    body: monthlyBody,
    theme: "plain",
    headStyles: { fillColor: [243, 244, 246], textColor: [115, 115, 115], fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 8 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
    didDrawPage: (d) => { y = d.cursor?.y || y; }
  });

  // --- Page 4: Despesas por Custo e Tipo ---
  doc.addPage();
  y = margin;
  drawHeader("DESPESAS POR CUSTO E TIPO DE CUSTO");
  const descAcc: any = {};
  for(const r of data.rows) {
    const d = r.description || "Outros";
    descAcc[d] = (descAcc[d] || 0) + r.total_value;
  }
  const descRows = Object.entries(descAcc)
    .sort((a: any, b: any) => b[1] - a[1])
    .map(([k, v]: any) => [k, formatBRL(v), data.totals.total ? `${((v/data.totals.total)*100).toFixed(1)}%` : "0%"]);
  
  autoTable(doc, {
    startY: y,
    head: [["CUSTO / TIPO", "VALOR", "% DO TOTAL"]],
    body: descRows,
    theme: "plain",
    headStyles: { fillColor: [243, 244, 246], textColor: [115, 115, 115], fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 6 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin }
  });

  // --- Page 5: Despesas por Categoria Veiculo ---
  doc.addPage();
  y = margin;
  drawHeader("DESPESAS POR CATEGORIA DE VEÍCULO");
  const catAcc: any = {};
  for(const r of data.rows) {
    const c = r._cat || "Sem Categoria";
    catAcc[c] = (catAcc[c] || 0) + r.total_value;
  }
  const catVehRows = Object.entries(catAcc)
    .sort((a: any, b: any) => b[1] - a[1])
    .map(([k, v]: any) => [k, formatBRL(v), data.totals.total ? `${((v/data.totals.total)*100).toFixed(1)}%` : "0%"]);
    
  autoTable(doc, {
    startY: y,
    head: [["CATEGORIA", "VALOR", "% DO TOTAL"]],
    body: catVehRows,
    theme: "plain",
    headStyles: { fillColor: [243, 244, 246], textColor: [115, 115, 115], fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 6 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin }
  });

  // --- Page 6: Fornecedores ---
  doc.addPage();
  y = margin;
  drawHeader("PRINCIPAIS FORNECEDORES (TOP 20)");
  const suppAcc: any = {};
  for(const r of data.rows) {
    const s = r.supplier || "Sem Fornecedor";
    suppAcc[s] = (suppAcc[s] || 0) + r.total_value;
  }
  const suppRows = Object.entries(suppAcc)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 20)
    .map(([k, v]: any) => [k, formatBRL(v), data.totals.total ? `${((v/data.totals.total)*100).toFixed(1)}%` : "0%"]);
    
  autoTable(doc, {
    startY: y,
    head: [["FORNECEDOR", "VALOR", "% DO TOTAL"]],
    body: suppRows,
    theme: "plain",
    headStyles: { fillColor: [243, 244, 246], textColor: [115, 115, 115], fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 6 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin }
  });

  // --- Page 7: Ranking Veiculos ---
  doc.addPage();
  y = margin;
  drawHeader("RANKING DE VEÍCULOS POR CUSTO");
  const byPlateDesc = [...data.byPlate];
  
  doc.setFontSize(12);
  doc.setTextColor(255, 213, 0);
  doc.text("MAIORES CUSTOS (TOP 10)", margin, y);
  y += 10;
  autoTable(doc, {
    startY: y,
    head: [["#", "PLACA", "LANÇTOS", "CUSTO TOTAL", "% DO TOTAL"]],
    body: byPlateDesc.slice(0, 10).map((p, i) => [i+1, p.placa, p.lanctos, formatBRL(p.total), data.totals.total ? `${((p.total/data.totals.total)*100).toFixed(1)}%` : "0%"]),
    theme: "plain",
    headStyles: { fillColor: [243, 244, 246], textColor: [115, 115, 115], fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 6 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
    didDrawPage: (d) => { y = d.cursor?.y || y; }
  });

  y += 30;
  doc.setFontSize(12);
  doc.setTextColor(255, 213, 0);
  doc.text("MENORES CUSTOS (TOP 10)", margin, y);
  y += 10;
  const byPlateAsc = [...data.byPlate].sort((a: any, b: any) => a.total - b.total);
  autoTable(doc, {
    startY: y,
    head: [["#", "PLACA", "LANÇTOS", "CUSTO TOTAL", "% DO TOTAL"]],
    body: byPlateAsc.slice(0, 10).map((p, i) => [i+1, p.placa, p.lanctos, formatBRL(p.total), data.totals.total ? `${((p.total/data.totals.total)*100).toFixed(1)}%` : "0%"]),
    theme: "plain",
    headStyles: { fillColor: [243, 244, 246], textColor: [115, 115, 115], fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 6 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin }
  });

  addFooters();
  doc.save("analise-despesas-frota.pdf");
}

