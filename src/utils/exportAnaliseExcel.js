import * as XLSX from 'xlsx';

export function exportAnaliseExcel({ filtered, filename = 'analise_custos' }) {
  const wb = XLSX.utils.book_new();

  // ---- Aggregates ----
  const total = filtered.reduce((s, r) => s + (r.total_value || 0), 0);
  const fuel = filtered.filter(r => r._type === 'Abastecimento').reduce((s, r) => s + (r.total_value || 0), 0);
  const maint = filtered.filter(r => r._type === 'Manutenção').reduce((s, r) => s + (r.total_value || 0), 0);
  const op = filtered.filter(r => r._type === 'Operacional').reduce((s, r) => s + (r.total_value || 0), 0);
  const count = filtered.length;

  const monthSet = new Set(filtered.map(r => r.date?.slice(0, 7)).filter(Boolean));
  const monthsCount = monthSet.size;
  const avgMonthly = monthsCount > 0 ? total / monthsCount : 0;

  const plateSet = new Set(filtered.map(r => r.plate).filter(Boolean));
  const vehicleCount = plateSet.size;
  const avgPerVehicle = vehicleCount > 0 ? total / vehicleCount : 0;

  // ---- Sheet 1: Resumo Executivo ----
  const kpiData = [
    { Indicador: 'Custo Total da Frota', 'Valor (R$)': total },
    { Indicador: 'Custo Médio por Veículo', 'Valor (R$)': avgPerVehicle },
    { Indicador: 'Média Mensal', 'Valor (R$)': avgMonthly },
    { Indicador: 'Total de Registros', 'Valor (R$)': count },
    { Indicador: 'Veículos Analisados', 'Valor (R$)': vehicleCount },
    { Indicador: 'Meses no Período', 'Valor (R$)': monthsCount },
    { Indicador: 'Abastecimento', 'Valor (R$)': fuel },
    { Indicador: 'Manutenção', 'Valor (R$)': maint },
    { Indicador: 'Operacional', 'Valor (R$)': op },
    { Indicador: 'Participação Abastecimento (%)', 'Valor (R$)': total > 0 ? +((fuel / total) * 100).toFixed(2) : 0 },
    { Indicador: 'Participação Manutenção (%)', 'Valor (R$)': total > 0 ? +((maint / total) * 100).toFixed(2) : 0 },
    { Indicador: 'Participação Operacional (%)', 'Valor (R$)': total > 0 ? +((op / total) * 100).toFixed(2) : 0 },
  ];
  const ws1 = XLSX.utils.json_to_sheet(kpiData);
  ws1['!cols'] = [{ wch: 32 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumo Executivo');

  // ---- Sheet 2: Lançamentos ----
  const lancData = filtered.map(r => ({
    'Data': r.date ? new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR') : '',
    'Tipo': r._type || '',
    'Categoria': r._category || '',
    'Placa': r.plate || '',
    'Modelo': r.vehicle_model || '',
    'Fornecedor': r.supplier || '',
    'Custo / Classificação': r.cost_name || r.cost_type || r.classification || '',
    'Nota Fiscal': r.invoice_number || '',
    'KM': r.km || '',
    'Valor (R$)': r.total_value || 0,
  }));
  const ws2 = XLSX.utils.json_to_sheet(lancData);
  ws2['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 22 }, { wch: 24 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Lançamentos');

  // ---- Sheet 3: Comparativo Mensal ----
  const byMonthMap = {};
  filtered.forEach(r => {
    if (!r.date) return;
    const key = r.date.slice(0, 7);
    if (!byMonthMap[key]) byMonthMap[key] = { 'Mês': `${key.slice(5, 7)}/${key.slice(0, 4)}`, 'Abastecimento': 0, 'Manutenção': 0, 'Operacional': 0, 'Total': 0 };
    byMonthMap[key][r._type] = (byMonthMap[key][r._type] || 0) + (r.total_value || 0);
    byMonthMap[key]['Total'] += r.total_value || 0;
  });
  const monthlyData = Object.entries(byMonthMap).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  monthlyData.push({ 'Mês': 'TOTAL', 'Abastecimento': fuel, 'Manutenção': maint, 'Operacional': op, 'Total': total });
  const ws3 = XLSX.utils.json_to_sheet(monthlyData);
  ws3['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Comparativo Mensal');

  // ---- Sheet 4: Despesas por Custo ----
  const costMap = {};
  filtered.forEach(r => {
    const k = r.cost_name || r.cost_type || r.classification || 'Outros';
    costMap[k] = (costMap[k] || 0) + (r.total_value || 0);
  });
  const costData = Object.entries(costMap).map(([name, value]) => ({
    'Custo / Tipo': name,
    'Valor (R$)': value,
    '% do Total': total > 0 ? +((value / total) * 100).toFixed(2) : 0,
  })).sort((a, b) => b['Valor (R$)'] - a['Valor (R$)']);
  costData.push({ 'Custo / Tipo': 'TOTAL', 'Valor (R$)': total, '% do Total': 100 });
  const ws4 = XLSX.utils.json_to_sheet(costData);
  ws4['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'Despesas por Custo');

  // ---- Sheet 5: Custo por Veículo ----
  const plateMap = {};
  filtered.forEach(r => {
    const plate = r.plate || 'Sem placa';
    if (!plateMap[plate]) plateMap[plate] = { 'Placa': plate, 'Modelo': '', 'Categoria': '', 'Lançamentos': 0, 'Abastecimento': 0, 'Manutenção': 0, 'Operacional': 0, 'Total': 0 };
    if (r.vehicle_model && !plateMap[plate]['Modelo']) plateMap[plate]['Modelo'] = r.vehicle_model;
    if (r._category && !plateMap[plate]['Categoria']) plateMap[plate]['Categoria'] = r._category;
    const val = r.total_value || 0;
    plateMap[plate]['Total'] += val;
    plateMap[plate]['Lançamentos']++;
    if (r._type === 'Abastecimento') plateMap[plate]['Abastecimento'] += val;
    else if (r._type === 'Manutenção') plateMap[plate]['Manutenção'] += val;
    else if (r._type === 'Operacional') plateMap[plate]['Operacional'] += val;
  });
  const plateData = Object.values(plateMap).sort((a, b) => b.Total - a.Total).map(p => ({
    ...p,
    '% do Total': total > 0 ? +((p.Total / total) * 100).toFixed(2) : 0,
  }));
  plateData.push({ 'Placa': 'TOTAL', 'Modelo': '', 'Categoria': '', 'Lançamentos': count, 'Abastecimento': fuel, 'Manutenção': maint, 'Operacional': op, 'Total': total, '% do Total': 100 });
  const ws5 = XLSX.utils.json_to_sheet(plateData);
  ws5['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws5, 'Custo por Veículo');

  // ---- Generate file ----
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}