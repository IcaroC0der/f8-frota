import jsPDF from 'jspdf';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

export function gerarPDF({ filtered, filters }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const MARGIN = 14;
  const CONTENT_W = W - MARGIN * 2;

  // ---- COLORS ----
  const BLUE = [37, 99, 235];
  const CYAN = [6, 182, 212];
  const DARK = [15, 23, 42];
  const GRAY = [100, 116, 139];
  const LIGHT = [241, 245, 249];
  const WHITE = [255, 255, 255];
  const AMBER = [245, 158, 11];
  const RED = [239, 68, 68];
  const GREEN = [16, 185, 129];

  let y = 0;

  const addPage = () => {
    doc.addPage();
    y = 20;
    drawHeaderBand();
  };

  const checkPageBreak = (needed = 10) => {
    if (y + needed > 280) addPage();
  };

  const drawHeaderBand = () => {
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, W, 14, 'F');
    doc.setFillColor(...CYAN);
    doc.rect(0, 12, W, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO GERAL DE CUSTOS', MARGIN, 9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`, W - MARGIN, 9, { align: 'right' });
  };

  // ---- PAGE 1 COVER ----
  // Hero gradient
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 60, 'F');
  doc.setFillColor(29, 78, 216);
  doc.roundedRect(MARGIN, 18, CONTENT_W, 38, 4, 4, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO GERAL DE CUSTOS', W / 2, 32, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Gestão de Frota · Custos Consolidados', W / 2, 40, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`, W / 2, 48, { align: 'center' });

  y = 70;

  // ---- FILTER SUMMARY ----
  doc.setFillColor(...LIGHT);
  doc.roundedRect(MARGIN, y, CONTENT_W, 24, 3, 3, 'F');
  doc.setTextColor(...DARK);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('FILTROS APLICADOS', MARGIN + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  const filterText = [
    filters.dateFrom ? `De: ${filters.dateFrom}` : null,
    filters.dateTo ? `Até: ${filters.dateTo}` : null,
    filters.type !== 'Todos' ? `Tipo: ${filters.type}` : null,
    filters.category !== 'Todos' ? `Categoria: ${filters.category}` : null,
    filters.supplier !== 'Todos' ? `Fornecedor: ${filters.supplier}` : null,
  ].filter(Boolean).join('   |   ') || 'Nenhum filtro aplicado — exibindo todos os registros';
  doc.text(filterText, MARGIN + 4, y + 13);
  doc.setTextColor(...GRAY);
  doc.text(`Total de registros: ${filtered.length.toLocaleString('pt-BR')}`, MARGIN + 4, y + 19);
  y += 30;

  // ---- KPI CARDS ----
  const fuelTotal = filtered.filter(r => r._type === 'Abastecimento').reduce((s, r) => s + (r.total_value || 0), 0);
  const maintTotal = filtered.filter(r => r._type === 'Manutenção').reduce((s, r) => s + (r.total_value || 0), 0);
  const opTotal = filtered.filter(r => r._type === 'Operacional').reduce((s, r) => s + (r.total_value || 0), 0);
  const grandTotal = fuelTotal + maintTotal + opTotal;
  const months = new Set(filtered.map(r => r.date?.slice(0, 7)).filter(Boolean));
  const avgMonthly = months.size > 0 ? grandTotal / months.size : 0;

  const kpis = [
    { label: 'Custo Total', value: fmt(grandTotal), color: BLUE },
    { label: 'Média Mensal', value: fmt(avgMonthly), color: [139, 92, 246] },
    { label: 'Abastecimento', value: fmt(fuelTotal), color: AMBER },
    { label: 'Manutenção', value: fmt(maintTotal), color: RED },
    { label: 'Operacional', value: fmt(opTotal), color: GREEN },
    { label: 'Registros', value: filtered.length.toLocaleString('pt-BR'), color: GRAY },
  ];

  const CARD_W = (CONTENT_W - 10) / 3;
  const CARD_H = 20;

  kpis.forEach((k, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = MARGIN + col * (CARD_W + 5);
    const cy = y + row * (CARD_H + 4);

    doc.setFillColor(...WHITE);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, cy, CARD_W, CARD_H, 2, 2, 'FD');

    doc.setFillColor(...k.color);
    doc.roundedRect(cx, cy, 3, CARD_H, 2, 0, 'F');
    doc.rect(cx + 1, cy, 2, CARD_H, 'F');

    doc.setTextColor(...GRAY);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(k.label.toUpperCase(), cx + 6, cy + 6.5);

    doc.setTextColor(...DARK);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(k.value, cx + 6, cy + 14);
  });

  y += 2 * (CARD_H + 4) + 8;

  // ---- TYPE BREAKDOWN TABLE ----
  checkPageBreak(40);
  doc.setFillColor(...BLUE);
  doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO POR TIPO DE CUSTO', MARGIN + 4, y + 5);
  y += 9;

  const typeData = [
    { name: 'Abastecimento', value: fuelTotal, pct: grandTotal > 0 ? ((fuelTotal / grandTotal) * 100).toFixed(1) : '0', color: AMBER },
    { name: 'Manutenção', value: maintTotal, pct: grandTotal > 0 ? ((maintTotal / grandTotal) * 100).toFixed(1) : '0', color: RED },
    { name: 'Operacional', value: opTotal, pct: grandTotal > 0 ? ((opTotal / grandTotal) * 100).toFixed(1) : '0', color: GREEN },
  ];

  // Header row
  doc.setFillColor(248, 250, 252);
  doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
  doc.setTextColor(...GRAY);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TIPO', MARGIN + 4, y + 5);
  doc.text('VALOR TOTAL', MARGIN + CONTENT_W * 0.45, y + 5);
  doc.text('% DO TOTAL', MARGIN + CONTENT_W * 0.65, y + 5);
  doc.text('BARRA', MARGIN + CONTENT_W * 0.8, y + 5);
  y += 7;

  typeData.forEach(t => {
    doc.setFillColor(...WHITE);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(MARGIN, y + 8, MARGIN + CONTENT_W, y + 8);

    doc.setFillColor(...t.color);
    doc.circle(MARGIN + 3, y + 4, 1.5, 'F');
    doc.setTextColor(...DARK);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(t.name, MARGIN + 7, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(fmt(t.value), MARGIN + CONTENT_W * 0.45, y + 5.5);
    doc.text(`${t.pct}%`, MARGIN + CONTENT_W * 0.65, y + 5.5);

    // Mini bar
    const barW = CONTENT_W * 0.15;
    const barFill = (parseFloat(t.pct) / 100) * barW;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(MARGIN + CONTENT_W * 0.8, y + 2, barW, 4, 1, 1, 'F');
    doc.setFillColor(...t.color);
    if (barFill > 0) doc.roundedRect(MARGIN + CONTENT_W * 0.8, y + 2, barFill, 4, 1, 1, 'F');
    y += 8;
  });

  // Total row
  doc.setFillColor(248, 250, 252);
  doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
  doc.setTextColor(...DARK);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL GERAL', MARGIN + 4, y + 5);
  doc.text(fmt(grandTotal), MARGIN + CONTENT_W * 0.45, y + 5);
  doc.text('100%', MARGIN + CONTENT_W * 0.65, y + 5);
  y += 12;

  // ---- MONTHLY SUMMARY TABLE ----
  const byMonth = {};
  filtered.forEach(r => {
    if (!r.date) return;
    const k = r.date.slice(0, 7);
    const label = `${k.slice(5, 7)}/${k.slice(0, 4)}`;
    if (!byMonth[k]) byMonth[k] = { label, fuel: 0, maint: 0, op: 0 };
    if (r._type === 'Abastecimento') byMonth[k].fuel += r.total_value || 0;
    if (r._type === 'Manutenção') byMonth[k].maint += r.total_value || 0;
    if (r._type === 'Operacional') byMonth[k].op += r.total_value || 0;
  });
  const monthlyData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ ...v, total: v.fuel + v.maint + v.op }));

  if (monthlyData.length > 0) {
    checkPageBreak(20 + monthlyData.length * 7);

    doc.setFillColor(...BLUE);
    doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPARATIVO MENSAL', MARGIN + 4, y + 5);
    y += 9;

    // Table header
    doc.setFillColor(248, 250, 252);
    doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
    doc.setTextColor(...GRAY);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    const colW = CONTENT_W / 5;
    ['MÊS', 'ABASTECIMENTO', 'MANUTENÇÃO', 'OPERACIONAL', 'TOTAL'].forEach((h, i) => {
      doc.text(h, MARGIN + i * colW + (i === 0 ? 4 : colW / 2), y + 5, { align: i === 0 ? 'left' : 'center' });
    });
    y += 7;

    monthlyData.forEach((m, idx) => {
      checkPageBreak(8);
      doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.line(MARGIN, y + 7, MARGIN + CONTENT_W, y + 7);
      doc.setTextColor(...DARK);
      doc.setFontSize(7);
      doc.setFont('helvetica', m.total === Math.max(...monthlyData.map(d => d.total)) ? 'bold' : 'normal');
      doc.text(m.label, MARGIN + 4, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(fmt(m.fuel), MARGIN + colW + colW / 2, y + 5, { align: 'center' });
      doc.text(fmt(m.maint), MARGIN + 2 * colW + colW / 2, y + 5, { align: 'center' });
      doc.text(fmt(m.op), MARGIN + 3 * colW + colW / 2, y + 5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(fmt(m.total), MARGIN + 4 * colW + colW / 2, y + 5, { align: 'center' });
      y += 7;
    });

    // Total row
    checkPageBreak(8);
    doc.setFillColor(...LIGHT);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setTextColor(...DARK);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', MARGIN + 4, y + 5.5);
    doc.text(fmt(fuelTotal), MARGIN + colW + colW / 2, y + 5.5, { align: 'center' });
    doc.text(fmt(maintTotal), MARGIN + 2 * colW + colW / 2, y + 5.5, { align: 'center' });
    doc.text(fmt(opTotal), MARGIN + 3 * colW + colW / 2, y + 5.5, { align: 'center' });
    doc.text(fmt(grandTotal), MARGIN + 4 * colW + colW / 2, y + 5.5, { align: 'center' });
    y += 14;
  }

  // ---- RESUMO POR PLACA ----
  const byPlate = {};
  filtered.forEach(r => {
    const plate = r.plate || 'Sem placa';
    if (!byPlate[plate]) byPlate[plate] = { plate, model: r.vehicle_model || '', fuel: 0, maint: 0, op: 0, total: 0, count: 0 };
    if (!byPlate[plate].model && r.vehicle_model) byPlate[plate].model = r.vehicle_model;
    const val = r.total_value || 0;
    byPlate[plate].total += val;
    byPlate[plate].count++;
    if (r._type === 'Abastecimento') byPlate[plate].fuel += val;
    else if (r._type === 'Manutenção') byPlate[plate].maint += val;
    else if (r._type === 'Operacional') byPlate[plate].op += val;
  });
  const plateList = Object.values(byPlate).sort((a, b) => b.total - a.total);

  if (plateList.length > 0) {
    checkPageBreak(20 + plateList.length * 8);

    doc.setFillColor(...BLUE);
    doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`RESUMO POR PLACA (${plateList.length} veículo(s))`, MARGIN + 4, y + 5);
    y += 9;

    // Table header
    const pColW = [0.13, 0.20, 0.08, 0.17, 0.17, 0.17, 0.08];
    const pHeaders = ['PLACA', 'MODELO', 'LANÇTOS', 'ABASTECIMENTO', 'MANUTENÇÃO', 'OPERACIONAL', 'TOTAL'];
    doc.setFillColor(248, 250, 252);
    doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
    doc.setTextColor(...GRAY);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    let hx = MARGIN + 2;
    pHeaders.forEach((h, i) => {
      doc.text(h, hx, y + 5);
      hx += CONTENT_W * pColW[i];
    });
    y += 7;

    plateList.forEach((p, idx) => {
      checkPageBreak(9);
      doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.line(MARGIN, y + 8, MARGIN + CONTENT_W, y + 8);

      let cx = MARGIN + 2;
      // Placa
      doc.setTextColor(...DARK);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text(p.plate, cx, y + 4.5);
      if (p.model) {
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY);
        doc.text(p.model.slice(0, 18), cx, y + 7.2);
      }
      cx += CONTENT_W * pColW[0];

      // Modelo
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      doc.text((p.model || '—').slice(0, 22), cx, y + 4.5);
      cx += CONTENT_W * pColW[1];

      // Lançamentos
      doc.text(String(p.count), cx, y + 4.5);
      cx += CONTENT_W * pColW[2];

      // Abastecimento
      doc.setTextColor(180, 100, 0);
      doc.text(fmt(p.fuel), cx, y + 4.5);
      cx += CONTENT_W * pColW[3];

      // Manutenção
      doc.setTextColor(180, 30, 30);
      doc.text(fmt(p.maint), cx, y + 4.5);
      cx += CONTENT_W * pColW[4];

      // Operacional
      doc.setTextColor(10, 130, 90);
      doc.text(fmt(p.op), cx, y + 4.5);
      cx += CONTENT_W * pColW[5];

      // Total
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'bold');
      doc.text(fmt(p.total), cx, y + 4.5);

      y += 8;
    });

    // Total row
    checkPageBreak(9);
    doc.setFillColor(...LIGHT);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setTextColor(...DARK);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    let tx = MARGIN + 2;
    doc.text('TOTAL GERAL', tx, y + 5.5);
    tx += CONTENT_W * (pColW[0] + pColW[1]);
    doc.text(String(filtered.length), tx, y + 5.5);
    tx += CONTENT_W * pColW[2];
    doc.setTextColor(180, 100, 0);
    doc.text(fmt(fuelTotal), tx, y + 5.5);
    tx += CONTENT_W * pColW[3];
    doc.setTextColor(180, 30, 30);
    doc.text(fmt(maintTotal), tx, y + 5.5);
    tx += CONTENT_W * pColW[4];
    doc.setTextColor(10, 130, 90);
    doc.text(fmt(opTotal), tx, y + 5.5);
    tx += CONTENT_W * pColW[5];
    doc.setTextColor(...DARK);
    doc.text(fmt(grandTotal), tx, y + 5.5);
    y += 14;
  }

  // ---- DETAIL TABLE ----
  const RECORDS_PER_PAGE = 25;
  const chunks = [];
  for (let i = 0; i < filtered.length; i += RECORDS_PER_PAGE) {
    chunks.push(filtered.slice(i, i + RECORDS_PER_PAGE));
  }

  if (filtered.length > 0) {
    addPage();

    doc.setFillColor(...BLUE);
    doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`DETALHAMENTO DOS LANÇAMENTOS (${filtered.length} registros)`, MARGIN + 4, y + 5);
    y += 9;

    const cols = [
      { label: 'DATA', w: 0.10 },
      { label: 'TIPO', w: 0.12 },
      { label: 'CATEGORIA', w: 0.15 },
      { label: 'PLACA', w: 0.10 },
      { label: 'FORNECEDOR', w: 0.22 },
      { label: 'CUSTO', w: 0.16 },
      { label: 'VALOR (R$)', w: 0.15 },
    ];

    const drawTableHeader = () => {
      doc.setFillColor(248, 250, 252);
      doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
      doc.setTextColor(...GRAY);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      let cx = MARGIN + 2;
      cols.forEach(c => {
        doc.text(c.label, cx, y + 5);
        cx += CONTENT_W * c.w;
      });
      y += 7;
    };

    drawTableHeader();

    const TYPE_COLOR_MAP = { Abastecimento: AMBER, Manutenção: RED, Operacional: GREEN };

    filtered.forEach((r, idx) => {
      checkPageBreak(8);
      if (idx > 0 && idx % RECORDS_PER_PAGE === 0) {
        drawTableHeader();
      }

      doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(MARGIN, y, CONTENT_W, 6.5, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.line(MARGIN, y + 6.5, MARGIN + CONTENT_W, y + 6.5);

      doc.setTextColor(...DARK);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      let cx = MARGIN + 2;
      const values = [
        fmtDate(r.date),
        r._type || '—',
        (r._category || '—').slice(0, 18),
        r.plate || '—',
        (r.supplier || '—').slice(0, 26),
        (r.cost_name || r.cost_type || r.classification || '—').slice(0, 20),
        fmt(r.total_value),
      ];

      values.forEach((v, vi) => {
        if (vi === 1) {
          const tc = TYPE_COLOR_MAP[r._type];
          if (tc) doc.setTextColor(...tc);
          doc.setFont('helvetica', 'bold');
        } else if (vi === 6) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...DARK);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...DARK);
        }
        doc.text(v, cx, y + 4.5);
        cx += CONTENT_W * cols[vi].w;
      });

      y += 6.5;
    });

    // Grand total
    checkPageBreak(10);
    doc.setFillColor(...BLUE);
    doc.rect(MARGIN, y + 1, CONTENT_W, 8, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL GERAL — ${filtered.length} registros`, MARGIN + 4, y + 7);
    doc.text(fmt(grandTotal), MARGIN + CONTENT_W - 4, y + 7, { align: 'right' });
    y += 14;
  }

  // ---- PAGE NUMBERS ----
  const totalPagesDoc = doc.getNumberOfPages();
  for (let i = 1; i <= totalPagesDoc; i++) {
    doc.setPage(i);
    doc.setFillColor(...LIGHT);
    doc.rect(0, 288, W, 9, 'F');
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestão de Frota', MARGIN, 294);
    doc.text(`Página ${i} de ${totalPagesDoc}`, W - MARGIN, 294, { align: 'right' });
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, W / 2, 294, { align: 'center' });
  }

  doc.save(`relatorio-custos-${new Date().toISOString().slice(0, 10)}.pdf`);
}