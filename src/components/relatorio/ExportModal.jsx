import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, FileText, File, Loader2 } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '';

const FORMATS = [
  { id: 'xlsx', label: 'Excel', ext: '.xlsx', desc: 'Microsoft Excel / Google Sheets', icon: '📊', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { id: 'csv', label: 'CSV', ext: '.csv', desc: 'Compatível com qualquer planilha', icon: '📋', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'pdf', label: 'PDF', ext: '.pdf', desc: 'Documento portátil', icon: '📄', color: 'bg-red-50 border-red-200 text-red-700' },
  { id: 'txt', label: 'TXT', ext: '.txt', desc: 'Texto simples', icon: '📝', color: 'bg-slate-50 border-slate-200 text-slate-700' },
  { id: 'md', label: 'Markdown', ext: '.md', desc: 'GitHub / Obsidian / Notion', icon: '✍️', color: 'bg-violet-50 border-violet-200 text-violet-700' },
  { id: 'ods', label: 'ODS', ext: '.ods', desc: 'LibreOffice Calc', icon: '🔢', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { id: 'html', label: 'HTML', ext: '.html', desc: 'Abrir no navegador', icon: '🌐', color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  { id: 'json', label: 'JSON', ext: '.json', desc: 'Dados estruturados / API', icon: '🔧', color: 'bg-amber-50 border-amber-200 text-amber-700' },
];

// ---- Generators ----

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getRows(filtered) {
  return filtered.map(r => ({
    Data: fmtDate(r.date),
    Tipo: r._type || '',
    Categoria: r._category || '',
    Placa: r.plate || '',
    Modelo: r.vehicle_model || '',
    Fornecedor: r.supplier || '',
    'Custo / Classificação': r.cost_name || r.cost_type || r.classification || '',
    'Nota Fiscal': r.invoice_number || '',
    'KM': r.km || '',
    'Valor (R$)': r.total_value || 0,
  }));
}

function exportXLSX(filtered, filename) {
  const escape = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const hCell = (v) => `<Cell ss:StyleID="h"><Data ss:Type="String">${escape(v)}</Data></Cell>`;
  const sCell = (v) => `<Cell><Data ss:Type="String">${escape(v)}</Data></Cell>`;
  const nCell = (v) => { const n = Number(v); return `<Cell><Data ss:Type="Number">${isNaN(n) ? 0 : n}</Data></Cell>`; };

  const rows = getRows(filtered);
  const headers = Object.keys(rows[0] || {});
  const headerRow = `<Row>${headers.map(hCell).join('')}</Row>`;
  const dataRows = rows.map(r => `<Row>${headers.map(h => h === 'Valor (R$)' || h === 'KM' ? nCell(r[h]) : sCell(r[h])).join('')}</Row>`).join('');

  // Summary sheet
  const plateMap = {};
  filtered.forEach(r => {
    const p = r.plate || 'Sem placa';
    if (!plateMap[p]) plateMap[p] = { plate: p, fuel: 0, maint: 0, op: 0, total: 0, count: 0 };
    const val = r.total_value || 0;
    plateMap[p].total += val; plateMap[p].count++;
    if (r._type === 'Abastecimento') plateMap[p].fuel += val;
    else if (r._type === 'Manutenção') plateMap[p].maint += val;
    else if (r._type === 'Operacional') plateMap[p].op += val;
  });
  const plates = Object.values(plateMap).sort((a, b) => b.total - a.total);
  const gt = plates.reduce((s, p) => s + p.total, 0);
  const sumHeaders = ['Placa', 'Lançamentos', 'Abastecimento (R$)', 'Manutenção (R$)', 'Operacional (R$)', 'Total (R$)', '% do Total'];
  const sumRows = plates.map(p => `<Row>${[
    sCell(p.plate), nCell(p.count), nCell(p.fuel), nCell(p.maint), nCell(p.op), nCell(p.total),
    sCell(gt > 0 ? ((p.total / gt) * 100).toFixed(2) + '%' : '0%')
  ].join('')}</Row>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="h"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1D4ED8" ss:Pattern="Solid"/></Style>
  </Styles>
  <Worksheet ss:Name="Lançamentos"><Table>${headerRow}${dataRows}</Table></Worksheet>
  <Worksheet ss:Name="Resumo por Placa"><Table><Row>${sumHeaders.map(hCell).join('')}</Row>${sumRows}</Table></Worksheet>
</Workbook>`;

  downloadBlob(new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' }), `${filename}.xlsx`);
}

function exportCSV(filtered, filename) {
  const rows = getRows(filtered);
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))];
  downloadBlob(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`);
}

function exportTXT(filtered, filename) {
  const rows = getRows(filtered);
  const headers = Object.keys(rows[0] || {});
  const widths = headers.map(h => Math.max(h.length, ...rows.map(r => String(r[h] ?? '').length)));
  const pad = (v, w) => String(v ?? '').padEnd(w);
  const sep = widths.map(w => '-'.repeat(w)).join('-+-');
  const header = headers.map((h, i) => pad(h, widths[i])).join(' | ');
  const dataRows = rows.map(r => headers.map((h, i) => pad(r[h], widths[i])).join(' | '));
  const grandTotal = filtered.reduce((s, r) => s + (r.total_value || 0), 0);
  const content = [
    'RELATÓRIO GERAL DE CUSTOS',
    `Emitido em: ${new Date().toLocaleString('pt-BR')}`,
    `Total de registros: ${filtered.length}`,
    `Total geral: ${fmt(grandTotal)}`,
    '', sep, header, sep, ...dataRows, sep,
  ].join('\n');
  downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), `${filename}.txt`);
}

function exportMD(filtered, filename) {
  const rows = getRows(filtered);
  const headers = Object.keys(rows[0] || {});
  const grandTotal = filtered.reduce((s, r) => s + (r.total_value || 0), 0);
  const header = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataRows = rows.map(r => `| ${headers.map(h => String(r[h] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`);
  const content = [
    '# Relatório Geral de Custos',
    `> Emitido em: ${new Date().toLocaleString('pt-BR')}  `,
    `> Total de registros: **${filtered.length}**  `,
    `> Total geral: **${fmt(grandTotal)}**`,
    '', '## Lançamentos', '', header, sep, ...dataRows,
  ].join('\n');
  downloadBlob(new Blob([content], { type: 'text/markdown;charset=utf-8' }), `${filename}.md`);
}

function exportODS(filtered, filename) {
  const rows = getRows(filtered);
  const headers = Object.keys(rows[0] || {});
  const escape = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const hRow = `<table:table-row>${headers.map(h => `<table:table-cell office:value-type="string" calcext:value-type="string"><text:p>${escape(h)}</text:p></table:table-cell>`).join('')}</table:table-row>`;
  const dRows = rows.map(r => `<table:table-row>${headers.map(h => {
    const v = r[h];
    const isNum = (h === 'Valor (R$)' || h === 'KM') && v !== '';
    return isNum
      ? `<table:table-cell office:value-type="float" office:value="${Number(v) || 0}"><text:p>${Number(v) || 0}</text:p></table:table-cell>`
      : `<table:table-cell office:value-type="string" calcext:value-type="string"><text:p>${escape(v)}</text:p></table:table-cell>`;
  }).join('')}</table:table-row>`).join('');

  const ods = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0"
  xmlns:office2="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.2">
  <office:body><office:spreadsheet>
    <table:table table:name="Lançamentos">
      ${hRow}${dRows}
    </table:table>
  </office:spreadsheet></office:body>
</office:document-content>`;

  downloadBlob(new Blob([ods], { type: 'application/vnd.oasis.opendocument.spreadsheet;charset=utf-8' }), `${filename}.ods`);
}

function exportHTML(filtered, filename) {
  const rows = getRows(filtered);
  const headers = Object.keys(rows[0] || {});
  const grandTotal = filtered.reduce((s, r) => s + (r.total_value || 0), 0);
  const escape = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const thRow = headers.map(h => `<th style="background:#1D4ED8;color:#fff;padding:6px 10px;text-align:left;white-space:nowrap">${escape(h)}</th>`).join('');
  const tdRows = rows.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">${headers.map(h => `<td style="padding:5px 10px;border-bottom:1px solid #e2e8f0">${escape(r[h])}</td>`).join('')}</tr>`).join('');
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Custos</title></head><body style="font-family:Arial,sans-serif;margin:20px">
<h2 style="color:#1D4ED8">Relatório Geral de Custos</h2>
<p>Emitido em: ${new Date().toLocaleString('pt-BR')} | Registros: ${filtered.length} | Total: <strong>${fmt(grandTotal)}</strong></p>
<table style="border-collapse:collapse;width:100%;font-size:12px"><thead><tr>${thRow}</tr></thead><tbody>${tdRows}</tbody></table>
</body></html>`;
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${filename}.html`);
}

function exportJSON(filtered, filename) {
  const rows = getRows(filtered);
  const grandTotal = filtered.reduce((s, r) => s + (r.total_value || 0), 0);
  const payload = {
    meta: { emitido_em: new Date().toISOString(), total_registros: filtered.length, total_geral: grandTotal },
    lancamentos: rows,
  };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }), `${filename}.json`);
}

function exportPDF(filtered, filename) {
  const rows = getRows(filtered);
  const headers = Object.keys(rows[0] || {});
  const grandTotal = filtered.reduce((s, r) => s + (r.total_value || 0), 0);
  const escape = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const thRow = headers.map(h => `<th>${escape(h)}</th>`).join('');
  const tdRows = rows.map((r, i) => `<tr class="${i % 2 === 0 ? '' : 'alt'}">${headers.map(h => `<td>${escape(r[h])}</td>`).join('')}</tr>`).join('');
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório</title>
<style>
  body{font-family:Arial,sans-serif;margin:20px;font-size:10px}
  h2{color:#1D4ED8;margin-bottom:4px}
  p{margin:0 0 10px;color:#475569}
  table{border-collapse:collapse;width:100%}
  th{background:#1D4ED8;color:#fff;padding:4px 6px;text-align:left;font-size:9px}
  td{padding:3px 6px;border-bottom:1px solid #e2e8f0;font-size:9px}
  tr.alt{background:#f8fafc}
  @media print{body{margin:10px}}
</style></head><body>
<h2>Relatório Geral de Custos</h2>
<p>Emitido em: ${new Date().toLocaleString('pt-BR')} | Registros: ${filtered.length} | Total: ${fmt(grandTotal)}</p>
<table><thead><tr>${thRow}</tr></thead><tbody>${tdRows}</tbody></table>
</body></html>`;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}

// ---- Modal Component ----

export default function ExportModal({ open, onClose, filtered }) {
  const [selected, setSelected] = useState('xlsx');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleExport = async () => {
    if (!filtered || filtered.length === 0) return;
    setLoading(true);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `relatorio_custos_${date}`;
    try {
      switch (selected) {
        case 'xlsx': exportXLSX(filtered, filename); break;
        case 'csv': exportCSV(filtered, filename); break;
        case 'pdf': exportPDF(filtered, filename); break;
        case 'txt': exportTXT(filtered, filename); break;
        case 'md': exportMD(filtered, filename); break;
        case 'ods': exportODS(filtered, filename); break;
        case 'html': exportHTML(filtered, filename); break;
        case 'json': exportJSON(filtered, filename); break;
        default: break;
      }
    } finally {
      setTimeout(() => { setLoading(false); onClose(); }, 300);
    }
  };

  const grandTotal = filtered.reduce((s, r) => s + (r.total_value || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base">Exportar Dados</h2>
            <p className="text-blue-100 text-xs mt-0.5">{filtered.length.toLocaleString('pt-BR')} registros · {fmt(grandTotal)}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formats */}
        <div className="p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Selecione o formato</p>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => setSelected(f.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${selected === f.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
              >
                <span className="text-xl">{f.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{f.label}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${f.color}`}>{f.ext}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{f.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <p className="text-[10px] text-slate-400">
            ✓ Compatível com Microsoft Office, LibreOffice e Google Workspace
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={loading || filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              EXPORTAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}