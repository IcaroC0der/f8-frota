<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { BarChart2 } from "lucide-vue-next";
import { Bar, Line, Doughnut } from "vue-chartjs";
import { fuelRecords, maintenanceRecords, operationalCostRecords } from "@/services/api";
import { palette, moduleColors, baseOptions } from "@/lib/charts";
import { formatBRL } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader.vue";
import Card from "@/components/ui/Card.vue";
import Spinner from "@/components/ui/Spinner.vue";

const loading = ref(true);
const fuel = ref<any[]>([]);
const maint = ref<any[]>([]);
const oper = ref<any[]>([]);

onMounted(async () => {
  try {
    [fuel.value, maint.value, oper.value] = await Promise.all([
      fuelRecords.list({ limit: 5000 }),
      maintenanceRecords.list({ limit: 5000 }),
      operationalCostRecords.list({ limit: 5000 }),
    ]);
  } finally {
    loading.value = false;
  }
});

const sum = (arr: any[]) => arr.reduce((s, r) => s + Number(r.total_value || 0), 0);
const monthOf = (iso: string) => (iso || "").slice(0, 7); // YYYY-MM

// 1) Custo por módulo (doughnut)
const byModule = computed(() => ({
  labels: ["Combustível", "Manutenção", "Operacional"],
  datasets: [{ data: [sum(fuel.value), sum(maint.value), sum(oper.value)], backgroundColor: moduleColors }],
}));

// 2) Evolução mensal (line, 3 séries)
const evolution = computed(() => {
  const months = [...new Set([...fuel.value, ...maint.value, ...oper.value].map((r) => monthOf(r.date)).filter(Boolean))].sort();
  const series = (arr: any[]) => months.map((m) => arr.filter((r) => monthOf(r.date) === m).reduce((s, r) => s + Number(r.total_value || 0), 0));
  return {
    labels: months.map((m) => { const [y, mo] = m.split("-"); return `${mo}/${y}`; }),
    datasets: [
      { label: "Combustível", data: series(fuel.value), borderColor: palette.warning, backgroundColor: palette.warning, tension: 0.3 },
      { label: "Manutenção", data: series(maint.value), borderColor: palette.destructive, backgroundColor: palette.destructive, tension: 0.3 },
      { label: "Operacional", data: series(oper.value), borderColor: palette.success, backgroundColor: palette.success, tension: 0.3 },
    ],
  };
});

// 3) Top 10 veículos por custo (bar)
const topVehicles = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of [...fuel.value, ...maint.value, ...oper.value]) {
    if (!r.plate) continue;
    acc[r.plate] = (acc[r.plate] || 0) + Number(r.total_value || 0);
  }
  const top = Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return {
    labels: top.map((t) => t[0]),
    datasets: [{ label: "Custo total", data: top.map((t) => t[1]), backgroundColor: palette.primary }],
  };
});

// 4) Manutenção: preventivo vs corretivo (doughnut)
const byClassification = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of maint.value) acc[r.classification] = (acc[r.classification] || 0) + Number(r.total_value || 0);
  return {
    labels: Object.keys(acc),
    datasets: [{ data: Object.values(acc), backgroundColor: [palette.success, palette.destructive, palette.warning] }],
  };
});

const grandTotal = computed(() => sum(fuel.value) + sum(maint.value) + sum(oper.value));
</script>

<template>
  <div class="w-full p-6 md:p-10">
    <PageHeader title="Análises" subtitle="Indicadores e gráficos da frota" :icon="BarChart2" />

    <div v-if="loading" class="flex justify-center py-20"><Spinner /></div>
    <template v-else>
      <div class="a-in mb-6 inline-flex items-center gap-3 rounded-xl border border-l-4 border-l-primary bg-card px-4 py-2.5 shadow-card">
        <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custo total consolidado</span>
        <span class="text-lg font-extrabold text-foreground">{{ formatBRL(grandTotal) }}</span>
      </div>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card padded class="a-in" style="animation-delay: 0.1s">
          <h3 class="card-title mb-4">Custo por Módulo</h3>
          <div class="h-72"><Doughnut :data="byModule" :options="baseOptions" /></div>
        </Card>
        <Card padded class="a-in" style="animation-delay: 0.15s">
          <h3 class="card-title mb-4">Manutenção: Preventivo × Corretivo</h3>
          <div class="h-72"><Doughnut :data="byClassification" :options="baseOptions" /></div>
        </Card>
        <Card padded class="a-in lg:col-span-2" style="animation-delay: 0.2s">
          <h3 class="card-title mb-4">Evolução Mensal de Custos</h3>
          <div class="h-80"><Line :data="evolution" :options="baseOptions" /></div>
        </Card>
        <Card padded class="a-in lg:col-span-2" style="animation-delay: 0.25s">
          <h3 class="card-title mb-4">Top 10 Veículos por Custo</h3>
          <div class="h-80"><Bar :data="topVehicles" :options="baseOptions" /></div>
        </Card>
      </div>
    </template>
  </div>
</template>
