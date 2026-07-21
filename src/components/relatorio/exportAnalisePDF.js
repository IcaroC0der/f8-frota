import jsPDF from 'jspdf';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
const fmtDateTime = () => new Date().toLocaleString('pt-BR');

const C = {
  BLUE: [37, 99, 235], CYAN: [6, 182, 212], DARK: [15, 23, 42],
  GRAY: [100, 116, 139], LIGHT: [241, 245, 249], WHITE: [255, 255, 255],
  AMBER: [245, 158, 11], RED: [239, 68, 68], GREEN: [16, 185, 129],
  VIOLET: [139, 92, 246], INDIGO: [99, 102, 241],
};

export function buildAnalisePDF({ chartImages, data, filters }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 14, CW = W - M * 2;
  let y = 0, page = 1;

  const footer = () => {
    doc.setFillColor(...C.LIGHT);
    doc.rect(0, H - 12, W, 12, 'F');
    doc.setTextColor(...C.GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestão de Frota · Análise de Despesas', M, H - 4.5);
    doc.text(fmtDateTime(), W / 2, H - 4.5, { align: 'center' });
    doc.text(`Página ${page}`, W - M, H - 4.5, { align: 'right' });
  };

  const newPage = () => { footer(); doc.addPage(); page++; y = 18; };
  const brk = (n = 10) => { if (y + n > H - 16) newPage(); };

  const heading = (title, sub) => {
    brk(22);
    doc.setFillColor(...C.BLUE);
    doc.rect(M, y, 3, 8, 'F');
    doc.setTextColor(...C.DARK);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, M + 6, y + 6.5);
    y += 9;
    if (sub) {
      doc.setTextColor(...C.GRAY);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(sub, M, y);
      y += 5;
    }
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(M, y, M + CW, y);
    y += 6;
  };

  const chart = (img, cap) => {
    if (!img?.dataUrl) return;
    const ratio = img.height / img.width;
    const w = CW;
    const h = w * ratio;
    brk(h + 12);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(M - 1, y - 1, w + 2, h + 2, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(M - 1, y - 1, w + 2, h + 2, 3, 3, 'S');
    doc.addImage(img.dataUrl, 'PNG', M, y, w, h);
    y += h + 3;
    if (cap) {
      doc.setTextColor(...C.GRAY);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.text(cap, M, y);
      y += 5;
    }
    y += 6;
  };

  const table = (headers, colWidths, rows, opts = {}) => {
    const rowH = opts.rowH || 7;
    const fontSize = opts.fontSize || 7;
    const highlightLast = opts.highlightLast || false;

    const drawHeader = () => {
      brk(rowH + 2);
      doc.setFillColor(...C.LIGHT);
      doc.rect(M, y, CW, rowH, 'F');
      doc.setTextColor(...C.GRAY);
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'bold');
      let cx = M + 2;
      headers.forEach((h, i) => {
        doc.text(h, cx + (i > 0 ? colWidths[i] / 2 : 1), y + rowH * 0.65, { align: i > 0 ? 'center' : 'left' });
        cx += colWidths[i];
      });
      y += rowH;
    };

    drawHeader();
    rows.forEach((row, ri) => {
      if (y + rowH > H - 16) { newPage(); drawHeader(); }
      const isLast = highlightLast && ri === rows.length - 1;
      if (isLast) {
        doc.setFillColor(...C.LIGHT);
      } else {
        doc.setFillColor(ri % 2 === 0 ? 255 : 248, ri % 2 === 0 ? 255 : 250, ri % 2 === 0 ? 255 : 252);
      }
      doc.rect(M, y, CW, rowH, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.line(M, y + rowH, M + CW, y + rowH);
      let cx = M + 2;
      row.forEach((cell, ci) => {
        const isObj = typeof cell === 'object' && cell !== null;
        const txt = isObj ? cell.text : String(cell);
        const color = isObj ? (cell.color || C.DARK) : C.DARK;
        const bold = isObj ? cell.bold : (ci === 0 || isLast);
        doc.setTextColor(...color);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        const s = String(txt);
        const trunc = s.length > 40 ? s.slice(0, 38) + '…' : s;
        doc.text(trunc, cx + (ci > 0 ? colWidths[ci] / 2 : 1), y + rowH * 0.65, { align: ci > 0 ? 'center' : 'left' });
        cx += colWidths[ci];
      });
      y += rowH;
    });
    y += 4;
  };

  // ===== COVER PAGE =====
  doc.setFillColor(...C.BLUE);
  doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, W, H * 0.42, 'F');
  doc.setFillColor(...C.CYAN);
  doc.rect(0, H * 0.42, W, 3, 'F');

  doc.setTextColor(...C.WHITE);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('ANÁLISE DE', W / 2, H * 0.16, { align: 'center' });
  doc.text('DESPESAS DA FROTA', W / 2, H * 0.22, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(191, 219, 254);
  doc.text('Relatório Gerencial de Custos Consolidados', W / 2, H * 0.27, { align: 'center' });

  // Period card
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(M + 20, H * 0.32, CW - 40, 18, 3, 3, 'F');
  doc.setTextColor(...C.WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PERÍODO DA ANÁLISE', W / 2, H * 0.345, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(data.period.label, W / 2, H * 0.375, { align: 'center' });

  // Generation date
  doc.setTextColor(191, 219, 254);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Data de Geração', W / 2, H * 0.48, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(fmtDateTime(), W / 2, H * 0.50, { align: 'center' });

  // Filters applied
  const filtersArr = [];
  if (filters.dateFrom || filters.dateTo)
    filtersArr.push(`Período: ${filters.dateFrom ? fmtDate(filters.dateFrom) : 'Início'} a ${filters.dateTo ? fmtDate(filters.dateTo) : 'Atual'}`);
  if (filters.type !== 'Todos') filtersArr.push(`Tipo de Custo: ${filters.type}`);
  if (filters.category !== 'Todos') filtersArr.push(`Categoria de Veículo: ${filters.category}`);
  if (filters.supplier !== 'Todos') filtersArr.push(`Fornecedor: ${filters.supplier}`);
  if (filters.costName !== 'Todos') filtersArr.push(`Custo/Classificação: ${filters.costName}`);
  if (filters.plates?.length) filtersArr.push(`Placas: ${filters.plates.join(', ')}`);

  y = H * 0.56;
  const fBoxH = 10 + Math.max(filtersArr.length, 1) * 6;
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(M + 10, y, CW - 20, fBoxH, 3, 3, 'F');
  doc.setTextColor(...C.WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('FILTROS APLICADOS', W / 2, y + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(191, 219, 254);
  if (filtersArr.length === 0) {
    doc.text('Nenhum filtro aplicado — análise de todos os registros', W / 2, y + 12, { align: 'center' });
  } else {
    filtersArr.forEach((f, i) => {
      doc.text(`• ${f}`, W / 2, y + 12 + i * 6, { align: 'center' });
    });
  }

  // Key metrics on cover
  y = H * 0.80;
  doc.setTextColor(...C.WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PRINCIPAIS INDICADORES', W / 2, y, { align: 'center' });

  const k = data.kpis;
  const metrics = [
    { label: 'CUSTO TOTAL', value: fmt(k.total) },
    { label: 'VEÍCULOS', value: String(k.vehicleCount) },
    { label: 'REGISTROS', value: String(k.count) },
    { label: 'MESES', value: String(k.monthsCount) },
  ];
  const mw = (CW - 20) / 4;
  metrics.forEach((m, i) => {
    const mx = M + 10 + i * mw;
    doc.setFillColor(30, 58, 138);
    doc.roundedRect(mx, y + 3, mw - 5, 18, 2, 2, 'F');
    doc.setTextColor(191, 219, 254);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(m.label, mx + (mw - 5) / 2, y + 8, { align: 'center' });
    doc.setTextColor(...C.WHITE);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(m.value, mx + (mw - 5) / 2, y + 15, { align: 'center' });
  });

  footer();

  // ===== PAGE 2: EXECUTIVE SUMMARY =====
  newPage();
  heading('RESUMO EXECUTIVO', 'Principais indicadores de desempenho da frota');

  const kpis = [
    { label: 'Custo Total da Frota', value: fmt(k.total), color: C.BLUE },
    { label: 'Custo Médio por Veículo', value: fmt(k.avgPerVehicle), color: C.VIOLET },
    { label: 'Média Mensal', value: fmt(k.avgMonthly), color: C.INDIGO },
    { label: 'Total de Registros', value: k.count.toLocaleString('pt-BR'), color: C.GRAY },
    { label: 'Veículos Analisados', value: String(k.vehicleCount), color: C.CYAN },
    { label: 'Meses no Período', value: String(k.monthsCount), color: C.AMBER },
  ];

  const cardW = (CW - 10) / 3, cardH = 26;
  kpis.forEach((kp, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const cx = M + col * (cardW + 5);
    const cy = y + row * (cardH + 5);
    doc.setFillColor(...C.WHITE);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, cy, cardW, cardH, 3, 3, 'FD');
    doc.setFillColor(...kp.color);
    doc.roundedRect(cx, cy, cardW, 3, 3, 3, 'F');
    doc.setTextColor(...C.GRAY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(kp.label.toUpperCase(), cx + 5, cy + 10);
    doc.setTextColor(...C.DARK);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(kp.value, cx + 5, cy + 20);
  });
  y += 2 * (cardH + 5) + 8;

  // Participation by type
  heading('PARTICIPAÇÃO POR CATEGORIA DE CUSTO', 'Distribuição percentual das despesas');

  brk(10);
  doc.setFillColor(...C.LIGHT);
  doc.rect(M, y, CW, 7, 'F');
  doc.setTextColor(...C.GRAY);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CATEGORIA', M + 4, y + 5);
  doc.text('VALOR TOTAL', M + CW * 0.35, y + 5, { align: 'center' });
  doc.text('% DO TOTAL', M + CW * 0.55, y + 5, { align: 'center' });
  doc.text('DISTRIBUIÇÃO', M + CW * 0.80, y + 5, { align: 'center' });
  y += 7;

  data.byType.forEach((t, i) => {
    brk(9);
    doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    doc.rect(M, y, CW, 8, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(M, y + 8, M + CW, y + 8);
    doc.setFillColor(...t.color);
    doc.circle(M + 5, y + 4, 1.5, 'F');
    doc.setTextColor(...C.DARK);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(t.name, M + 9, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(fmt(t.value), M + CW * 0.35, y + 5.5, { align: 'center' });
    doc.text(`${t.pct}%`, M + CW * 0.55, y + 5.5, { align: 'center' });
    const barW = CW * 0.18;
    const barX = M + CW * 0.72;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(barX, y + 2.5, barW, 3, 1, 1, 'F');
    doc.setFillColor(...t.color);
    const fill = (parseFloat(t.pct) / 100) * barW;
    if (fill > 0) doc.roundedRect(barX, y + 2.5, fill, 3, 1, 1, 'F');
    y += 8;
  });
  brk(8);
  doc.setFillColor(...C.LIGHT);
  doc.rect(M, y, CW, 8, 'F');
  doc.setTextColor(...C.DARK);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL GERAL', M + 4, y + 5.5);
  doc.text(fmt(k.total), M + CW * 0.35, y + 5.5, { align: 'center' });
  doc.text('100%', M + CW * 0.55, y + 5.5, { align: 'center' });
  y += 12;

  // ===== EVOLUTION CHART + CONFERENCE TABLE =====
  newPage();
  heading('EVOLUÇÃO MENSAL POR TIPO', 'Valores acima das barras · tabela de conferência abaixo');
  chart(chartImages.evolution, 'Figura 1 — Barras empilhadas com totais mensais');
  if (data.byMonth.length > 0) {
    table(
      ['MÊS', 'ABASTECIMENTO', 'MANUTENÇÃO', 'OPERACIONAL', 'TOTAL'],
      [CW * 0.16, CW * 0.21, CW * 0.21, CW * 0.21, CW * 0.21],
      [
        ...data.byMonth.map(m => [
          m.label,
          fmt(m.Abastecimento || 0),
          fmt(m.Manutenção || 0),
          fmt(m.Operacional || 0),
          { text: fmt(m.total), bold: true },
        ]),
        [
          { text: 'TOTAL', bold: true },
          { text: fmt(k.fuel), bold: true },
          { text: fmt(k.maint), bold: true },
          { text: fmt(k.op), bold: true },
          { text: fmt(k.total), bold: true },
        ],
      ],
      { rowH: 7.5, fontSize: 7.5, highlightLast: true }
    );
  }

  // ===== DISTRIBUTION & TREND =====
  newPage();
  heading('DISTRIBUIÇÃO E TENDÊNCIA', 'Participação por tipo e evolução do custo total');
  chart(chartImages.pie, 'Figura 2 — Distribuição por tipo com percentuais nas fatias');
  chart(chartImages.line, 'Figura 3 — Evolução do custo total mensal com valores nos pontos');

  // ===== COST TYPE TABLE =====
  newPage();
  heading('DESPESAS POR CUSTO E TIPO DE CUSTO', 'Agrupamento por categoria de despesa');
  if (data.byCostType.length > 0) {
    table(
      ['CUSTO / TIPO', 'VALOR', '% DO TOTAL'],
      [CW * 0.55, CW * 0.28, CW * 0.17],
      [
        ...data.byCostType.map(c => [
          c.name,
          fmt(c.value),
          `${k.total > 0 ? ((c.value / k.total) * 100).toFixed(1) : 0}%`,
        ]),
        [{ text: 'TOTAL', bold: true }, { text: fmt(k.total), bold: true }, '100%'],
      ],
      { rowH: 7, fontSize: 7.5, highlightLast: true }
    );
  }

  // ===== BY CATEGORY =====
  newPage();
  heading('DESPESAS POR CATEGORIA DE VEÍCULO', 'Distribuição entre categorias da frota');
  chart(chartImages.category, 'Figura 4 — Top categorias por custo com valores');
  if (data.byCategory.length > 0) {
    table(
      ['CATEGORIA', 'VALOR', '% DO TOTAL'],
      [CW * 0.55, CW * 0.28, CW * 0.17],
      data.byCategory.map(c => [c.name, fmt(c.value), `${c.pct}%`]),
      { rowH: 6.5, fontSize: 7 }
    );
  }

  // ===== BY SUPPLIER =====
  newPage();
  heading('PRINCIPAIS FORNECEDORES', 'Top 10 fornecedores por valor');
  chart(chartImages.supplier, 'Figura 5 — Top 10 fornecedores com valores');
  if (data.bySupplier.length > 0) {
    table(
      ['FORNECEDOR', 'VALOR', '% DO TOTAL'],
      [CW * 0.62, CW * 0.23, CW * 0.15],
      data.bySupplier.map(s => [s.name, fmt(s.value), `${k.total > 0 ? ((s.value / k.total) * 100).toFixed(1) : 0}%`]),
      { rowH: 6.5, fontSize: 6.5 }
    );
  }

  // ===== VEHICLE RANKING =====
  newPage();
  heading('RANKING DE VEÍCULOS POR CUSTO', 'Maiores e menores custos da frota');

  if (data.topVehicles.length > 0) {
    brk(10);
    doc.setTextColor(...C.RED);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('▲ MAIORES CUSTOS (Top 10)', M, y + 4);
    y += 6;
    table(
      ['#', 'PLACA', 'MODELO', 'CATEGORIA', 'CUSTO TOTAL', '% DO TOTAL'],
      [CW * 0.05, CW * 0.12, CW * 0.25, CW * 0.18, CW * 0.25, CW * 0.15],
      data.topVehicles.map((v, i) => [
        String(i + 1), v.plate, (v.model || '—').slice(0, 25),
        (v.category || '—').slice(0, 18), fmt(v.total),
        `${k.total > 0 ? ((v.total / k.total) * 100).toFixed(1) : 0}%`,
      ]),
      { rowH: 6.5, fontSize: 6.5 }
    );
  }

  if (data.bottomVehicles.length > 0) {
    brk(12);
    doc.setTextColor(...C.GREEN);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('▼ MENORES CUSTOS (Top 10)', M, y + 4);
    y += 6;
    table(
      ['#', 'PLACA', 'MODELO', 'CATEGORIA', 'CUSTO TOTAL', '% DO TOTAL'],
      [CW * 0.05, CW * 0.12, CW * 0.25, CW * 0.18, CW * 0.25, CW * 0.15],
      data.bottomVehicles.map((v, i) => [
        String(i + 1), v.plate, (v.model || '—').slice(0, 25),
        (v.category || '—').slice(0, 18), fmt(v.total),
        `${k.total > 0 ? ((v.total / k.total) * 100).toFixed(1) : 0}%`,
      ]),
      { rowH: 6.5, fontSize: 6.5 }
    );
  }

  // ===== COST PER VEHICLE =====
  newPage();
  heading('CUSTO POR VEÍCULO', 'Detalhamento completo de despesas por placa');
  if (data.byPlate.length > 0) {
    table(
      ['PLACA', 'MODELO', 'LANÇ.', 'ABASTEC.', 'MANUT.', 'OPERAC.', 'TOTAL'],
      [CW * 0.10, CW * 0.18, CW * 0.07, CW * 0.16, CW * 0.16, CW * 0.16, CW * 0.17],
      [
        ...data.byPlate.map(p => [
          p.plate, (p.model || '—').slice(0, 18), String(p.count),
          fmt(p.fuel), fmt(p.maint), fmt(p.op),
          { text: fmt(p.total), bold: true },
        ]),
        [
          { text: 'TOTAL', bold: true }, '',
          String(data.byPlate.reduce((s, p) => s + p.count, 0)),
          { text: fmt(k.fuel), bold: true },
          { text: fmt(k.maint), bold: true },
          { text: fmt(k.op), bold: true },
          { text: fmt(k.total), bold: true },
        ],
      ],
      { rowH: 6.5, fontSize: 6.5, highlightLast: true }
    );
  }

  footer();
  return doc;
}