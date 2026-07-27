<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { DollarSign, Droplets, TrendingUp, Fuel, Car } from "lucide-vue-next";
import { Doughnut, Bar, Line } from "vue-chartjs";
import { formatBRLk, formatNum, periodRange } from "@/lib/utils";
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

const period = ref("all");
const filters = reactive({ costName: "", category: "", from: "", to: "" });
const range = computed(() => periodRange(period.value));
const hasActive = computed(() => period.value !== "all" || Object.values(filters).some(Boolean));
function clearAll() {
  period.value = "all";
  filters.costName = filters.category = filters.from = filters.to = "";
}

const uniq = (arr: any[]) => [...new Set(arr.filter(Boolean))].sort() as string[];
const costNameOptions = computed(() => uniq(props.records.map((r) => r.cost_name)));
const catOptions = computed(() => uniq(props.vehicles.map((v) => v.category_name)));

const filtered = computed(() =>
  props.records.filter((r) => {
    const d = r.date ?? "";
    if (range.value.start && d < range.value.start) return false;
    if (range.value.end && d > range.value.end) return false;
    if (filters.from && d < filters.from) return false;
    if (filters.to && d > filters.to) return false;
    if (filters.costName && r.cost_name !== filters.costName) return false;
    if (filters.category && catOf(r) !== filters.category) return false;
    return true;
  }),
);

const val = (r: any) => Number(r.total_value || 0);
const liters = (r: any) => (r.unit === "LT" ? Number(r.quantity || 0) : 0);
const totalCost = computed(() => filtered.value.reduce((s, r) => s + val(r), 0));

const kpis = computed(() => {
  const rows = filtered.value;
  const litros = rows.reduce((s, r) => s + liters(r), 0);
  const fuelC = rows.filter((r) => (r.cost_name || "").toUpperCase().includes("COMBUST")).reduce((s, r) => s + val(r), 0);
  const tankC = rows.filter((r) => (r.cost_name || "").toUpperCase().includes("TANQUE")).reduce((s, r) => s + val(r), 0);
  return [
    { label: "Custo Total", value: formatBRLk(totalCost.value), sub: "no período", icon: DollarSign, tone: "bg-primary/15 text-primary-hover", highlight: true },
    { label: "Total Abastecido", value: `${formatNum(litros)} L`, sub: "litros", icon: Droplets, tone: "bg-info/10 text-info" },
    { label: "Ticket Médio", value: formatBRLk(rows.length ? totalCost.value / rows.length : 0), sub: "por abastecimento", icon: TrendingUp, tone: "bg-success/10 text-success" },
    { label: "Total Registros", value: formatNum(rows.length), sub: "lançamentos", icon: Fuel, tone: "bg-accent/10 text-accent" },
    { label: "Combustíveis", value: formatBRLk(fuelC), sub: "custo combustíveis", icon: Fuel, tone: "bg-warning/10 text-warning" },
    { label: "Tanque", value: formatBRLk(tankC), sub: "custo tanque", icon: Car, tone: "bg-accent/10 text-accent" },
  ];
});

const groupBy = (fn: (r: any) => string, top = 0) => {
  const acc: Record<string, number> = {};
  for (const r of filtered.value) { const k = fn(r) || "N/A"; acc[k] = (acc[k] || 0) + val(r); }
  const e = Object.entries(acc).sort((a, b) => b[1] - a[1]);
  return top ? e.slice(0, top) : e;
};

/* Total por tipo de custo (cost_name) — donut */
const costNameEntries = computed(() => groupBy((r) => r.cost_name));
const byCostName = computed(() => ({
  labels: costNameEntries.value.map((e) => e[0]),
  datasets: [{ data: costNameEntries.value.map((e) => e[1]), backgroundColor: costNameEntries.value.map((_, i) => seriesColors[i % seriesColors.length]), borderWidth: 0 }],
}));
const costNameLegend = computed(() => costNameEntries.value.map(([label, value], i) => ({ label, value, color: seriesColors[i % seriesColors.length] })));
const donutOptions = { ...baseOptions, plugins: { legend: { display: false } } };

/* Custo por combustível (cost_type) — barra horizontal */
const byFuelType = computed(() => {
  const e = groupBy((r) => r.cost_type);
  return { labels: e.map((x) => x[0]), datasets: [{ data: e.map((x) => x[1]), backgroundColor: e.map((_, i) => seriesColors[i % seriesColors.length]), borderRadius: 5 }] };
});
/* Top 10 veículos — barra horizontal */
const byVehicle = computed(() => {
  const e = groupBy((r) => r.plate, 10);
  return { labels: e.map((x) => x[0]), datasets: [{ data: e.map((x) => x[1]), backgroundColor: e.map((_, i) => seriesColors[i % seriesColors.length]), borderRadius: 5 }] };
});
/* Postos — barra horizontal */
const bySupplier = computed(() => {
  const e = groupBy((r) => r.supplier, 10);
  return { labels: e.map((x) => x[0]), datasets: [{ data: e.map((x) => x[1]), backgroundColor: e.map((_, i) => seriesColors[i % seriesColors.length]), borderRadius: 5 }] };
});
const hBarOptions = {
  ...baseOptions, indexAxis: "y" as const, plugins: { legend: { display: false } },
  scales: { x: { ticks: { callback: brlTick }, grid: { display: false } }, y: { grid: { display: false } } },
};

/* Evolução de litros (barra) + comparativo mensal (barra custo + linha litros) */
const monthAgg = computed(() => {
  const acc: Record<string, { cost: number; liters: number }> = {};
  for (const r of filtered.value) {
    if (!r.date) continue;
    const k = r.date.slice(0, 7);
    (acc[k] ??= { cost: 0, liters: 0 }).cost += val(r);
    acc[k].liters += liters(r);
  }
  const keys = Object.keys(acc).sort();
  const label = (k: string) => { const [y, m] = k.split("-"); return `${m}/${y.slice(2)}`; };
  return { keys, labels: keys.map(label), acc };
});
const litersChart = computed(() => ({
  labels: monthAgg.value.labels,
  datasets: [{ label: "Litros", data: monthAgg.value.keys.map((k) => Math.round(monthAgg.value.acc[k].liters)), backgroundColor: palette.primary, borderRadius: 5 }],
}));
const litersOptions = {
  ...baseOptions, plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v: any) => `${formatNum(v)} L` } } },
};
const monthly = computed(() => ({
  labels: monthAgg.value.labels,
  datasets: [
    { type: "bar" as const, label: "Custo (R$)", data: monthAgg.value.keys.map((k) => monthAgg.value.acc[k].cost), backgroundColor: palette.warning, borderRadius: 5, yAxisID: "y", order: 2 },
    { type: "line" as const, label: "Litros", data: monthAgg.value.keys.map((k) => Math.round(monthAgg.value.acc[k].liters)), borderColor: palette.success, backgroundColor: palette.success, tension: 0.35, pointRadius: 3, yAxisID: "y1", order: 1 },
  ],
}));
const monthlyOptions = {
  ...baseOptions,
  plugins: { legend: { position: "bottom" as const, labels: { usePointStyle: true, boxWidth: 8, padding: 16 } } },
  scales: {
    x: { grid: { display: false } },
    y: { position: "left" as const, ticks: { callback: brlTick } },
    y1: { position: "right" as const, grid: { drawOnChartArea: false }, ticks: { callback: (v: any) => `${formatNum(v)}L` } },
  },
};

/* Registros com categoria (card de drill-down) */
const filteredCat = computed(() => filtered.value.map((r) => ({ ...r, _cat: catOf(r) })));

/* Evolução do preço médio (R$/L) por combustível */
const fuelTypes = computed(() =>
  [...new Set(filtered.value.filter((r) => r.unit === "LT" && Number(r.quantity) > 0).map((r) => r.cost_type).filter(Boolean))] as string[],
);
const avgPrice = computed(() => {
  const acc: Record<string, Record<string, { sum: number; qty: number }>> = {};
  for (const r of filtered.value) {
    if (r.unit !== "LT" || !(Number(r.quantity) > 0) || !r.date) continue;
    const m = r.date.slice(0, 7);
    const t = r.cost_type || "N/A";
    ((acc[m] ??= {})[t] ??= { sum: 0, qty: 0 });
    acc[m][t].sum += val(r);
    acc[m][t].qty += Number(r.quantity);
  }
  const keys = Object.keys(acc).sort();
  const label = (k: string) => { const [y, m] = k.split("-"); return `${m}/${y.slice(2)}`; };
  return {
    labels: keys.map(label),
    datasets: fuelTypes.value.map((t, i) => ({
      label: t,
      data: keys.map((k) => (acc[k][t] ? Number((acc[k][t].sum / acc[k][t].qty).toFixed(3)) : null)),
      borderColor: seriesColors[i % seriesColors.length], backgroundColor: seriesColors[i % seriesColors.length],
      tension: 0.3, pointRadius: 2, spanGaps: true,
    })),
  };
});
const avgPriceOptions = {
  ...baseOptions,
  plugins: { legend: { position: "bottom" as const, labels: { usePointStyle: true, boxWidth: 8, padding: 14 } } },
  scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v: any) => `R$ ${Number(v).toFixed(2)}` } } },
};
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <PeriodPills v-model="period" />
    </div>
    <FilterBar :has-active="hasActive" @clear="clearAll">
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Tipo de Custo</span>
        <select v-model="filters.costName" class="ui-input"><option value="">Todos</option><option v-for="c in costNameOptions" :key="c" :value="c">{{ c }}</option></select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Categoria</span>
        <select v-model="filters.category" class="ui-input"><option value="">Todas</option><option v-for="c in catOptions" :key="c" :value="c">{{ c }}</option></select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">De</span><input v-model="filters.from" type="date" class="ui-input" /></label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Até</span><input v-model="filters.to" type="date" class="ui-input" /></label>
    </FilterBar>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard v-for="(k, i) in kpis" :key="k.label" :label="k.label" :value="k.value" :sub="k.sub" :icon="k.icon" :tone="k.tone" :highlight="k.highlight" :delay="0.04 * i" />
    </div>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard title="Total por Tipo de Custo" caption="Participação por custo">
        <div class="flex h-full items-center gap-5">
          <div class="h-full min-w-0 flex-1"><Doughnut :data="byCostName" :options="donutOptions" /></div>
          <ChartLegend class="flex-1" :items="costNameLegend" :total="totalCost" />
        </div>
      </ChartCard>
      <ChartCard title="Custo por Combustível" caption="Por tipo de combustível">
        <Bar :data="byFuelType" :options="hBarOptions" />
      </ChartCard>
    </div>

    <!-- Abastecimentos por Categoria (com drill-down por placa) -->
    <CategoriaDrilldownCard :records="filteredCat" title="Abastecimentos por Categoria" stack-key="cost_type" with-liters />

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard title="Evolução do Volume (Litros)" caption="Por mês">
        <Bar :data="litersChart" :options="litersOptions" />
      </ChartCard>
      <ChartCard title="Evolução do Preço Médio (R$/L)" caption="Por combustível">
        <Line :data="avgPrice" :options="avgPriceOptions" />
      </ChartCard>
      <ChartCard title="Top 10 Veículos" caption="Maior gasto">
        <Bar :data="byVehicle" :options="hBarOptions" />
      </ChartCard>
      <ChartCard title="Postos" caption="Maior volume financeiro">
        <Bar :data="bySupplier" :options="hBarOptions" />
      </ChartCard>
      <ChartCard title="Comparativo Mensal" caption="Custo e litros" class="xl:col-span-2">
        <Bar :data="(monthly as any)" :options="monthlyOptions" />
      </ChartCard>
    </div>
  </div>
</template>
