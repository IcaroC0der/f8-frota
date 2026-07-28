<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Truck, DollarSign, Fuel, Wrench, Coins, Search, ChevronDown, ChevronUp, Gauge, Activity } from "lucide-vue-next";
import { Doughnut, Bar } from "vue-chartjs";
import { formatBRL, formatBRLk, formatNum, formatDate, periodRange } from "@/lib/utils";
import { moduleColors, baseOptions, brlTick } from "@/lib/charts";
import StatCard from "@/components/ui/StatCard.vue";
import FilterBar from "@/components/ui/FilterBar.vue";
import PeriodPills from "@/components/ui/PeriodPills.vue";

const props = defineProps<{ fuel: any[]; maint: any[]; oper: any[]; vehicles: any[] }>();

const vehByPlate = computed(() => {
  const m: Record<string, any> = {};
  for (const v of props.vehicles) if (v.plate) m[v.plate] = v;
  return m;
});
const catOf = (r: any) => vehByPlate.value[r.plate]?.category_name || r.category_name || "Sem Categoria";
const val = (r: any) => Number(r.total_value || 0);

/* ---- Filtros ---- */
const period = ref("all");
const filters = reactive({ costType: "", category: "", from: "", to: "", plates: [] as string[] });
const range = computed(() => periodRange(period.value));
const hasActive = computed(() => period.value !== "all" || !!filters.costType || !!filters.category || !!filters.from || !!filters.to || filters.plates.length > 0);
function clearAll() {
  period.value = "all";
  filters.costType = filters.category = filters.from = filters.to = "";
  filters.plates = [];
}

const uniq = (arr: any[]) => [...new Set(arr.filter(Boolean))].sort() as string[];
const costTypeOptions = computed(() => uniq([...props.fuel.map((r) => r.cost_type), ...props.maint.map((r) => r.cost_type)]));
const catOptions = computed(() => uniq(props.vehicles.map((v) => v.category_name)));

/* ---- Plate multi-select dropdown ---- */
const plateOpen = ref(false);
const plateSearch = ref("");
const filteredPlates = computed(() => {
  const q = plateSearch.value.toUpperCase().trim();
  return props.vehicles.filter((v) => v.plate && (!q || v.plate.toUpperCase().includes(q))).sort((a: any, b: any) => a.plate.localeCompare(b.plate));
});
function togglePlate(plate: string) {
  const i = filters.plates.indexOf(plate);
  if (i >= 0) filters.plates.splice(i, 1);
  else filters.plates.push(plate);
}

/* ---- Registros mesclados e filtrados ---- */
const allRecords = computed(() => [
  ...props.fuel.map((r) => ({ ...r, _mod: "Abastecimento", _cat: catOf(r), _desc: r.cost_type || r.cost_name || "", _catCost: r.cost_name || "" })),
  ...props.maint.map((r) => ({ ...r, _mod: "Manutenção", _cat: catOf(r), _desc: r.cost_type || r.cost_group || "", _catCost: r.cost_group || r.classification || "" })),
  ...props.oper.map((r) => ({ ...r, _mod: "Operacional", _cat: catOf(r), _desc: r.cost_name || "", _catCost: r.cost_name || "" })),
]);

const filtered = computed(() =>
  allRecords.value.filter((r) => {
    const d = r.date ?? "";
    if (range.value.start && d < range.value.start) return false;
    if (range.value.end && d > range.value.end) return false;
    if (filters.from && d < filters.from) return false;
    if (filters.to && d > filters.to) return false;
    if (filters.costType && (r.cost_type || "") !== filters.costType) return false;
    if (filters.category && r._cat !== filters.category) return false;
    if (filters.plates.length && !filters.plates.includes(r.plate)) return false;
    return true;
  }),
);

/* ---- Resumo geral ---- */
const totalCost = computed(() => filtered.value.reduce((s, r) => s + val(r), 0));
const uniquePlatesCount = computed(() => {
  if (filters.plates.length) return filters.plates.length;
  if (filters.category) return props.vehicles.filter((v) => v.category_name === filters.category).length;
  return props.vehicles.length;
});

/* ---- KPIs ---- */
const vehWithRecords = computed(() => new Set(filtered.value.map((r) => r.plate).filter(Boolean)).size);

const kpis = computed(() => {
  const fuelRows = filtered.value.filter((r) => r._mod === "Abastecimento" && r.unit === "LT");
  const totalLiters = fuelRows.reduce((s, r) => s + Number(r.quantity || 0), 0);
  // Km: usa TODOS os registros (fuel + maint + oper) para maior cobertura do odômetro
  const byPlateKm: Record<string, number[]> = {};
  for (const r of filtered.value) if (r.km > 0 && r.plate) (byPlateKm[r.plate] ??= []).push(Number(r.km));
  let totalKm = 0;
  for (const kms of Object.values(byPlateKm)) {
    if (kms.length >= 2) totalKm += Math.max(...kms) - Math.min(...kms);
  }
  const avgKmL = totalLiters > 0 && totalKm > 0 ? totalKm / totalLiters : 0;
  const costPerKm = totalKm > 0 ? totalCost.value / totalKm : 0;
  const activeVeh = vehWithRecords.value || 1;
  return [
    { label: "Média de Gasto por Veículo", value: formatBRLk(totalCost.value / activeVeh), sub: `${activeVeh} veículos`, icon: DollarSign, tone: "bg-primary/15 text-primary-hover" },
    { label: "Consumo Médio", value: avgKmL > 0 ? `${avgKmL.toFixed(2).replace(".", ",")} km/L` : "—", sub: `${formatNum(totalLiters)} L abastecidos`, icon: Gauge, tone: "bg-info/10 text-info" },
    { label: "Custo por KM Rodado", value: costPerKm > 0 ? `R$ ${costPerKm.toFixed(2).replace(".", ",")}` : "—", sub: `${formatNum(totalKm)} km rodados`, icon: Activity, tone: "bg-success/10 text-success" },
  ];
});

/* ---- Preço médio por combustível ---- */
const fuelPrices = computed(() => {
  const acc: Record<string, { cost: number; liters: number; count: number }> = {};
  for (const r of filtered.value) {
    if (r._mod !== "Abastecimento" || r.unit !== "LT" || !Number(r.quantity)) continue;
    const t = r.cost_type || "N/A";
    const b = (acc[t] ??= { cost: 0, liters: 0, count: 0 });
    b.cost += val(r);
    b.liters += Number(r.quantity);
    b.count++;
  }
  return Object.entries(acc)
    .map(([type, v]) => ({ type, avg: v.liters > 0 ? v.cost / v.liters : 0, liters: v.liters, count: v.count }))
    .sort((a, b) => b.count - a.count);
});
const fuelColorMap: Record<string, string> = {
  "DIESEL (P)": "#3b82f6", "ETANOL": "#ec4899", "DIESEL (T)": "#06b6d4",
  "ARLA": "#ef4444", "GASOLINA": "#22c55e", "DIESEL": "#3b82f6",
};
const fallbackColors = ["#f59e0b", "#8b5cf6", "#14b8a6", "#64748b"];
let fallbackIdx = 0;
const fuelColor = (type: string) => fuelColorMap[type] ?? (fuelColorMap[type] = fallbackColors[fallbackIdx++ % fallbackColors.length]);
const maxLiters = computed(() => Math.max(...fuelPrices.value.map((f) => f.liters), 1));

/* ---- Busca + ordenação dos veículos ---- */
const vehSearch = ref("");
const vehSort = ref("cost-desc");
const sortOptions = [
  { value: "cost-desc", label: "Maior custo" },
  { value: "cost-asc", label: "Menor custo" },
  { value: "plate-asc", label: "Placa A-Z" },
  { value: "records-desc", label: "Mais lançamentos" },
];

/* ---- Agregação por veículo ---- */
const vehicleAgg = computed(() => {
  const acc: Record<string, { fuel: number; maint: number; oper: number; total: number; count: number; records: any[] }> = {};
  for (const r of filtered.value) {
    if (!r.plate) continue;
    const b = (acc[r.plate] ??= { fuel: 0, maint: 0, oper: 0, total: 0, count: 0, records: [] });
    b.total += val(r);
    b.count++;
    b.records.push(r);
    if (r._mod === "Abastecimento") b.fuel += val(r);
    else if (r._mod === "Manutenção") b.maint += val(r);
    else b.oper += val(r);
  }
  return acc;
});

const emptyAgg = { fuel: 0, maint: 0, oper: 0, total: 0, count: 0, records: [] as any[] };
const sortedVehicles = computed(() => {
  const q = vehSearch.value.toUpperCase().trim();
  const list = props.vehicles
    .filter((v) => {
      if (!v.plate) return false;
      if (filters.category && v.category_name !== filters.category) return false;
      if (filters.plates.length && !filters.plates.includes(v.plate)) return false;
      return !q || v.plate.toUpperCase().includes(q) || (v.vehicle_model || "").toUpperCase().includes(q);
    })
    .map((v) => {
      const a = vehicleAgg.value[v.plate] || emptyAgg;
      return { ...v, ...a, pctFleet: totalCost.value > 0 ? (a.total / totalCost.value) * 100 : 0 };
    });
  const s = vehSort.value;
  if (s === "cost-desc") list.sort((a, b) => b.total - a.total);
  else if (s === "cost-asc") list.sort((a, b) => a.total - b.total);
  else if (s === "plate-asc") list.sort((a, b) => a.plate.localeCompare(b.plate));
  else list.sort((a, b) => b.count - a.count);
  return list;
});

/* ---- Accordion ---- */
const expanded = ref<string | null>(null);
function toggleVehicle(plate: string) { expanded.value = expanded.value === plate ? null : plate; }

/* ---- Gráficos por veículo ---- */
function vehDonut(v: any) {
  return {
    labels: ["Abastecimento", "Manutenção", "Operacional"],
    datasets: [{ data: [v.fuel, v.maint, v.oper], backgroundColor: moduleColors, borderWidth: 0, spacing: 2 }],
  };
}
const donutOpts = { ...baseOptions, cutout: "62%", plugins: { legend: { position: "bottom" as const, labels: { usePointStyle: true, boxWidth: 8, padding: 10, font: { size: 11 } } } } };

function vehMonthly(v: any) {
  const acc: Record<string, [number, number, number]> = {};
  for (const r of v.records) {
    if (!r.date) continue;
    const k = r.date.slice(0, 7);
    const b = (acc[k] ??= [0, 0, 0]);
    if (r._mod === "Abastecimento") b[0] += val(r);
    else if (r._mod === "Manutenção") b[1] += val(r);
    else b[2] += val(r);
  }
  const keys = Object.keys(acc).sort();
  const lbl = (k: string) => { const [y, m] = k.split("-"); return `${m}/${y.slice(2)}`; };
  return {
    labels: keys.map(lbl),
    datasets: [
      { label: "Abastecimento", data: keys.map((k) => acc[k][0]), backgroundColor: moduleColors[0], borderRadius: 4, stack: "s" },
      { label: "Manutenção", data: keys.map((k) => acc[k][1]), backgroundColor: moduleColors[1], borderRadius: 4, stack: "s" },
      { label: "Operacional", data: keys.map((k) => acc[k][2]), backgroundColor: moduleColors[2], borderRadius: 4, stack: "s" },
    ],
  };
}
const monthlyOpts = {
  ...baseOptions,
  plugins: { legend: { position: "bottom" as const, labels: { usePointStyle: true, boxWidth: 8, padding: 10, font: { size: 11 } } } },
  scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: brlTick } } },
};

function vehCategories(v: any) {
  const acc: Record<string, { value: number; mod: string }> = {};
  for (const r of v.records) {
    const key = r._desc || r._mod;
    const b = (acc[key] ??= { value: 0, mod: r._mod });
    b.value += val(r);
  }
  return Object.entries(acc)
    .map(([label, d]) => ({ label, value: d.value, mod: d.mod, pct: v.total > 0 ? (d.value / v.total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
}
const modBarColor = (mod: string) => mod === "Abastecimento" ? moduleColors[0] : mod === "Manutenção" ? moduleColors[1] : moduleColors[2];

/* ---- Histórico de lançamentos ---- */
const historyAll = ref<Record<string, boolean>>({});
function vehHistory(v: any) {
  const rows = [...v.records].sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));
  return historyAll.value[v.plate] ? rows : rows.slice(0, 8);
}

const modBadge = (mod: string) =>
  mod === "Abastecimento" ? "bg-warning/10 text-warning" :
  mod === "Manutenção" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success";
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <PeriodPills v-model="period" />
    </div>

    <FilterBar :has-active="hasActive" @clear="clearAll">
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Tipo de Custo</span>
        <select v-model="filters.costType" class="ui-input"><option value="">Todos</option><option v-for="c in costTypeOptions" :key="c" :value="c">{{ c }}</option></select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Categoria de Custo</span>
        <select v-model="filters.category" class="ui-input"><option value="">Todos</option><option v-for="c in catOptions" :key="c" :value="c">{{ c }}</option></select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">De</span><input v-model="filters.from" type="date" class="ui-input" /></label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Até</span><input v-model="filters.to" type="date" class="ui-input" /></label>
      <!-- Plate multi-select -->
      <div class="relative block">
        <span class="mb-1 block text-xs font-medium text-muted-foreground">Placas ({{ filters.plates.length || "todas" }})</span>
        <button type="button" class="ui-input flex w-full items-center justify-between gap-2 text-left" @click="plateOpen = !plateOpen">
          <span class="truncate text-sm">{{ filters.plates.length ? `${filters.plates.length} selecionadas` : "Todas" }}</span>
          <ChevronDown class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
        <div v-if="plateOpen" class="fixed inset-0 z-10" @click="plateOpen = false" />
        <div v-if="plateOpen" class="absolute left-0 top-full z-20 mt-1 w-60 rounded-lg border bg-card p-2 shadow-card-md">
          <div class="relative mb-2">
            <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input v-model="plateSearch" class="ui-input pl-8 text-xs" placeholder="Buscar placa..." />
          </div>
          <div class="scrollbar-brand max-h-48 space-y-0.5 overflow-auto">
            <label v-for="v in filteredPlates" :key="v.id" class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-primary/[0.06]">
              <input type="checkbox" :checked="filters.plates.includes(v.plate)" class="h-3.5 w-3.5 accent-primary" @change="togglePlate(v.plate)" />
              <span class="text-xs font-bold tracking-wider">{{ v.plate }}</span>
            </label>
          </div>
        </div>
      </div>
    </FilterBar>

    <!-- Resumo -->
    <div class="a-in flex flex-wrap items-baseline gap-x-6 gap-y-2 rounded-xl border bg-card px-6 py-4 shadow-card">
      <div class="flex items-baseline gap-2"><span class="text-2xl font-black text-foreground">{{ uniquePlatesCount }}</span><span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Veículos</span></div>
      <div class="flex items-baseline gap-2"><span class="text-2xl font-black text-foreground">{{ formatNum(filtered.length) }}</span><span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lançamentos</span></div>
      <div class="flex items-baseline gap-2"><span class="text-2xl font-black text-primary-hover">{{ formatBRL(totalCost) }}</span><span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</span></div>
    </div>

    <!-- Busca + Ordenação -->
    <div class="flex items-center gap-3">
      <div class="relative flex-1">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input v-model="vehSearch" class="ui-input pl-10" placeholder="Buscar placa/modelo..." />
      </div>
      <select v-model="vehSort" class="ui-input w-44">
        <option v-for="o in sortOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <StatCard v-for="(k, i) in kpis" :key="k.label" :label="k.label" :value="k.value" :sub="k.sub" :icon="k.icon" :tone="k.tone" :delay="0.04 * i" />
    </div>

    <!-- Preço Médio por Combustível -->
    <div v-if="fuelPrices.length" class="a-in rounded-xl border bg-card p-5 shadow-card">
      <div class="mb-4 flex items-center gap-2">
        <Fuel class="h-4 w-4 text-muted-foreground" />
        <h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preço Médio por Combustível (R$/L)</h3>
      </div>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <div v-for="fp in fuelPrices" :key="fp.type" class="rounded-lg border p-4">
          <div class="mb-1 flex items-center gap-2">
            <span class="h-2 w-2 rounded-full" :style="{ background: fuelColor(fp.type) }" />
            <span class="text-xs font-bold uppercase text-foreground">{{ fp.type }}</span>
          </div>
          <p class="text-xl font-black" :style="{ color: fuelColor(fp.type) }">R$ {{ fp.avg.toFixed(4).replace(".", ",") }}</p>
          <p class="mb-3 text-[10px] text-muted-foreground">média por litro</p>
          <div class="mb-2 h-1 overflow-hidden rounded-full bg-muted">
            <div class="h-full rounded-full" :style="{ width: `${(fp.liters / maxLiters) * 100}%`, background: fuelColor(fp.type) }" />
          </div>
          <div class="flex justify-between text-[10px] text-muted-foreground">
            <span>{{ formatNum(fp.liters) }} L</span>
            <span>{{ formatNum(fp.count) }} abast.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Lista de veículos (accordion) -->
    <div class="space-y-3">
      <div v-for="v in sortedVehicles" :key="v.plate" class="a-in overflow-hidden rounded-xl border bg-card shadow-card transition-shadow hover:shadow-card-md">
        <!-- Header (sempre visível, clicável) -->
        <button class="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-primary/[0.04]" @click="toggleVehicle(v.plate)">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Truck class="h-4 w-4 text-primary-hover" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-black tracking-widest text-foreground">{{ v.plate }}</p>
            <p class="truncate text-[11px] text-muted-foreground">{{ v.vehicle_model || "S/MODELO" }} · {{ v.category_name || "SEM CATEGORIA" }}</p>
          </div>
          <div class="hidden items-center gap-6 sm:flex">
            <div class="text-right">
              <p class="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Total Gasto</p>
              <p class="text-sm font-extrabold text-foreground">{{ formatBRL(v.total) }}</p>
            </div>
            <div class="text-right">
              <p class="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">% Frota</p>
              <p class="text-sm font-bold text-primary-hover">{{ v.pctFleet.toFixed(1) }}%</p>
            </div>
            <div class="text-right">
              <p class="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Lançamentos</p>
              <p class="text-sm font-bold text-foreground">{{ v.count }}</p>
            </div>
          </div>
          <component :is="expanded === v.plate ? ChevronUp : ChevronDown" class="h-5 w-5 shrink-0 text-muted-foreground transition-transform" />
        </button>

        <!-- Stats mobile (visível só em telas pequenas) -->
        <div class="flex gap-4 border-t px-4 py-2 sm:hidden">
          <span class="text-xs"><span class="font-bold">{{ formatBRLk(v.total) }}</span> <span class="text-muted-foreground">total</span></span>
          <span class="text-xs"><span class="font-bold text-primary-hover">{{ v.pctFleet.toFixed(1) }}%</span> <span class="text-muted-foreground">frota</span></span>
          <span class="text-xs"><span class="font-bold">{{ v.count }}</span> <span class="text-muted-foreground">lanç.</span></span>
        </div>

        <!-- Conteúdo expandido -->
        <div v-if="expanded === v.plate" class="space-y-4 border-t p-4">
          <!-- Cards de módulo -->
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-lg border-l-4 border-l-warning bg-warning/[0.06] p-3">
              <div class="mb-1 flex items-center gap-1.5"><Fuel class="h-3.5 w-3.5 text-warning" /><span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Abastecimento</span></div>
              <div class="flex items-end justify-between"><p class="text-base font-extrabold text-foreground">{{ formatBRLk(v.fuel) }}</p><span class="text-xs text-muted-foreground">{{ v.total > 0 ? ((v.fuel / v.total) * 100).toFixed(1) : "0.0" }}%</span></div>
            </div>
            <div class="rounded-lg border-l-4 border-l-destructive bg-destructive/[0.06] p-3">
              <div class="mb-1 flex items-center gap-1.5"><Wrench class="h-3.5 w-3.5 text-destructive" /><span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Manutenção</span></div>
              <div class="flex items-end justify-between"><p class="text-base font-extrabold text-foreground">{{ formatBRLk(v.maint) }}</p><span class="text-xs text-muted-foreground">{{ v.total > 0 ? ((v.maint / v.total) * 100).toFixed(1) : "0.0" }}%</span></div>
            </div>
            <div class="rounded-lg border-l-4 border-l-success bg-success/[0.06] p-3">
              <div class="mb-1 flex items-center gap-1.5"><Coins class="h-3.5 w-3.5 text-success" /><span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Operacional</span></div>
              <div class="flex items-end justify-between"><p class="text-base font-extrabold text-foreground">{{ formatBRLk(v.oper) }}</p><span class="text-xs text-muted-foreground">{{ v.total > 0 ? ((v.oper / v.total) * 100).toFixed(1) : "0.0" }}%</span></div>
            </div>
          </div>

          <!-- Gráficos: Distribuição + Evolução -->
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="rounded-xl border p-4">
              <h4 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Distribuição por Tipo</h4>
              <div class="mx-auto h-48 w-48"><Doughnut :data="vehDonut(v)" :options="donutOpts" /></div>
            </div>
            <div class="rounded-xl border p-4">
              <h4 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Evolução Mensal</h4>
              <div class="h-56"><Bar :data="vehMonthly(v)" :options="monthlyOpts" /></div>
            </div>
          </div>

          <!-- Detalhamento por Categoria de Custo -->
          <div class="rounded-xl border p-4">
            <h4 class="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Detalhamento por Categoria de Custo</h4>
            <div class="space-y-2">
              <div v-for="cat in vehCategories(v)" :key="cat.label" class="flex items-center gap-3">
                <span class="w-36 shrink-0 truncate text-xs font-medium text-foreground" :title="cat.label">{{ cat.label }}</span>
                <div class="h-4 flex-1 overflow-hidden rounded bg-muted">
                  <div class="h-full rounded transition-all" :style="{ width: `${cat.pct}%`, background: modBarColor(cat.mod) }" />
                </div>
                <span class="w-24 shrink-0 text-right text-xs font-semibold text-foreground">{{ formatBRL(cat.value) }}</span>
                <span class="w-12 shrink-0 text-right text-[11px] text-muted-foreground">{{ cat.pct.toFixed(1) }}%</span>
              </div>
              <p v-if="!vehCategories(v).length" class="py-4 text-center text-sm text-muted-foreground">Nenhum dado</p>
            </div>
          </div>

          <!-- Histórico de Lançamentos -->
          <div class="rounded-xl border p-4">
            <div class="mb-3 flex items-center justify-between">
              <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Histórico de Lançamentos</h4>
            </div>
            <div class="scrollbar-brand overflow-auto">
              <table class="w-full text-xs">
                <thead class="sticky top-0 bg-card">
                  <tr class="border-b text-muted-foreground">
                    <th class="px-2 py-2 text-left font-semibold uppercase tracking-wider">Data</th>
                    <th class="px-2 py-2 text-left font-semibold uppercase tracking-wider">Tipo</th>
                    <th class="px-2 py-2 text-left font-semibold uppercase tracking-wider">Descrição</th>
                    <th class="px-2 py-2 text-left font-semibold uppercase tracking-wider">Categoria</th>
                    <th class="px-2 py-2 text-left font-semibold uppercase tracking-wider">Fornecedor</th>
                    <th class="px-2 py-2 text-right font-semibold uppercase tracking-wider">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, ri) in vehHistory(v)" :key="ri" class="border-b border-border/60 transition-colors hover:bg-primary/[0.04]">
                    <td class="whitespace-nowrap px-2 py-2 text-muted-foreground">{{ formatDate(r.date) }}</td>
                    <td class="px-2 py-2"><span class="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold" :class="modBadge(r._mod)">{{ r._mod }}</span></td>
                    <td class="max-w-[180px] truncate px-2 py-2 font-medium text-foreground" :title="r._desc">{{ r._desc || "—" }}</td>
                    <td class="max-w-[160px] truncate px-2 py-2 text-muted-foreground" :title="r._catCost">{{ r._catCost || "—" }}</td>
                    <td class="max-w-[180px] truncate px-2 py-2 text-muted-foreground" :title="r.supplier">{{ r.supplier || "—" }}</td>
                    <td class="whitespace-nowrap px-2 py-2 text-right font-semibold text-foreground">{{ formatBRL(val(r)) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="border-t-2 font-bold text-foreground">
                    <td class="px-2 py-2" colspan="5">TOTAL ({{ v.count }} LANÇAMENTOS)</td>
                    <td class="px-2 py-2 text-right">{{ formatBRL(v.total) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button
              v-if="v.count > 8 && !historyAll[v.plate]"
              class="mt-3 w-full rounded-lg py-2 text-center text-xs font-semibold text-primary-hover transition-colors hover:bg-primary/[0.06]"
              @click="historyAll[v.plate] = true"
            >
              Ver todos os {{ v.count }} lançamentos
            </button>
          </div>
        </div>
      </div>

      <p v-if="!sortedVehicles.length" class="py-16 text-center text-sm text-muted-foreground">
        Nenhum veículo encontrado com os filtros aplicados.
      </p>
    </div>
  </div>
</template>
