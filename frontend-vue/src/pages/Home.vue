<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Gauge, Fuel, Wrench, DollarSign, Truck, Activity, TrendingUp,
} from "lucide-vue-next";
import { Line, Bar, Doughnut } from "vue-chartjs";
import {
  vehicles, fuelRecords, maintenanceRecords, operationalCostRecords,
} from "@/services/api";
import { palette, moduleColors, seriesColors, baseOptions, brlTick } from "@/lib/charts";
import StatCard from "@/components/ui/StatCard.vue";
import Card from "@/components/ui/Card.vue";
import Spinner from "@/components/ui/Spinner.vue";

const loading = ref(true);
const fuel = ref<any[]>([]);
const maint = ref<any[]>([]);
const oper = ref<any[]>([]);
const fleet = ref<any[]>([]);

onMounted(async () => {
  try {
    [fuel.value, maint.value, oper.value, fleet.value] = await Promise.all([
      fuelRecords.list({ limit: 5000 }),
      maintenanceRecords.list({ limit: 5000 }),
      operationalCostRecords.list({ limit: 5000 }),
      vehicles.list({ limit: 1000 }),
    ]);
  } finally {
    loading.value = false;
  }
});

/* ---------- helpers ---------- */
const fmt0 = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const sum = (arr: any[]) => arr.reduce((s, r) => s + Number(r.total_value || 0), 0);
const monthKey = (d: string) => (d || "").slice(0, 7);
const ymNow = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
};
const ymPrev = () => {
  const n = new Date();
  n.setMonth(n.getMonth() - 1);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

/* ---------- KPIs (mesma lógica do dashboard React) ---------- */
const kpis = computed(() => {
  const cm = ymNow();
  const pm = ymPrev();
  const inMonth = (arr: any[], m: string) => sum(arr.filter((r) => monthKey(r.date) === m));

  const fuelTotal = sum(fuel.value);
  const maintTotal = sum(maint.value);
  const opTotal = sum(oper.value);

  const fuelCM = inMonth(fuel.value, cm);
  const maintCM = inMonth(maint.value, cm);
  const opCM = inMonth(oper.value, cm);
  const totalCM = fuelCM + maintCM + opCM;

  const fuelPM = inMonth(fuel.value, pm);
  const maintPM = inMonth(maint.value, pm);
  const totalPM = fuelPM + maintPM + inMonth(oper.value, pm);

  const trend = (now: number, prev: number) => (prev > 0 ? Math.round(((now - prev) / prev) * 100) : 0);

  return {
    grandTotal: fuelTotal + maintTotal + opTotal,
    fuelTotal, maintTotal, opTotal,
    totalCM, fuelCM, maintCM,
    trendTotal: trend(totalCM, totalPM),
    trendFuel: trend(fuelCM, fuelPM),
    trendMaint: trend(maintCM, maintPM),
    activeVehicles: fleet.value.filter((v) => v.is_active !== false).length,
    totalRecords: fuel.value.length + maint.value.length + oper.value.length,
    fuelLiters: fuel.value.reduce((s, r) => s + Number(r.quantity || 0), 0),
  };
});

/* ---------- Evolução de custos (mensal/anual) ---------- */
const period = ref<"mensal" | "anual">("mensal");
const evolution = computed(() => {
  const bucket = (d: string) => (period.value === "anual" ? d.slice(0, 4) : monthKey(d));
  const label = (k: string) => {
    if (period.value === "anual") return k;
    const [y, m] = k.split("-");
    return `${m}/${y.slice(2)}`;
  };
  const keys = [...new Set(
    [...fuel.value, ...maint.value, ...oper.value].map((r) => bucket(r.date)).filter(Boolean),
  )].sort();
  const series = (arr: any[]) =>
    keys.map((k) => sum(arr.filter((r) => bucket(r.date) === k)));
  const area = (color: string, alpha: string) => ({
    borderColor: color, backgroundColor: alpha, fill: true,
    tension: 0.35, pointRadius: 0, pointHitRadius: 12, borderWidth: 2,
  });
  return {
    labels: keys.map(label),
    datasets: [
      { label: "Abastecimento", data: series(fuel.value), ...area(palette.warning, "rgba(245,158,11,0.10)") },
      { label: "Manutenção", data: series(maint.value), ...area(palette.destructive, "rgba(239,68,68,0.10)") },
      { label: "Operacional", data: series(oper.value), ...area(palette.success, "rgba(16,185,129,0.10)") },
    ],
  };
});
const evolutionOpts = {
  ...baseOptions,
  interaction: { mode: "index" as const, intersect: false },
  scales: {
    x: { grid: { display: false } },
    y: { ticks: { callback: brlTick } },
  },
};

/* ---------- Composição (doughnut com total no centro) ---------- */
const breakdownSegs = computed(() => {
  const total = kpis.value.grandTotal || 1;
  return [
    { label: "Abastecimento", value: kpis.value.fuelTotal, color: moduleColors[0] },
    { label: "Manutenção", value: kpis.value.maintTotal, color: moduleColors[1] },
    { label: "Operacional", value: kpis.value.opTotal, color: moduleColors[2] },
  ].map((s) => ({ ...s, pct: ((s.value / total) * 100).toFixed(1) }));
});
const breakdownData = computed(() => ({
  labels: breakdownSegs.value.map((s) => s.label),
  datasets: [{
    data: breakdownSegs.value.map((s) => s.value),
    backgroundColor: breakdownSegs.value.map((s) => s.color),
    borderWidth: 0, spacing: 3,
  }],
}));
const breakdownOpts = { ...baseOptions, cutout: "72%", plugins: { legend: { display: false } } };

/* ---------- Top veículos (lista com barras) ---------- */
const topVehicles = computed(() => {
  const model: Record<string, string> = {};
  fleet.value.forEach((v) => { if (v.plate) model[v.plate] = v.vehicle_model || ""; });
  const acc: Record<string, number> = {};
  for (const r of [...fuel.value, ...maint.value, ...oper.value]) {
    if (!r.plate || r.plate === "00000") continue;
    acc[r.plate] = (acc[r.plate] || 0) + Number(r.total_value || 0);
  }
  const list = Object.entries(acc)
    .map(([plate, total]) => ({ plate, total, model: model[plate] ?? "" }))
    .sort((a, b) => b.total - a.total);
  const max = list[0]?.total || 1;
  return list.slice(0, 6).map((v, i) => ({ ...v, rank: i + 1, pct: (v.total / max) * 100 }));
});

/* ---------- Manutenção por grupo ---------- */
const maintByGroup = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of maint.value) {
    const g = r.cost_group || "Outros";
    acc[g] = (acc[g] || 0) + Number(r.total_value || 0);
  }
  const top = Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return {
    labels: top.map((t) => t[0]),
    datasets: [{
      data: top.map((t) => t[1]),
      backgroundColor: top.map((_, i) => seriesColors[i % seriesColors.length]),
      borderRadius: 6, maxBarThickness: 42,
    }],
  };
});
const maintByGroupOpts = {
  ...baseOptions,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false } },
    y: { ticks: { callback: brlTick } },
  },
};

/* ---------- Atividade recente ---------- */
const activity = computed(() =>
  [
    ...fuel.value.map((r) => ({ ...r, _label: r.cost_type || "Abastecimento", _icon: Fuel, _tone: "bg-warning/10 text-warning" })),
    ...maint.value.map((r) => ({ ...r, _label: r.cost_type || "Manutenção", _icon: Wrench, _tone: "bg-destructive/10 text-destructive" })),
    ...oper.value.map((r) => ({ ...r, _label: r.cost_name || "Operacional", _icon: DollarSign, _tone: "bg-success/10 text-success" })),
  ]
    .filter((r) => r.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8),
);
const shortDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
const fmt2 = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
</script>

<template>
  <div class="w-full space-y-8 p-6 md:p-8">
    <!-- Cabeçalho executivo -->
    <div class="a-in flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div class="flex items-center gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-glow">
          <Gauge class="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 class="text-xl font-extrabold tracking-tight text-foreground">Dashboard Executivo</h1>
          <p class="mt-0.5 text-xs uppercase tracking-widest text-muted-foreground">
            Gestão de Frota · Visão Estratégica
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 rounded-xl border bg-card px-4 py-2 shadow-card">
        <span class="h-2 w-2 animate-pulse rounded-full bg-success" />
        <span class="text-xs font-semibold capitalize text-muted-foreground">{{ monthLabel }}</span>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-24"><Spinner /></div>

    <template v-else>
      <!-- KPIs — linha 1 -->
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Custo Total Geral" :value="fmt0(kpis.grandTotal)"
          :sub="`${fmtNum(kpis.totalRecords)} lançamentos`" :icon="TrendingUp"
          tone="bg-primary/15 text-primary-hover" highlight :delay="0.05"
        />
        <StatCard
          label="Custo no Mês" :value="fmt0(kpis.totalCM)" sub="Mês corrente"
          :icon="Activity" tone="bg-accent/10 text-accent"
          :trend="kpis.trendTotal" trend-label="vs. mês anterior" :delay="0.1"
        />
        <StatCard
          label="Abastecimento" :value="fmt0(kpis.fuelCM)"
          :sub="`${fmtNum(Math.round(kpis.fuelLiters))} litros no total`" :icon="Fuel"
          tone="bg-warning/10 text-warning" :trend="kpis.trendFuel"
          trend-label="vs. mês anterior" :delay="0.15"
        />
        <StatCard
          label="Manutenção" :value="fmt0(kpis.maintCM)" sub="Mês corrente"
          :icon="Wrench" tone="bg-destructive/10 text-destructive"
          :trend="kpis.trendMaint" trend-label="vs. mês anterior" :delay="0.2"
        />
      </div>

      <!-- KPIs — linha 2 -->
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Frota Ativa" :value="fmtNum(kpis.activeVehicles)" sub="veículos cadastrados" :icon="Truck" tone="bg-accent/10 text-accent" :delay="0.25" />
        <StatCard label="Total Abastecimento" :value="fmt0(kpis.fuelTotal)" sub="acumulado" :icon="Fuel" tone="bg-warning/10 text-warning" :delay="0.3" />
        <StatCard label="Total Manutenção" :value="fmt0(kpis.maintTotal)" sub="acumulado" :icon="Wrench" tone="bg-destructive/10 text-destructive" :delay="0.35" />
        <StatCard label="Total Operacional" :value="fmt0(kpis.opTotal)" sub="acumulado" :icon="DollarSign" tone="bg-success/10 text-success" :delay="0.4" />
      </div>

      <!-- Evolução + Composição -->
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card padded class="a-in lg:col-span-2" style="animation-delay: 0.3s">
          <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="card-title">Evolução de Custos</h3>
              <p class="card-caption">Abastecimento · Manutenção · Operacional</p>
            </div>
            <div class="flex gap-1 rounded-lg bg-muted p-1">
              <button
                v-for="p in (['mensal', 'anual'] as const)" :key="p"
                class="rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-all duration-200"
                :class="period === p ? 'bg-primary text-primary-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'"
                @click="period = p"
              >
                {{ p }}
              </button>
            </div>
          </div>
          <div class="h-72"><Line :data="evolution" :options="evolutionOpts" /></div>
        </Card>

        <Card padded class="a-in" style="animation-delay: 0.4s">
          <h3 class="card-title">Composição de Custos</h3>
          <p class="card-caption mb-5">Participação por categoria</p>
          <div class="relative mx-auto h-44 w-44">
            <Doughnut :data="breakdownData" :options="breakdownOpts" />
            <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-xs font-semibold text-muted-foreground">Total</span>
              <span class="text-sm font-extrabold text-foreground">{{ fmt0(kpis.grandTotal) }}</span>
            </div>
          </div>
          <div class="mt-5 space-y-2.5">
            <div v-for="s in breakdownSegs" :key="s.label" class="flex items-center gap-3">
              <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: s.color }" />
              <span class="flex-1 text-xs text-muted-foreground">{{ s.label }}</span>
              <span class="text-xs font-bold text-foreground">{{ fmt0(s.value) }}</span>
              <span class="w-10 text-right text-xs text-muted-foreground">{{ s.pct }}%</span>
            </div>
          </div>
        </Card>
      </div>

      <!-- Top veículos + Manutenção por grupo -->
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card padded class="a-in" style="animation-delay: 0.45s">
          <h3 class="card-title">Custos por Veículo</h3>
          <p class="card-caption mb-5">Top 6 no período completo</p>
          <div class="space-y-4">
            <div v-for="v in topVehicles" :key="v.plate">
              <div class="mb-1 flex items-center gap-3">
                <span class="w-4 text-xs font-bold text-muted-foreground">{{ v.rank }}</span>
                <Truck class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-bold text-foreground">{{ v.plate }}</p>
                  <p v-if="v.model" class="truncate text-[10px] leading-tight text-muted-foreground">{{ v.model }}</p>
                </div>
                <span class="shrink-0 text-xs font-extrabold text-foreground">{{ fmt0(v.total) }}</span>
              </div>
              <div class="ml-7 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  class="a-bar h-full rounded-full bg-gradient-to-r from-primary to-primary-hover"
                  :style="{ width: `${v.pct}%`, animationDelay: `${0.5 + v.rank * 0.06}s` }"
                />
              </div>
            </div>
            <p v-if="topVehicles.length === 0" class="py-10 text-center text-sm text-muted-foreground">
              Nenhum dado disponível
            </p>
          </div>
        </Card>

        <Card padded class="a-in" style="animation-delay: 0.5s">
          <h3 class="card-title">Manutenção por Grupo</h3>
          <p class="card-caption mb-5">Top 6 grupos de custo</p>
          <div class="h-64"><Bar :data="maintByGroup" :options="maintByGroupOpts" /></div>
        </Card>
      </div>

      <!-- Atividade recente -->
      <Card padded class="a-in" style="animation-delay: 0.55s">
        <h3 class="card-title">Atividade Recente</h3>
        <p class="card-caption mb-4">Últimos lançamentos consolidados</p>
        <div class="space-y-1">
          <div
            v-for="(r, i) in activity" :key="r.id ?? i"
            class="a-fade flex items-center gap-3 rounded-lg p-2.5 transition-colors duration-200 hover:bg-primary/[0.06]"
            :style="{ animationDelay: `${0.6 + i * 0.04}s` }"
          >
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" :class="r._tone">
              <component :is="r._icon" class="h-4 w-4" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-semibold text-foreground">{{ r._label }}</p>
              <p class="text-xs text-muted-foreground">{{ r.plate && r.plate !== "00000" ? r.plate : r.supplier || "—" }}</p>
            </div>
            <div class="shrink-0 text-right">
              <p class="text-xs font-bold text-foreground">{{ fmt2(Number(r.total_value || 0)) }}</p>
              <p class="text-xs text-muted-foreground">{{ shortDate(r.date) }}</p>
            </div>
          </div>
        </div>
      </Card>
    </template>
  </div>
</template>
