<script setup lang="ts">
import { computed, ref } from "vue";
import { X, ArrowLeft, ChevronRight } from "lucide-vue-next";
import { Doughnut, Bar } from "vue-chartjs";
import { formatBRL, formatBRLk, formatNum } from "@/lib/utils";
import { seriesColors, baseOptions, brlTick } from "@/lib/charts";

const props = withDefaults(
  defineProps<{
    /** Registros já enriquecidos com `_cat` (categoria). */
    records: any[];
    title: string;
    /** Campo usado para empilhar no drill (por placa). */
    stackKey?: string;
    /** Exibe coluna de litros (abastecimento). */
    withLiters?: boolean;
  }>(),
  { stackKey: "cost_type", withLiters: false },
);

const val = (r: any) => Number(r.total_value || 0);
const lit = (r: any) => (r.unit === "LT" ? Number(r.quantity || 0) : 0);
const total = computed(() => props.records.reduce((s, r) => s + val(r), 0));

const catEntries = computed(() => {
  const acc: Record<string, { qty: number; cost: number; liters: number }> = {};
  for (const r of props.records) {
    const b = (acc[r._cat || "Sem Categoria"] ??= { qty: 0, cost: 0, liters: 0 });
    b.qty++; b.cost += val(r); b.liters += lit(r);
  }
  return Object.entries(acc).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.cost - a.cost);
});
const donut = computed(() => ({
  labels: catEntries.value.map((e) => e.name),
  datasets: [{ data: catEntries.value.map((e) => e.cost), backgroundColor: catEntries.value.map((_, i) => seriesColors[i % seriesColors.length]), borderWidth: 0 }],
}));
const donutOptions = { ...baseOptions, cutout: "60%", plugins: { legend: { display: false } } };
const pctOf = (v: number) => (total.value > 0 ? ((v / total.value) * 100).toFixed(1) : "0.0");

/* ---- Drill-down por placa ---- */
const drillCat = ref<string | null>(null);
const drillRecords = computed(() => props.records.filter((r) => (r._cat || "Sem Categoria") === drillCat.value));
const drillTotal = computed(() => drillRecords.value.reduce((s, r) => s + val(r), 0));
const drillLiters = computed(() => drillRecords.value.reduce((s, r) => s + lit(r), 0));

const drillPlates = computed(() => {
  const map: Record<string, any> = {};
  for (const r of drillRecords.value) {
    const p = r.plate || "N/A";
    const m = (map[p] ??= { plate: p, model: r.vehicle_model || "", total: 0, liters: 0, qty: 0 });
    if (!m.model && r.vehicle_model) m.model = r.vehicle_model;
    const k = r[props.stackKey] || "Outros";
    m[k] = (m[k] || 0) + val(r);
    m.total += val(r); m.liters += lit(r); m.qty++;
  }
  return Object.values(map).sort((a: any, b: any) => b.total - a.total);
});
const stackTypes = computed(() => [...new Set(drillRecords.value.map((r) => r[props.stackKey]).filter(Boolean))] as string[]);
const drillChart = computed(() => ({
  labels: drillPlates.value.map((p: any) => p.plate),
  datasets: stackTypes.value.map((t, i) => ({
    label: t, data: drillPlates.value.map((p: any) => p[t] || 0),
    backgroundColor: seriesColors[i % seriesColors.length], stack: "a", borderRadius: 3,
  })),
}));
const drillOptions = {
  ...baseOptions, indexAxis: "y" as const,
  plugins: { legend: { position: "bottom" as const, labels: { usePointStyle: true, boxWidth: 8, padding: 12 } } },
  scales: { x: { stacked: true, ticks: { callback: brlTick }, grid: { display: false } }, y: { stacked: true, grid: { display: false } } },
};
const drillHeight = computed(() => Math.max(280, drillPlates.value.length * 32));
</script>

<template>
  <div class="a-in rounded-xl border bg-card p-5 shadow-card">
    <h3 class="card-title mb-1">{{ title }}</h3>
    <p class="card-caption mb-4">Clique numa categoria para ver o detalhamento por placa</p>

    <div class="flex flex-col items-center gap-6 md:flex-row md:items-stretch">
      <div class="relative h-52 w-52 shrink-0 md:h-auto md:w-auto md:aspect-square">
        <Doughnut :data="donut" :options="donutOptions" />
        <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-[11px] font-semibold text-muted-foreground">Total</span>
          <span class="text-sm font-extrabold text-foreground">{{ formatBRLk(total) }}</span>
        </div>
      </div>

      <div class="scrollbar-brand max-h-72 w-full overflow-auto">
        <table class="w-full text-xs">
          <thead class="sticky top-0 bg-card">
            <tr class="border-b text-muted-foreground">
              <th class="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Categoria</th>
              <th class="px-2 py-1.5 text-right font-semibold uppercase tracking-wider">Qtd</th>
              <th v-if="withLiters" class="px-2 py-1.5 text-right font-semibold uppercase tracking-wider">Litros</th>
              <th class="px-2 py-1.5 text-right font-semibold uppercase tracking-wider">Custo (R$)</th>
              <th class="px-2 py-1.5 text-right font-semibold uppercase tracking-wider">%</th>
              <th class="w-6"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in catEntries" :key="row.name"
              class="group cursor-pointer border-b border-border/60 hover:bg-primary/[0.05]"
              @click="drillCat = row.name"
            >
              <td class="px-2 py-1.5">
                <span class="inline-flex items-center gap-2">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: seriesColors[i % seriesColors.length] }" />
                  <span class="font-medium text-foreground">{{ row.name }}</span>
                </span>
              </td>
              <td class="px-2 py-1.5 text-right text-muted-foreground">{{ row.qty }}</td>
              <td v-if="withLiters" class="px-2 py-1.5 text-right text-muted-foreground">{{ formatNum(row.liters) }} L</td>
              <td class="px-2 py-1.5 text-right font-semibold text-foreground">{{ formatBRL(row.cost) }}</td>
              <td class="px-2 py-1.5 text-right text-muted-foreground">{{ pctOf(row.cost) }}%</td>
              <td class="px-1"><ChevronRight class="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary" /></td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 font-bold text-foreground">
              <td class="px-2 py-1.5">TOTAL</td>
              <td class="px-2 py-1.5 text-right">{{ records.length }}</td>
              <td v-if="withLiters" class="px-2 py-1.5 text-right">{{ formatNum(catEntries.reduce((s, e) => s + e.liters, 0)) }} L</td>
              <td class="px-2 py-1.5 text-right">{{ formatBRL(total) }}</td>
              <td class="px-2 py-1.5 text-right">100%</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Drill-down modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="drillCat" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" @click.self="drillCat = null">
          <div class="modal-panel flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border bg-card shadow-card-md">
            <div class="flex items-center gap-3 border-b p-4">
              <button class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" @click="drillCat = null"><ArrowLeft class="h-4 w-4" /></button>
              <div>
                <h2 class="text-sm font-bold uppercase tracking-widest text-foreground">Detalhamento — {{ drillCat }}</h2>
                <p class="text-[11px] text-muted-foreground">
                  Custo por placa · {{ formatBRL(drillTotal) }}<template v-if="withLiters"> · {{ formatNum(drillLiters) }} L</template> · {{ drillRecords.length }} lançamentos
                </p>
              </div>
              <button class="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" @click="drillCat = null"><X class="h-4 w-4" /></button>
            </div>
            <div class="scrollbar-brand flex-1 overflow-auto p-5">
              <div :style="{ height: `${drillHeight}px` }"><Bar :data="drillChart" :options="drillOptions" /></div>
              <table class="mt-5 w-full border-t pt-4 text-xs">
                <thead>
                  <tr class="border-b text-muted-foreground">
                    <th class="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Placa</th>
                    <th class="px-2 py-1.5 text-right font-semibold uppercase tracking-wider">Qtd</th>
                    <th v-if="withLiters" class="px-2 py-1.5 text-right font-semibold uppercase tracking-wider">Litros</th>
                    <th class="px-2 py-1.5 text-right font-semibold uppercase tracking-wider">Custo Total</th>
                    <th class="px-2 py-1.5 text-right font-semibold uppercase tracking-wider">%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in drillPlates" :key="row.plate" class="border-b border-border/60 hover:bg-primary/[0.04]">
                    <td class="px-2 py-1.5">
                      <span class="inline-flex items-center gap-2">
                        <span class="h-2 w-2 shrink-0 rounded-full" :style="{ background: seriesColors[i % seriesColors.length] }" />
                        <span>
                          <span class="block font-semibold text-foreground">{{ row.plate }}</span>
                          <span v-if="row.model" class="block text-[10px] leading-tight text-muted-foreground">{{ row.model }}</span>
                        </span>
                      </span>
                    </td>
                    <td class="px-2 py-1.5 text-right text-muted-foreground">{{ row.qty }}</td>
                    <td v-if="withLiters" class="px-2 py-1.5 text-right text-muted-foreground">{{ formatNum(row.liters) }} L</td>
                    <td class="px-2 py-1.5 text-right font-semibold text-foreground">{{ formatBRL(row.total) }}</td>
                    <td class="px-2 py-1.5 text-right text-muted-foreground">{{ drillTotal > 0 ? ((row.total / drillTotal) * 100).toFixed(1) : 0 }}%</td>
                  </tr>
                </tbody>
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
