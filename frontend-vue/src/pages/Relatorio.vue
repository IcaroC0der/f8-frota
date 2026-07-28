<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { FileText, FileSpreadsheet, FileDown, Printer } from "lucide-vue-next";
import { fuelRecords, maintenanceRecords, operationalCostRecords, vehicles } from "@/services/api";
import { formatBRL, formatDate, formatBRLk } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader.vue";
import FilterBar from "@/components/ui/FilterBar.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import Spinner from "@/components/ui/Spinner.vue";
import StatCard from "@/components/ui/StatCard.vue";
import { exportRelatorioPDF, exportRelatorioExcel } from "@/lib/exportRelatorio";

interface Row {
  date: string; module: string; plate: string; _cat: string;
  description: string; supplier: string; total_value: number;
  // Campos extras usados pelos gráficos da Análise Executiva (não aparecem na tabela).
  cost_type?: string; cost_group?: string; classification?: string; cost_name?: string; quantity?: number;
}

const loading = ref(true);
const rows = ref<Row[]>([]);
const vehiclesList = ref<any[]>([]);

const fFrom = ref("");
const fTo = ref("");
const fModule = ref("all");
const fCat = ref("");
const fSupplier = ref("");
const fClass = ref("");
const fPlate = ref("");
// Comparação de períodos (Período B).
const compareOn = ref(false);
const fFrom2 = ref("");
const fTo2 = ref("");

function periodLabel(from: string, to: string) {
  if (from && to) return `${formatDate(from)} — ${formatDate(to)}`;
  if (from) return `A partir de ${formatDate(from)}`;
  if (to) return `Até ${formatDate(to)}`;
  return "Todo o período";
}

onMounted(async () => {
  try {
    const [fuel, maint, oper, vehs] = await Promise.all([
      fuelRecords.list({ limit: 5000 }),
      maintenanceRecords.list({ limit: 5000 }),
      operationalCostRecords.list({ limit: 5000 }),
      vehicles.list(),
    ]);
    vehiclesList.value = vehs;
    const catOf = (p: string) => vehs.find((v: any) => v.plate === p)?.category_name || "Sem Categoria";

    rows.value = [
      ...fuel.map((r: any) => ({ date: r.date, module: "Abastecimento", plate: r.plate ?? "", _cat: catOf(r.plate), description: r.cost_type, supplier: r.supplier ?? "", total_value: Number(r.total_value || 0), cost_type: r.cost_type, quantity: Number(r.quantity || 0) })),
      ...maint.map((r: any) => ({ date: r.date, module: "Manutenção", plate: r.plate ?? "", _cat: catOf(r.plate), description: `${r.classification} / ${r.cost_type}`, supplier: r.supplier ?? "", total_value: Number(r.total_value || 0), classification: r.classification, cost_group: r.cost_group, cost_type: r.cost_type })),
      ...oper.map((r: any) => ({ date: r.date, module: "Operacional", plate: r.plate ?? "", _cat: catOf(r.plate), description: r.cost_name, supplier: r.supplier ?? "", total_value: Number(r.total_value || 0), cost_name: r.cost_name })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));
  } finally {
    loading.value = false;
  }
});

// Filtros que NÃO dependem de data (reaproveitados pelos dois períodos).
function matchesBase(r: Row) {
  if (fModule.value !== "all" && r.module !== fModule.value) return false;
  if (fPlate.value && r.plate !== fPlate.value) return false;
  if (fCat.value && r._cat !== fCat.value) return false;
  if (fSupplier.value && r.supplier !== fSupplier.value) return false;
  if (fClass.value && r.description !== fClass.value) return false;
  return true;
}
const inRange = (d: string, from: string, to: string) => (!from || d >= from) && (!to || d <= to);

const filtered = computed(() =>
  rows.value.filter((r) => matchesBase(r) && inRange(r.date, fFrom.value, fTo.value)),
);
const filteredB = computed(() =>
  rows.value.filter((r) => matchesBase(r) && inRange(r.date, fFrom2.value, fTo2.value)),
);
const totalsB = computed(() => {
  let total = 0, fuel = 0, maint = 0, oper = 0;
  for (const r of filteredB.value) {
    total += r.total_value;
    if (r.module === "Abastecimento") fuel += r.total_value;
    else if (r.module === "Manutenção") maint += r.total_value;
    else if (r.module === "Operacional") oper += r.total_value;
  }
  return { total, fuel, maint, oper, count: filteredB.value.length };
});
const compareActive = computed(() => compareOn.value && !!(fFrom2.value || fTo2.value));

const uniq = (arr: any[]) => [...new Set(arr.filter(Boolean))].sort() as string[];
const platesOptions = computed(() => uniq(rows.value.map(r => r.plate)));
const catsOptions = computed(() => uniq(vehiclesList.value.map(v => v.category_name)));
const supplierOptions = computed(() => uniq(rows.value.map(r => r.supplier)));
const classOptions = computed(() => uniq(rows.value.map(r => r.description)));

const totals = computed(() => {
  const f = filtered.value;
  let total = 0, fuel = 0, maint = 0, oper = 0;
  const months = new Set();
  for (const r of f) {
    total += r.total_value;
    if (r.module === "Abastecimento") fuel += r.total_value;
    else if (r.module === "Manutenção") maint += r.total_value;
    else if (r.module === "Operacional") oper += r.total_value;
    if (r.date) months.add(r.date.slice(0, 7));
  }
  return {
    total, fuel, maint, oper,
    count: f.length,
    monthlyAvg: months.size > 0 ? total / months.size : 0,
    monthsCount: months.size
  };
});

function getExportData() {
  const monthlyAcc: any = {};
  const plateAcc: any = {};
  
  for (const r of filtered.value) {
    if (r.date) {
      const m = r.date.slice(0, 7);
      if (!monthlyAcc[m]) monthlyAcc[m] = { mes: m, abastecimento: 0, manutencao: 0, operacional: 0, total: 0 };
      monthlyAcc[m].total += r.total_value;
      if (r.module === "Abastecimento") monthlyAcc[m].abastecimento += r.total_value;
      if (r.module === "Manutenção") monthlyAcc[m].manutencao += r.total_value;
      if (r.module === "Operacional") monthlyAcc[m].operacional += r.total_value;
    }
    if (r.plate) {
      const p = r.plate;
      if (!plateAcc[p]) plateAcc[p] = { placa: p, lanctos: 0, abastecimento: 0, manutencao: 0, operacional: 0, total: 0 };
      plateAcc[p].lanctos++;
      plateAcc[p].total += r.total_value;
      if (r.module === "Abastecimento") plateAcc[p].abastecimento += r.total_value;
      if (r.module === "Manutenção") plateAcc[p].manutencao += r.total_value;
      if (r.module === "Operacional") plateAcc[p].operacional += r.total_value;
    }
  }

  const filtersText = Object.entries({
    "De": fFrom.value ? formatDate(fFrom.value) : "", 
    "Até": fTo.value ? formatDate(fTo.value) : "", 
    "Módulo": fModule.value !== "all" ? fModule.value : "",
    "Categoria": fCat.value, "Fornecedor": fSupplier.value,
    "Classificação": fClass.value, "Placa": fPlate.value
  }).filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" | ") || "Nenhum filtro aplicado — exibindo todos os registros";

  const compare = compareActive.value
    ? { labelA: periodLabel(fFrom.value, fTo.value), labelB: periodLabel(fFrom2.value, fTo2.value), totalsB: totalsB.value }
    : undefined;

  return {
    rows: filtered.value,
    filtersText,
    totals: totals.value,
    monthly: Object.values(monthlyAcc).sort((a: any, b: any) => a.mes.localeCompare(b.mes)),
    byPlate: Object.values(plateAcc).sort((a: any, b: any) => b.total - a.total),
    compare,
  };
}

function handleExportPDF() {
  exportRelatorioPDF(getExportData());
}
// function handleExportAnalisePDF() {
//   exportAnalisePDF(getExportData());
// }
function handleExportExcel() {
  exportRelatorioExcel(getExportData());
}
function handlePrint() {
  window.print();
}

function clearFilters() {
  fModule.value = "all";
  fFrom.value = ""; fTo.value = "";
  fCat.value = ""; fSupplier.value = ""; fClass.value = ""; fPlate.value = "";
  compareOn.value = false; fFrom2.value = ""; fTo2.value = "";
}

const moduleTone: Record<string, string> = {
  "Abastecimento": "bg-warning/10 text-warning border-warning/20",
  "Manutenção": "bg-destructive/10 text-destructive border-destructive/20",
  "Operacional": "bg-success/10 text-success border-success/20",
};
</script>

<template>
  <div class="w-full p-6 md:p-10 print:p-0">
    <PageHeader title="Relatório Geral de Custos" subtitle="VISÃO CONSOLIDADA · TODOS OS MÓDULOS" :icon="FileText">
      <template #actions>
        <div class="flex gap-2 print:hidden">
          <Button variant="outline" @click="handlePrint"><Printer class="h-4 w-4" /> Imprimir</Button>
          <Button variant="outline" @click="handleExportExcel"><FileSpreadsheet class="h-4 w-4" /> Exportar Planilha</Button>
          <Button variant="outline" @click="handleExportPDF"><FileDown class="h-4 w-4" /> Relatório Completo</Button>
          <!-- <Button @click="handleExportAnalisePDF"><FileDown class="h-4 w-4" /> Análise Executiva</Button> -->
        </div>
      </template>
    </PageHeader>

    <div class="mb-5 print:hidden">
      <FilterBar :has-active="false" :delay="0" @clear="clearFilters">
        <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground uppercase">Período — De</span><input v-model="fFrom" type="date" class="ui-input" /></label>
        <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground uppercase">Período — Até</span><input v-model="fTo" type="date" class="ui-input" /></label>
        <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground uppercase">Tipo de Custo</span>
          <select v-model="fModule" class="ui-input"><option value="all">Todos</option><option>Abastecimento</option><option>Manutenção</option><option>Operacional</option></select>
        </label>
        <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground uppercase">Categoria</span>
          <select v-model="fCat" class="ui-input"><option value="">Todas</option><option v-for="c in catsOptions" :key="c" :value="c">{{ c }}</option></select>
        </label>
        <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground uppercase">Fornecedor</span>
          <select v-model="fSupplier" class="ui-input"><option value="">Todos</option><option v-for="s in supplierOptions" :key="s" :value="s">{{ s }}</option></select>
        </label>
        <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground uppercase">Custo / Classificação</span>
          <select v-model="fClass" class="ui-input"><option value="">Todos</option><option v-for="c in classOptions" :key="c" :value="c">{{ c }}</option></select>
        </label>
        <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground uppercase">Placa(s)</span>
          <select v-model="fPlate" class="ui-input"><option value="">Todas as placas</option><option v-for="p in platesOptions" :key="p" :value="p">{{ p }}</option></select>
        </label>
      </FilterBar>

      <!-- Comparar períodos -->
      <div class="mt-3 rounded-xl border bg-card p-3 shadow-card">
        <label class="flex cursor-pointer items-center gap-2">
          <input v-model="compareOn" type="checkbox" class="h-4 w-4 accent-primary" />
          <span class="text-sm font-semibold text-foreground">Comparar com outro período</span>
          <span class="text-xs text-muted-foreground">— adiciona um comparativo A × B aos relatórios exportados</span>
        </label>
        <div v-if="compareOn" class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-lg bg-muted/40 p-2.5">
            <p class="mb-0.5 text-xs font-bold uppercase text-primary-hover">Período A (principal)</p>
            <p class="text-xs text-muted-foreground">{{ periodLabel(fFrom, fTo) }} · {{ totals.count }} reg.</p>
          </div>
          <label class="block"><span class="mb-1 block text-xs font-medium uppercase text-muted-foreground">Período B — De</span><input v-model="fFrom2" type="date" class="ui-input" /></label>
          <label class="block"><span class="mb-1 block text-xs font-medium uppercase text-muted-foreground">Período B — Até</span><input v-model="fTo2" type="date" class="ui-input" /></label>
          <div class="flex items-end"><p class="text-xs text-muted-foreground">Período B: <span class="font-semibold text-foreground">{{ periodLabel(fFrom2, fTo2) }}</span> · {{ totalsB.count }} reg.</p></div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="CUSTO TOTAL" :value="formatBRLk(totals.total)" :sub="`100.0% do total geral`" tone="bg-primary/10 text-primary-hover" highlight />
        <StatCard label="MÉDIA MENSAL" :value="formatBRLk(totals.monthlyAvg)" :sub="`${totals.monthsCount} meses`" tone="bg-info/10 text-info" />
        <StatCard label="TOTAL REGISTROS" :value="String(totals.count)" sub="lançamentos" tone="bg-accent/10 text-accent" />
        <StatCard label="ABASTECIMENTO" :value="formatBRLk(totals.fuel)" :sub="`${totals.total ? ((totals.fuel/totals.total)*100).toFixed(1) : 0}% do total`" tone="bg-warning/10 text-warning" />
        <StatCard label="MANUTENÇÃO" :value="formatBRLk(totals.maint)" :sub="`${totals.total ? ((totals.maint/totals.total)*100).toFixed(1) : 0}% do total`" tone="bg-destructive/10 text-destructive" />
        <StatCard label="OPERACIONAL" :value="formatBRLk(totals.oper)" :sub="`${totals.total ? ((totals.oper/totals.total)*100).toFixed(1) : 0}% do total`" tone="bg-success/10 text-success" />
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><Spinner /></div>
    <div v-else class="a-in overflow-hidden rounded-xl border bg-card shadow-card print:shadow-none print:border-0" style="animation-delay: 0.15s">
      <div class="max-h-[60vh] overflow-auto print:max-h-none print:overflow-visible">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-muted/80 backdrop-blur print:bg-transparent">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Data</th>
              <th class="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Módulo</th>
              <th class="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Placa</th>
              <th class="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Descrição</th>
              <th class="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Fornecedor</th>
              <th class="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in filtered" :key="i" class="border-b hover:bg-muted/30 print:border-b-gray-200">
              <td class="whitespace-nowrap px-4 py-2">{{ formatDate(r.date) }}</td>
              <td class="px-4 py-2"><Badge :tone="moduleTone[r.module]">{{ r.module }}</Badge></td>
              <td class="px-4 py-2 font-medium">{{ r.plate || "—" }}</td>
              <td class="px-4 py-2 text-muted-foreground">{{ r.description }}</td>
              <td class="px-4 py-2 text-muted-foreground">{{ r.supplier || "—" }}</td>
              <td class="px-4 py-2 text-right font-semibold">{{ formatBRL(r.total_value) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
