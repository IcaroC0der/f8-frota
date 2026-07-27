<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { Fuel, Wrench, DollarSign, Truck, BarChart2, Settings, Bell } from "lucide-vue-next";
import { vehicles, fuelRecords, maintenanceRecords, operationalCostRecords } from "@/services/api";
import { formatBRL, formatNum } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner.vue";

const modules = [
  { label: "Abastecimento", path: "/abastecimentos", icon: Fuel },
  { label: "Manutenção", path: "/manutencao", icon: Wrench },
  { label: "Custos Operacionais", path: "/custos-operacionais", icon: DollarSign },
  { label: "Análise", path: "/analises", icon: BarChart2 },
  { label: "Configurações", path: "/parametrizacoes", icon: Settings },
];

const loading = ref(true);
const fuel = ref<any[]>([]);
const maint = ref<any[]>([]);
const oper = ref<any[]>([]);
const fleet = ref<any[]>([]);
const period = ref<"30d" | "all">("30d");

onMounted(async () => {
  try {
    [fuel.value, maint.value, oper.value, fleet.value] = await Promise.all([
      fuelRecords.list({ limit: 10000 }),
      maintenanceRecords.list({ limit: 10000 }),
      operationalCostRecords.list({ limit: 10000 }),
      vehicles.list({ limit: 1000 }),
    ]);
  } finally {
    loading.value = false;
  }
});

const since = computed(() => {
  if (period.value === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
});
const inPeriod = (arr: any[]) => (since.value ? arr.filter((r) => (r.date ?? "") >= since.value!) : arr);

const kpis = computed(() => {
  const maintP = inPeriod(maint.value);
  const opP = inPeriod(oper.value);
  return {
    activeVehicles: fleet.value.filter((v) => v.is_active !== false).length,
    totalAbastecido: fuel.value.reduce((s, r) => s + Number(r.quantity || 0), 0),
    custoOperacional: opP.reduce((s, r) => s + Number(r.total_value || 0), 0),
    custoManutencoes: maintP.reduce((s, r) => s + Number(r.total_value || 0), 0),
  };
});

const now = new Date();
const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";
const dateLabel = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
</script>

<template>
  <div class="w-full">
    <!-- Top bar -->
    <div class="a-in flex items-center justify-between border-b p-6">
      <div>
        <h1 class="text-xl font-bold text-foreground">{{ greeting }}, bem-vindo!</h1>
        <p class="mt-0.5 text-xs capitalize text-muted-foreground">{{ dateLabel }}</p>
      </div>
      <button class="rounded-xl border bg-card p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <Bell class="h-5 w-5" />
      </button>
    </div>

    <div class="space-y-8 p-6 md:p-8">
      <!-- Cards de atalho -->
      <div class="scrollbar-brand flex gap-4 overflow-x-auto pb-2">
        <RouterLink
          v-for="(m, i) in modules"
          :key="m.label"
          :to="m.path"
          class="a-in group relative flex h-44 w-44 shrink-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/60 hover:shadow-card-md"
          :style="{ animationDelay: `${i * 0.06}s` }"
        >
          <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15 text-primary-hover transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
            <component :is="m.icon" class="h-10 w-10" />
          </div>
          <span class="px-2 text-center text-sm font-bold leading-tight text-foreground">{{ m.label }}</span>
          <span class="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </RouterLink>
      </div>

      <!-- Resumo da Frota -->
      <div class="a-in rounded-xl border bg-card p-6 shadow-card" style="animation-delay: 0.28s">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-base font-bold text-foreground">Resumo da Frota</h2>
          <select v-model="period" class="ui-input h-9 w-auto">
            <option value="30d">Últimos 30 dias</option>
            <option value="all">Período todo</option>
          </select>
        </div>

        <div v-if="loading" class="flex justify-center py-8"><Spinner /></div>
        <div v-else class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div class="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/15 text-info"><Truck class="h-5 w-5" /></div>
            <div>
              <p class="text-xl font-extrabold leading-none text-foreground">{{ formatNum(kpis.activeVehicles) }}</p>
              <p class="mt-0.5 text-xs font-semibold text-muted-foreground">Total de Veículos</p>
              <p class="text-[10px] text-muted-foreground/70">Ativos na frota</p>
            </div>
          </div>
          <div class="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"><Fuel class="h-5 w-5" /></div>
            <div>
              <p class="text-xl font-extrabold leading-none text-foreground">{{ formatNum(Math.round(kpis.totalAbastecido)) }} L</p>
              <p class="mt-0.5 text-xs font-semibold text-muted-foreground">Total Abastecido</p>
              <p class="text-[10px] text-muted-foreground/70">Acumulado geral</p>
            </div>
          </div>
          <div class="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning"><DollarSign class="h-5 w-5" /></div>
            <div>
              <p class="text-lg font-extrabold leading-none text-foreground">{{ formatBRL(kpis.custoOperacional) }}</p>
              <p class="mt-0.5 text-xs font-semibold text-muted-foreground">Custo Operacional</p>
              <p class="text-[10px] text-muted-foreground/70">No período</p>
            </div>
          </div>
          <RouterLink to="/analises?tab=manutencao" class="group flex items-center gap-3 rounded-xl border bg-muted/30 p-4 transition-colors hover:bg-muted/60">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive"><Wrench class="h-5 w-5" /></div>
            <div>
              <p class="text-lg font-extrabold leading-none text-foreground">{{ formatBRL(kpis.custoManutencoes) }}</p>
              <p class="mt-0.5 text-xs font-semibold text-muted-foreground">Manutenções</p>
              <p class="text-[10px] font-semibold text-primary-hover">Ver análises →</p>
            </div>
          </RouterLink>
        </div>
      </div>

      <!-- Banner CTA -->
      <div class="a-in relative overflow-hidden rounded-xl border bg-gradient-to-r from-accent to-accent/80 p-6" style="animation-delay: 0.4s">
        <div class="pointer-events-none absolute right-10 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div class="relative z-10 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-accent-foreground">Gestão Completa da sua Frota</h3>
            <p class="mt-1 text-sm text-accent-foreground/70">Monitore, analise e otimize seus custos em tempo real</p>
            <RouterLink
              to="/analises"
              class="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary-hover hover:shadow-glow"
            >
              <BarChart2 class="h-4 w-4" /> Ver Análises
            </RouterLink>
          </div>
          <div class="hidden gap-3 text-6xl opacity-70 md:flex">
            <span>🚛</span><span class="self-end text-5xl">🚐</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
