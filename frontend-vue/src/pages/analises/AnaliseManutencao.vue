<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { List, DollarSign, TrendingUp, Car, AlertTriangle, ShieldCheck, Info, Wrench, Tag } from "lucide-vue-next";
import { Doughnut, Bar } from "vue-chartjs";
import { formatBRL, formatBRLk, periodRange } from "@/lib/utils";
import { palette, seriesColors, baseOptions, brlTick } from "@/lib/charts";
import StatCard from "@/components/ui/StatCard.vue";
import ChartCard from "@/components/ui/ChartCard.vue";
import ChartLegend from "@/components/ui/ChartLegend.vue";
import FilterBar from "@/components/ui/FilterBar.vue";
import PeriodPills from "@/components/ui/PeriodPills.vue";
import CategoriaDrilldownCard from "@/pages/analises/CategoriaDrilldownCard.vue";

const props = defineProps<{ records: any[]; vehicles: any[] }>();

const vehByPlate = computed(() => {
  const m: Record<string, any> = {};
  for (const v of props.vehicles) if (v.plate) m[v.plate] = v;
  return m;
});
const catOf = (r: any) => vehByPlate.value[r.plate]?.category_name || r.category_name || "Sem Categoria";
const isPrev = (c?: string) => !!c && c.toUpperCase().includes("PREVENTIV");
const isCorr = (c?: string) => !!c && c.toUpperCase().includes("CORRETIV");

const period = ref("all");
const filters = reactive({ classification: "", category: "", plate: "", from: "", to: "" });
const range = computed(() => periodRange(period.value));
const hasActive = computed(() => period.value !== "all" || Object.values(filters).some(Boolean));
function clearAll() {
  period.value = "all";
  filters.classification = filters.category = filters.plate = filters.from = filters.to = "";
}

const uniq = (arr: any[]) => [...new Set(arr.filter(Boolean))].sort() as string[];
const classOptions = computed(() => uniq(props.records.map((r) => r.classification)));
const catOptions = computed(() => uniq(props.vehicles.map((v) => v.category_name)));
const plateOptions = computed(() => uniq(props.records.map((r) => r.plate)));

const filtered = computed(() =>
  props.records.filter((r) => {
    const d = r.date ?? "";
    if (range.value.start && d < range.value.start) return false;
    if (range.value.end && d > range.value.end) return false;
    if (filters.from && d < filters.from) return false;
    if (filters.to && d > filters.to) return false;
    if (filters.classification && r.classification !== filters.classification) return false;
    if (filters.category && catOf(r) !== filters.category) return false;
    if (filters.plate && r.plate !== filters.plate) return false;
    return true;
  }),
);

const val = (r: any) => Number(r.total_value || 0);
const totalCost = computed(() => filtered.value.reduce((s, r) => s + val(r), 0));

const kpis = computed(() => {
  const rows = filtered.value;
  const total = rows.length;
  const corr = rows.filter((r) => isCorr(r.classification));
  const prev = rows.filter((r) => isPrev(r.classification));
  const vehicles = new Set(rows.map((r) => r.plate).filter(Boolean)).size;
  const pc = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(0) : "0");
  return [
    { label: "Total de Manutenções", value: total, sub: "lançamentos", icon: List, tone: "bg-primary/15 text-primary-hover", highlight: true },
    { label: "Custo Total", value: formatBRLk(totalCost.value), sub: "no período", icon: DollarSign, tone: "bg-success/10 text-success" },
    { label: "Custo Médio", value: formatBRLk(total > 0 ? totalCost.value / total : 0), sub: "por manutenção", icon: TrendingUp, tone: "bg-warning/10 text-warning" },
    { label: "Veículos Atendidos", value: vehicles, sub: "no período", icon: Car, tone: "bg-accent/10 text-accent" },
    { label: "Corretivas", value: `${corr.length} (${pc(corr.length)}%)`, sub: "do total", icon: AlertTriangle, tone: "bg-destructive/10 text-destructive" },
    { label: "Preventivas", value: `${prev.length} (${pc(prev.length)}%)`, sub: "do total", icon: ShieldCheck, tone: "bg-success/10 text-success" },
  ];
});

/* Manutenções por tipo (classificação) — donut + legenda */
const typeEntries = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of filtered.value) acc[r.classification || "N/A"] = (acc[r.classification || "N/A"] || 0) + val(r);
  return Object.entries(acc).sort((a, b) => b[1] - a[1]);
});
const typeColor = (name: string, i: number) =>
  isPrev(name) ? palette.success : isCorr(name) ? palette.destructive : seriesColors[i % seriesColors.length];
const byType = computed(() => ({
  labels: typeEntries.value.map((e) => e[0]),
  datasets: [{ data: typeEntries.value.map((e) => e[1]), backgroundColor: typeEntries.value.map(([n], i) => typeColor(n, i)), borderWidth: 0 }],
}));
const typeLegend = computed(() => typeEntries.value.map(([label, value], i) => ({ label, value, color: typeColor(label, i) })));
const donutOptions = { ...baseOptions, plugins: { legend: { display: false } } };

/* Registros com categoria resolvida (p/ card de drill-down) */
const filteredCat = computed(() => filtered.value.map((r) => ({ ...r, _cat: catOf(r) })));
/* Ranking de categorias (usado nos insights) */
const catEntries = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of filtered.value) acc[catOf(r)] = (acc[catOf(r)] || 0) + val(r);
  return Object.entries(acc).sort((a, b) => b[1] - a[1]);
});

/* Manutenções mensais — barra (custo) + linha (qtd) */
const monthly = computed(() => {
  const acc: Record<string, { cost: number; qty: number }> = {};
  for (const r of filtered.value) {
    if (!r.date) continue;
    const k = r.date.slice(0, 7);
    (acc[k] ??= { cost: 0, qty: 0 }).cost += val(r);
    acc[k].qty++;
  }
  const keys = Object.keys(acc).sort();
  const label = (k: string) => { const [y, m] = k.split("-"); return `${m}/${y.slice(2)}`; };
  return {
    labels: keys.map(label),
    datasets: [
      { type: "bar" as const, label: "Custo (R$)", data: keys.map((k) => acc[k].cost), backgroundColor: palette.primary, borderRadius: 5, yAxisID: "y", order: 2 },
      { type: "line" as const, label: "Qtd", data: keys.map((k) => acc[k].qty), borderColor: palette.accent, backgroundColor: palette.accent, tension: 0.35, pointRadius: 3, yAxisID: "y1", order: 1 },
    ],
  };
});
const monthlyOptions = {
  ...baseOptions,
  plugins: { legend: { position: "bottom" as const, labels: { usePointStyle: true, boxWidth: 8, padding: 16 } } },
  scales: {
    x: { grid: { display: false } },
    y: { position: "left" as const, ticks: { callback: brlTick } },
    y1: { position: "right" as const, grid: { drawOnChartArea: false } },
  },
};

/* Custo de pneus por veículo */
const tireEntries = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of filtered.value) {
    if (!(r.cost_group || "").toUpperCase().includes("PNEU")) continue;
    acc[r.plate || "N/A"] = (acc[r.plate || "N/A"] || 0) + val(r);
  }
  return Object.entries(acc).sort((a, b) => b[1] - a[1]);
});
const tireTotal = computed(() => tireEntries.value.reduce((s, e) => s + e[1], 0));
const byTire = computed(() => ({
  labels: tireEntries.value.map((e) => e[0]),
  datasets: [{ data: tireEntries.value.map((e) => e[1]), backgroundColor: tireEntries.value.map((_, i) => seriesColors[i % seriesColors.length]), borderRadius: 5, maxBarThickness: 40 }],
}));
const vBarOptions = {
  ...baseOptions, plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false } }, y: { ticks: { callback: brlTick } } },
};

/* Insights automáticos */
const insights = computed(() => {
  const list: { icon: any; text: string }[] = [];
  const rows = filtered.value;
  if (!rows.length) return list;
  const corr = typeEntries.value.find(([n]) => isCorr(n))?.[1] ?? 0;
  const prev = typeEntries.value.find(([n]) => isPrev(n))?.[1] ?? 0;
  if (prev > 0) list.push({ icon: Wrench, text: `Corretivas custam ${(((corr / prev) - 1) * 100).toFixed(0)}% mais que as preventivas no período.` });
  if (catEntries.value[0]) list.push({ icon: Tag, text: `A categoria ${catEntries.value[0][0]} teve o maior custo: ${formatBRL(catEntries.value[0][1])}.` });
  const high = rows.filter((r) => val(r) > 1000);
  if (high.length) {
    const hv = high.reduce((s, r) => s + val(r), 0);
    list.push({ icon: TrendingUp, text: `Manutenções acima de R$ 1.000 são ${((high.length / rows.length) * 100).toFixed(0)}% da quantidade, mas ${((hv / totalCost.value) * 100).toFixed(0)}% do custo.` });
  }
  return list;
});
</script>

<template>
  <div class="space-y-5">
    <!-- Controles -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <PeriodPills v-model="period" />
    </div>
    <FilterBar :has-active="hasActive" @clear="clearAll">
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Classificação</span>
        <select v-model="filters.classification" class="ui-input"><option value="">Todas</option><option v-for="c in classOptions" :key="c" :value="c">{{ c }}</option></select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Categoria</span>
        <select v-model="filters.category" class="ui-input"><option value="">Todas</option><option v-for="c in catOptions" :key="c" :value="c">{{ c }}</option></select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Veículo</span>
        <select v-model="filters.plate" class="ui-input"><option value="">Todos</option><option v-for="p in plateOptions" :key="p" :value="p">{{ p }}</option></select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">De</span><input v-model="filters.from" type="date" class="ui-input" /></label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Até</span><input v-model="filters.to" type="date" class="ui-input" /></label>
    </FilterBar>

    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard v-for="(k, i) in kpis" :key="k.label" :label="k.label" :value="k.value" :sub="k.sub" :icon="k.icon" :tone="k.tone" :highlight="k.highlight" :delay="0.04 * i" />
    </div>

    <!-- Manutenções por Categoria (com drill-down por placa) -->
    <CategoriaDrilldownCard :records="filteredCat" title="Manutenções por Categoria" stack-key="cost_type" />

    <!-- Gráficos -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard title="Manutenções por Tipo" caption="Preventivo × Corretivo">
        <div class="flex h-full items-center gap-5">
          <div class="h-full min-w-0 flex-1"><Doughnut :data="byType" :options="donutOptions" /></div>
          <ChartLegend class="flex-1" :items="typeLegend" :total="totalCost" />
        </div>
      </ChartCard>
      <ChartCard title="Manutenções Mensais" caption="Custo e quantidade">
        <Bar :data="(monthly as any)" :options="monthlyOptions" />
      </ChartCard>
      <ChartCard title="Custo de Pneus por Veículo" :caption="`Total: ${formatBRL(tireTotal)}`" class="xl:col-span-2">
        <Bar :data="byTire" :options="vBarOptions" />
      </ChartCard>
    </div>

    <!-- Insights -->
    <div v-if="insights.length" class="rounded-xl border bg-card p-5 shadow-card">
      <h3 class="card-title mb-3 flex items-center gap-1.5"><Info class="h-3.5 w-3.5 text-primary" /> Insights</h3>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="(ins, i) in insights" :key="i" class="flex gap-3 rounded-lg border bg-muted/30 p-3">
          <component :is="ins.icon" class="mt-0.5 h-5 w-5 shrink-0 text-primary-hover" />
          <p class="text-xs leading-relaxed text-muted-foreground">{{ ins.text }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
