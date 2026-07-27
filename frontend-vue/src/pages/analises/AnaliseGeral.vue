<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { DollarSign, TrendingUp, BarChart3, Fuel, Wrench, Coins, Truck, ArrowLeft, X, ChevronRight, Layers } from "lucide-vue-next";
import { Doughnut, Bar, Line } from "vue-chartjs";
import { formatBRL, formatBRLk } from "@/lib/utils";
import { palette, moduleColors, seriesColors, baseOptions, brlTick } from "@/lib/charts";
import StatCard from "@/components/ui/StatCard.vue";
import ChartCard from "@/components/ui/ChartCard.vue";
import ChartLegend from "@/components/ui/ChartLegend.vue";
import FilterBar from "@/components/ui/FilterBar.vue";

const props = defineProps<{ fuel: any[]; maint: any[]; oper: any[]; vehicles: any[] }>();

const vehByPlate = computed(() => {
  const m: Record<string, any> = {};
  for (const v of props.vehicles) if (v.plate) m[v.plate] = v;
  return m;
});
const catOf = (r: any) => vehByPlate.value[r.plate]?.category_name || r.category_name || "Sem Categoria";
const modelOf = (plate: string) => vehByPlate.value[plate]?.vehicle_model || "";
const val = (r: any) => Number(r.total_value || 0);

const allRecords = computed(() => [
  ...props.fuel.map((r) => ({ ...r, _mod: "Abastecimento", _cat: catOf(r) })),
  ...props.maint.map((r) => ({ ...r, _mod: "Manutenção", _cat: catOf(r) })),
  ...props.oper.map((r) => ({ ...r, _mod: "Operacional", _cat: catOf(r) })),
]);

const filters = reactive({ category: "", from: "", to: "" });
const hasActive = computed(() => Object.values(filters).some(Boolean));
function clearAll() { filters.category = filters.from = filters.to = ""; }
const catOptions = computed(() => [...new Set(allRecords.value.map((r) => r._cat))].sort());
const filtered = computed(() =>
  allRecords.value.filter((r) => {
    const d = r.date ?? "";
    if (filters.from && d < filters.from) return false;
    if (filters.to && d > filters.to) return false;
    if (filters.category && r._cat !== filters.category) return false;
    return true;
  }),
);

const totalCost = computed(() => filtered.value.reduce((s, r) => s + val(r), 0));
const modRows = (mod: string) => filtered.value.filter((r) => r._mod === mod);
const modTotal = (mod: string) => modRows(mod).reduce((s, r) => s + val(r), 0);

const kpis = computed(() => {
  const rows = filtered.value;
  const months = new Set(rows.map((r) => r.date?.slice(0, 7)).filter(Boolean)).size;
  const pct = (v: number) => (totalCost.value > 0 ? `${((v / totalCost.value) * 100).toFixed(1)}% do total` : "—");
  return [
    { label: "Custo Total", value: formatBRLk(totalCost.value), sub: "consolidado", icon: DollarSign, tone: "bg-primary/15 text-primary-hover", highlight: true },
    { label: "Média Mensal", value: formatBRLk(months ? totalCost.value / months : 0), sub: `${months} meses`, icon: TrendingUp, tone: "bg-accent/10 text-accent" },
    { label: "Total Registros", value: rows.length.toLocaleString("pt-BR"), sub: "lançamentos", icon: BarChart3, tone: "bg-info/10 text-info" },
    { label: "Abastecimento", value: formatBRLk(modTotal("Abastecimento")), sub: pct(modTotal("Abastecimento")), icon: Fuel, tone: "bg-warning/10 text-warning" },
    { label: "Manutenção", value: formatBRLk(modTotal("Manutenção")), sub: pct(modTotal("Manutenção")), icon: Wrench, tone: "bg-destructive/10 text-destructive" },
    { label: "Operacional", value: formatBRLk(modTotal("Operacional")), sub: pct(modTotal("Operacional")), icon: Coins, tone: "bg-success/10 text-success" },
  ];
});

/* ---- Seletor Top N reutilizável (ranking generalizado) ---- */
const topNOptions = [5, 10, "Todos"] as const;
type TopN = (typeof topNOptions)[number];
const applyTopN = <T,>(list: T[], n: TopN) => (n === "Todos" ? list : list.slice(0, n));

/* ---- Evolução de Custos (mensal/anual) ---- */
const evoPeriod = ref<"mensal" | "anual">("mensal");
const evolution = computed(() => {
  const bucket = (d: string) => (evoPeriod.value === "anual" ? d.slice(0, 4) : d.slice(0, 7));
  const label = (k: string) => { if (evoPeriod.value === "anual") return k; const [y, m] = k.split("-"); return `${m}/${y.slice(2)}`; };
  const keys = [...new Set(filtered.value.map((r) => bucket(r.date ?? "")).filter(Boolean))].sort();
  const series = (mod: string) => keys.map((k) => modRows(mod).filter((r) => bucket(r.date ?? "") === k).reduce((s, r) => s + val(r), 0));
  const area = (c: string, a: string) => ({ borderColor: c, backgroundColor: a, fill: true, tension: 0.35, pointRadius: 0, pointHitRadius: 12, borderWidth: 2 });
  return {
    labels: keys.map(label),
    datasets: [
      { label: "Abastecimento", data: series("Abastecimento"), ...area(palette.warning, "rgba(245,158,11,0.10)") },
      { label: "Manutenção", data: series("Manutenção"), ...area(palette.destructive, "rgba(239,68,68,0.10)") },
      { label: "Operacional", data: series("Operacional"), ...area(palette.success, "rgba(34,197,94,0.10)") },
    ],
  };
});
const evoOptions = {
  ...baseOptions, interaction: { mode: "index" as const, intersect: false },
  scales: { x: { grid: { display: false } }, y: { ticks: { callback: brlTick } } },
};

/* ---- Composição por módulo (donut + legenda) ---- */
const composition = computed(() => ({
  labels: ["Abastecimento", "Manutenção", "Operacional"],
  datasets: [{ data: [modTotal("Abastecimento"), modTotal("Manutenção"), modTotal("Operacional")], backgroundColor: moduleColors, borderWidth: 0, spacing: 3 }],
}));
const compositionLegend = computed(() => [
  { label: "Abastecimento", value: modTotal("Abastecimento"), color: moduleColors[0] },
  { label: "Manutenção", value: modTotal("Manutenção"), color: moduleColors[1] },
  { label: "Operacional", value: modTotal("Operacional"), color: moduleColors[2] },
]);
const compositionOptions = { ...baseOptions, cutout: "68%", plugins: { legend: { display: false } } };

/* ---- Manutenção por grupo (Top N + clique → modal por tipo de custo) ---- */
const groupTopN = ref<TopN>("Todos");
const maintGroupEntries = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of modRows("Manutenção")) acc[r.cost_group || "Outros"] = (acc[r.cost_group || "Outros"] || 0) + val(r);
  return Object.entries(acc).sort((a, b) => b[1] - a[1]);
});
const maintByGroup = computed(() => {
  const e = applyTopN(maintGroupEntries.value, groupTopN.value);
  return {
    labels: e.map((x) => x[0]),
    datasets: [{
      data: e.map((x) => x[1]),
      backgroundColor: e.map((_, i) => seriesColors[i % seriesColors.length]),
      borderRadius: 6, maxBarThickness: 96, barPercentage: 0.92, categoryPercentage: 0.86,
    }],
  };
});
const selectedGroup = ref<string | null>(null);
const groupBreakdown = computed(() => {
  if (!selectedGroup.value) return { rows: [] as any[], total: 0, qty: 0 };
  const mine = modRows("Manutenção").filter((r) => (r.cost_group || "Outros") === selectedGroup.value);
  const acc: Record<string, { qty: number; total: number }> = {};
  for (const r of mine) { const k = r.cost_type || "Outros"; const b = (acc[k] ??= { qty: 0, total: 0 }); b.qty++; b.total += val(r); }
  const total = mine.reduce((s, r) => s + val(r), 0);
  const rows = Object.entries(acc)
    .map(([label, v], i) => ({ label, ...v, color: seriesColors[i % seriesColors.length], pct: total > 0 ? (v.total / total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);
  return { rows, total, qty: mine.length };
});
const maintGroupOptions = {
  ...baseOptions,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false } }, y: { ticks: { callback: brlTick } } },
  onClick: (_e: any, els: any[]) => { if (els.length) selectedGroup.value = (maintByGroup.value.labels[els[0].index] as string) ?? null; },
  onHover: (e: any, els: any[]) => { const t = e?.native?.target; if (t) t.style.cursor = els.length ? "pointer" : "default"; },
};

/* ---- Custos por veículo (Top N + lista + modal drill-down) ---- */
const vehTopN = ref<TopN>(10);
const topVehicles = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of filtered.value) { if (!r.plate || r.plate === "00000") continue; acc[r.plate] = (acc[r.plate] || 0) + val(r); }
  const list = Object.entries(acc).map(([plate, total]) => ({ plate, total, model: modelOf(plate) })).sort((a, b) => b.total - a.total);
  const max = list[0]?.total || 1;
  return applyTopN(list, vehTopN.value).map((v, i) => ({ ...v, rank: i + 1, pct: (v.total / max) * 100 }));
});

const selectedVehicle = ref<string | null>(null);
const vehRecords = computed(() => filtered.value.filter((r) => r.plate === selectedVehicle.value));
const vehTotal = computed(() => vehRecords.value.reduce((s, r) => s + val(r), 0));
const vehModuleChart = computed(() => {
  const t = (mod: string) => vehRecords.value.filter((r) => r._mod === mod).reduce((s, r) => s + val(r), 0);
  return { labels: ["Abastecimento", "Manutenção", "Operacional"], datasets: [{ data: [t("Abastecimento"), t("Manutenção"), t("Operacional")], backgroundColor: moduleColors, borderRadius: 6, maxBarThickness: 64 }] };
});
const vehModuleOptions = { ...baseOptions, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: brlTick } } } };
const vehModulesDef = [
  { key: "Abastecimento", icon: Fuel, tone: "bg-warning/10 text-warning", bar: palette.warning, groupKey: "cost_type" },
  { key: "Manutenção", icon: Wrench, tone: "bg-destructive/10 text-destructive", bar: palette.destructive, groupKey: "cost_type" },
  { key: "Operacional", icon: Coins, tone: "bg-success/10 text-success", bar: palette.success, groupKey: "cost_name" },
];
const vehBreakdown = computed(() =>
  vehModulesDef
    .map((m) => {
      const mine = vehRecords.value.filter((r) => r._mod === m.key);
      const acc: Record<string, number> = {};
      for (const r of mine) acc[(r as any)[m.groupKey] || "Outros"] = (acc[(r as any)[m.groupKey] || "Outros"] || 0) + val(r);
      const items = Object.entries(acc).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
      const total = items.reduce((s, i) => s + i.value, 0);
      return { ...m, items, total, max: items[0]?.value || 1 };
    })
    .filter((m) => m.total > 0),
);

/* ---- Custos por categoria (donut + tabela + modal drill-down por placa) ---- */
const catEntries = computed(() => {
  const acc: Record<string, { qty: number; cost: number }> = {};
  for (const r of filtered.value) { const b = (acc[r._cat] ??= { qty: 0, cost: 0 }); b.qty++; b.cost += val(r); }
  return Object.entries(acc).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.cost - a.cost);
});
const catDonut = computed(() => ({
  labels: catEntries.value.map((e) => e.name),
  datasets: [{ data: catEntries.value.map((e) => e.cost), backgroundColor: catEntries.value.map((_, i) => seriesColors[i % seriesColors.length]), borderWidth: 0 }],
}));
const pctOf = (v: number) => (totalCost.value > 0 ? ((v / totalCost.value) * 100).toFixed(1) : "0.0");

const selectedCatDetail = ref<string | null>(null);
const catDetail = computed(() => {
  if (!selectedCatDetail.value) return { plates: [] as any[], total: 0 };
  const mine = filtered.value.filter((r) => r._cat === selectedCatDetail.value);
  const map: Record<string, any> = {};
  for (const r of mine) {
    const key = r.plate || "— (sem placa)";
    const p = (map[key] ??= { plate: key, model: modelOf(r.plate), Abastecimento: 0, Manutenção: 0, Operacional: 0, total: 0 });
    p[r._mod] += val(r); p.total += val(r);
  }
  const plates = Object.values(map).sort((a: any, b: any) => b.total - a.total);
  return { plates, total: mine.reduce((s, r) => s + val(r), 0) };
});
const catDetailChart = computed(() => {
  const plates = catDetail.value.plates.slice(0, 12);
  const seg = (mod: string, color: string) => ({ label: mod, data: plates.map((p: any) => p[mod]), backgroundColor: color, borderRadius: 4, stack: "s", maxBarThickness: 34 });
  return {
    labels: plates.map((p: any) => p.plate),
    datasets: [
      seg("Abastecimento", moduleColors[0]),
      seg("Manutenção", moduleColors[1]),
      seg("Operacional", moduleColors[2]),
    ],
  };
});
const catDetailOptions = {
  ...baseOptions, indexAxis: "y" as const,
  plugins: { legend: { position: "bottom" as const, labels: { usePointStyle: true, boxWidth: 8, padding: 16 } } },
  scales: { x: { stacked: true, ticks: { callback: brlTick }, grid: { display: false } }, y: { stacked: true, grid: { display: false } } },
};
const catDonutOptions = {
  ...baseOptions, cutout: "62%", plugins: { legend: { display: false } },
  onClick: (_e: any, els: any[]) => { if (els.length) selectedCatDetail.value = (catDonut.value.labels[els[0].index] as string) ?? null; },
  onHover: (e: any, els: any[]) => { const t = e?.native?.target; if (t) t.style.cursor = els.length ? "pointer" : "default"; },
};

/* ---- Custos operacionais (barra horizontal) ---- */
const opByName = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of modRows("Operacional")) acc[r.cost_name || "Outros"] = (acc[r.cost_name || "Outros"] || 0) + val(r);
  const e = Object.entries(acc).sort((a, b) => b[1] - a[1]);
  return { labels: e.map((x) => x[0]), datasets: [{ data: e.map((x) => x[1]), backgroundColor: e.map((_, i) => seriesColors[i % seriesColors.length]), borderRadius: 5 }] };
});
const hBarOptions = { ...baseOptions, indexAxis: "y" as const, plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: brlTick }, grid: { display: false } }, y: { grid: { display: false } } } };

/* ---- Comparativo: 2 meses mais recentes por módulo ---- */
const comparison = computed(() => {
  const months = [...new Set(filtered.value.map((r) => r.date?.slice(0, 7)).filter(Boolean))].sort() as string[];
  const cur = months[months.length - 1], prev = months[months.length - 2];
  const totFor = (m: string | undefined, mod: string) => (m ? modRows(mod).filter((r) => r.date?.slice(0, 7) === m).reduce((s, r) => s + val(r), 0) : 0);
  const mods = ["Abastecimento", "Manutenção", "Operacional"];
  const lbl = (m?: string) => { if (!m) return "—"; const [y, mo] = m.split("-"); return `${mo}/${y.slice(2)}`; };
  return {
    labels: mods, prevLabel: lbl(prev), curLabel: lbl(cur),
    datasets: [
      { label: `Anterior (${lbl(prev)})`, data: mods.map((m) => totFor(prev, m)), backgroundColor: palette.slate, borderRadius: 5 },
      { label: `Atual (${lbl(cur)})`, data: mods.map((m) => totFor(cur, m)), backgroundColor: palette.primary, borderRadius: 5 },
    ],
  };
});
const compData = computed(() => ({ labels: comparison.value.labels, datasets: comparison.value.datasets }));
const compOptions = { ...baseOptions, plugins: { legend: { position: "bottom" as const, labels: { usePointStyle: true, boxWidth: 8, padding: 16 } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: brlTick } } } };
</script>

<template>
  <div class="space-y-5">
    <FilterBar :has-active="hasActive" @clear="clearAll">
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Categoria</span>
        <select v-model="filters.category" class="ui-input"><option value="">Todas</option><option v-for="c in catOptions" :key="c" :value="c">{{ c }}</option></select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">De</span><input v-model="filters.from" type="date" class="ui-input" /></label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Até</span><input v-model="filters.to" type="date" class="ui-input" /></label>
    </FilterBar>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard v-for="(k, i) in kpis" :key="k.label" :label="k.label" :value="k.value" :sub="k.sub" :icon="k.icon" :tone="k.tone" :highlight="k.highlight" :delay="0.04 * i" />
    </div>

    <!-- Evolução + Composição -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[5fr_2fr]">
      <ChartCard title="Evolução de Custos" caption="Abastecimento · Manutenção · Operacional" class="min-w-0" :height="300">
        <template #actions>
          <div class="flex gap-1 rounded-lg bg-muted p-1">
            <button v-for="p in (['mensal', 'anual'] as const)" :key="p" class="rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all duration-200"
              :class="evoPeriod === p ? 'bg-primary text-primary-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'" @click="evoPeriod = p">{{ p }}</button>
          </div>
        </template>
        <Line :data="evolution" :options="evoOptions" />
      </ChartCard>
      <ChartCard title="Composição de Custos" caption="Participação por módulo" class="min-w-0" :height="300">
        <div class="flex h-full items-center gap-3">
          <div class="relative h-36 w-36 shrink-0">
            <Doughnut :data="composition" :options="compositionOptions" />
            <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-[10px] font-semibold text-muted-foreground">Total</span>
              <span class="text-xs font-extrabold text-foreground">{{ formatBRLk(totalCost) }}</span>
            </div>
          </div>
          <ChartLegend class="min-w-0 flex-1" :items="compositionLegend" :total="totalCost" compact />
        </div>
      </ChartCard>
    </div>

    <!-- Custos por Veículos + Manutenção por Grupo -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="a-in rounded-xl border bg-card p-5 shadow-card">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 class="card-title">Custos por Veículo</h3>
            <p class="card-caption">Clique numa placa para ver o detalhamento</p>
          </div>
          <div class="flex shrink-0 gap-1 rounded-lg bg-muted p-1">
            <button v-for="opt in topNOptions" :key="opt" class="rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-200"
              :class="vehTopN === opt ? 'bg-primary text-primary-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'"
              @click="vehTopN = opt">{{ opt === 'Todos' ? 'Todos' : `Top ${opt}` }}</button>
          </div>
        </div>
        <div class="space-y-1">
          <button
            v-for="v in topVehicles" :key="v.plate"
            class="group block w-full rounded-lg p-2 text-left transition-all duration-200 hover:bg-primary/[0.07] hover:ring-1 hover:ring-primary/30"
            @click="selectedVehicle = v.plate"
          >
            <div class="mb-1.5 flex items-center gap-3">
              <span class="w-4 text-xs font-bold text-muted-foreground group-hover:text-primary-hover">{{ v.rank }}</span>
              <Truck class="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary-hover" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-bold text-foreground">{{ v.plate }}</p>
                <p v-if="v.model" class="truncate text-[10px] leading-tight text-muted-foreground">{{ v.model }}</p>
              </div>
              <span class="shrink-0 text-xs font-extrabold text-foreground">{{ formatBRL(v.total) }}</span>
              <ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <div class="ml-7 h-1.5 overflow-hidden rounded-full bg-muted">
              <div class="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover transition-all duration-200 group-hover:brightness-110" :style="{ width: `${v.pct}%` }" />
            </div>
          </button>
          <p v-if="!topVehicles.length" class="py-10 text-center text-sm text-muted-foreground">Nenhum dado disponível</p>
        </div>
      </div>
      <ChartCard title="Manutenção por Grupo" caption="Clique numa coluna para ver os tipos de custo" :maximizable="false">
        <template #actions>
          <div class="flex gap-1 rounded-lg bg-muted p-1">
            <button v-for="opt in topNOptions" :key="opt" class="rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-200"
              :class="groupTopN === opt ? 'bg-primary text-primary-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'"
              @click="groupTopN = opt">{{ opt === 'Todos' ? 'Todos' : `Top ${opt}` }}</button>
          </div>
        </template>
        <Bar :data="maintByGroup" :options="maintGroupOptions" />
      </ChartCard>
    </div>

    <!-- Custos por categoria (clicável) -->
    <ChartCard title="Custos Totais por Categoria" caption="Clique numa categoria para detalhar por veículo" :height="300">
      <div class="flex h-full flex-col items-center gap-6 md:flex-row md:items-stretch">
        <div class="relative h-52 w-52 shrink-0 md:h-full md:w-auto md:aspect-square">
          <Doughnut :data="catDonut" :options="catDonutOptions" />
          <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-[11px] font-semibold text-muted-foreground">Total</span>
            <span class="text-sm font-extrabold text-foreground">{{ formatBRLk(totalCost) }}</span>
          </div>
        </div>
        <div class="scrollbar-brand max-h-[260px] w-full overflow-auto">
          <table class="w-full text-xs">
            <thead class="sticky top-0 bg-card">
              <tr class="border-b text-muted-foreground">
                <th class="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Categoria</th>
                <th class="px-2 py-1.5 text-right font-semibold uppercase tracking-wider">Qtd</th>
                <th class="px-2 py-1.5 text-right font-semibold uppercase tracking-wider">Custo (R$)</th>
                <th class="px-2 py-1.5 text-right font-semibold uppercase tracking-wider">%</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in catEntries" :key="row.name" class="cursor-pointer border-b border-border/60 transition-colors hover:bg-primary/[0.06]" @click="selectedCatDetail = row.name">
                <td class="px-2 py-1.5"><span class="inline-flex items-center gap-2"><span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: seriesColors[i % seriesColors.length] }" /><span class="font-medium text-foreground">{{ row.name }}</span></span></td>
                <td class="px-2 py-1.5 text-right text-muted-foreground">{{ row.qty }}</td>
                <td class="px-2 py-1.5 text-right font-semibold text-foreground">{{ formatBRL(row.cost) }}</td>
                <td class="px-2 py-1.5 text-right text-muted-foreground">{{ pctOf(row.cost) }}%</td>
              </tr>
            </tbody>
            <tfoot><tr class="border-t-2 font-bold text-foreground"><td class="px-2 py-1.5">TOTAL</td><td class="px-2 py-1.5 text-right">{{ filtered.length }}</td><td class="px-2 py-1.5 text-right">{{ formatBRL(totalCost) }}</td><td class="px-2 py-1.5 text-right">100%</td></tr></tfoot>
          </table>
        </div>
      </div>
    </ChartCard>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard title="Comparativo Mensal por Módulo" :caption="`${comparison.prevLabel} × ${comparison.curLabel}`">
        <Bar :data="compData" :options="compOptions" />
      </ChartCard>
      <ChartCard title="Custos Operacionais" caption="Por tipo de custo">
        <Bar :data="opByName" :options="hBarOptions" />
      </ChartCard>
    </div>

    <!-- Modal drill-down por veículo -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedVehicle" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" @click.self="selectedVehicle = null">
          <div class="modal-panel flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border bg-card shadow-card-md">
            <div class="flex items-center gap-3 border-b p-4">
              <button class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" @click="selectedVehicle = null"><ArrowLeft class="h-4 w-4" /></button>
              <div class="flex items-center gap-2">
                <Truck class="h-4 w-4 text-primary-hover" />
                <div>
                  <p class="text-sm font-bold tracking-wide text-foreground">{{ selectedVehicle }}</p>
                  <p v-if="modelOf(selectedVehicle)" class="text-[10px] text-muted-foreground">{{ modelOf(selectedVehicle) }}</p>
                </div>
              </div>
              <div class="ml-auto text-right">
                <p class="text-[10px] uppercase tracking-wider text-muted-foreground">Total Geral</p>
                <p class="text-base font-extrabold text-foreground">{{ formatBRL(vehTotal) }}</p>
              </div>
              <button class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" @click="selectedVehicle = null"><X class="h-4 w-4" /></button>
            </div>
            <div class="scrollbar-brand flex-1 space-y-4 overflow-auto p-5">
              <div class="h-40"><Bar :data="vehModuleChart" :options="vehModuleOptions" /></div>
              <div v-for="m in vehBreakdown" :key="m.key" class="rounded-xl border p-4">
                <div class="mb-3 flex items-center gap-2">
                  <div class="flex h-7 w-7 items-center justify-center rounded-lg" :class="m.tone"><component :is="m.icon" class="h-4 w-4" /></div>
                  <span class="text-xs font-bold uppercase tracking-wider text-foreground">{{ m.key }}</span>
                  <span class="ml-auto text-sm font-extrabold text-foreground">{{ formatBRL(m.total) }}</span>
                </div>
                <div class="space-y-1.5">
                  <div v-for="b in m.items" :key="b.label" class="flex items-center gap-2">
                    <span class="w-40 shrink-0 truncate text-xs text-muted-foreground">{{ b.label }}</span>
                    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div class="h-full rounded-full" :style="{ width: `${(b.value / m.max) * 100}%`, background: m.bar }" />
                    </div>
                    <span class="w-24 shrink-0 text-right text-xs font-semibold text-foreground">{{ formatBRL(b.value) }}</span>
                  </div>
                </div>
              </div>
              <p v-if="!vehBreakdown.length" class="py-8 text-center text-sm text-muted-foreground">Nenhum custo registrado para esta placa.</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal drill-down por grupo de manutenção (tipos de custo) -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedGroup" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" @click.self="selectedGroup = null">
          <div class="modal-panel flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border bg-card shadow-card-md">
            <div class="flex items-center gap-3 border-b p-4">
              <button class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" @click="selectedGroup = null"><ArrowLeft class="h-4 w-4" /></button>
              <div class="flex items-center gap-2">
                <Wrench class="h-4 w-4 text-destructive" />
                <div>
                  <p class="text-sm font-bold uppercase tracking-wide text-foreground">{{ selectedGroup }}</p>
                  <p class="text-[10px] text-muted-foreground">Detalhamento por tipo de custo</p>
                </div>
              </div>
              <div class="ml-auto text-right">
                <p class="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                <p class="text-base font-extrabold text-foreground">{{ formatBRL(groupBreakdown.total) }}</p>
              </div>
              <button class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" @click="selectedGroup = null"><X class="h-4 w-4" /></button>
            </div>
            <div class="scrollbar-brand flex-1 overflow-auto p-5">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-card">
                  <tr class="border-b text-muted-foreground">
                    <th class="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider">Tipo de Custo</th>
                    <th class="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider">Lançts</th>
                    <th class="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider">Total</th>
                    <th class="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider">%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in groupBreakdown.rows" :key="row.label" class="border-b border-border/60 hover:bg-primary/[0.04]">
                    <td class="px-2 py-2"><span class="inline-flex items-center gap-2"><span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: row.color }" /><span class="font-medium text-foreground">{{ row.label }}</span></span></td>
                    <td class="px-2 py-2 text-right text-muted-foreground">{{ row.qty }}</td>
                    <td class="px-2 py-2 text-right font-semibold text-foreground">{{ formatBRL(row.total) }}</td>
                    <td class="px-2 py-2 text-right text-muted-foreground">{{ row.pct.toFixed(1) }}%</td>
                  </tr>
                </tbody>
                <tfoot><tr class="border-t-2 font-bold text-foreground"><td class="px-2 py-2">TOTAL</td><td class="px-2 py-2 text-right">{{ groupBreakdown.qty }}</td><td class="px-2 py-2 text-right">{{ formatBRL(groupBreakdown.total) }}</td><td class="px-2 py-2 text-right">100%</td></tr></tfoot>
              </table>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal drill-down por categoria (custos por veículo/placa) -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedCatDetail" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" @click.self="selectedCatDetail = null">
          <div class="modal-panel flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border bg-card shadow-card-md">
            <div class="flex items-center gap-3 border-b p-4">
              <button class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" @click="selectedCatDetail = null"><ArrowLeft class="h-4 w-4" /></button>
              <div class="flex items-center gap-2">
                <Layers class="h-4 w-4 text-primary-hover" />
                <div>
                  <p class="text-sm font-bold uppercase tracking-wide text-foreground">{{ selectedCatDetail }}</p>
                  <p class="text-[10px] text-muted-foreground">Custos por veículo (placa)</p>
                </div>
              </div>
              <div class="ml-auto text-right">
                <p class="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                <p class="text-base font-extrabold text-foreground">{{ formatBRL(catDetail.total) }}</p>
              </div>
              <button class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" @click="selectedCatDetail = null"><X class="h-4 w-4" /></button>
            </div>
            <div class="scrollbar-brand flex-1 space-y-4 overflow-auto p-5">
              <div v-if="catDetail.plates.length" class="h-56"><Bar :data="catDetailChart" :options="catDetailOptions" /></div>
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-card">
                  <tr class="border-b text-muted-foreground">
                    <th class="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider">Placa</th>
                    <th class="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider text-warning">Abastecimento</th>
                    <th class="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider text-destructive">Manutenção</th>
                    <th class="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider text-success">Operacional</th>
                    <th class="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in catDetail.plates" :key="p.plate" class="border-b border-border/60 hover:bg-primary/[0.04]">
                    <td class="px-2 py-2">
                      <p class="font-bold tracking-widest text-foreground">{{ p.plate }}</p>
                      <p v-if="p.model" class="text-[10px] text-muted-foreground">{{ p.model }}</p>
                    </td>
                    <td class="px-2 py-2 text-right tabular-nums text-muted-foreground">{{ formatBRL(p.Abastecimento) }}</td>
                    <td class="px-2 py-2 text-right tabular-nums text-muted-foreground">{{ formatBRL(p.Manutenção) }}</td>
                    <td class="px-2 py-2 text-right tabular-nums text-muted-foreground">{{ formatBRL(p.Operacional) }}</td>
                    <td class="px-2 py-2 text-right font-extrabold text-foreground">{{ formatBRL(p.total) }}</td>
                  </tr>
                </tbody>
                <tfoot><tr class="border-t-2 font-bold text-foreground"><td class="px-2 py-2">TOTAL</td><td class="px-2 py-2 text-right text-warning">{{ formatBRL(catDetail.plates.reduce((s, p) => s + p.Abastecimento, 0)) }}</td><td class="px-2 py-2 text-right text-destructive">{{ formatBRL(catDetail.plates.reduce((s, p) => s + p.Manutenção, 0)) }}</td><td class="px-2 py-2 text-right text-success">{{ formatBRL(catDetail.plates.reduce((s, p) => s + p.Operacional, 0)) }}</td><td class="px-2 py-2 text-right">{{ formatBRL(catDetail.total) }}</td></tr></tfoot>
              </table>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease-in-out; }
.modal-enter-active .modal-panel, .modal-leave-active .modal-panel { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-in-out; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-panel, .modal-leave-to .modal-panel { transform: scale(0.95) translateY(8px); opacity: 0; }
</style>
