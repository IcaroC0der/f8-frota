<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { BarChart2, Wrench, Fuel, Truck } from "lucide-vue-next";
import { fuelRecords, maintenanceRecords, operationalCostRecords, vehicles } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader.vue";
import TabNav from "@/components/ui/TabNav.vue";
import Spinner from "@/components/ui/Spinner.vue";
import AnaliseGeral from "@/pages/analises/AnaliseGeral.vue";
import AnaliseManutencao from "@/pages/analises/AnaliseManutencao.vue";
import AnaliseAbastecimento from "@/pages/analises/AnaliseAbastecimento.vue";
import AnaliseVeiculos from "@/pages/analises/AnaliseVeiculos.vue";

const route = useRoute();
const loading = ref(true);
const fuel = ref<any[]>([]);
const maint = ref<any[]>([]);
const oper = ref<any[]>([]);
const fleet = ref<any[]>([]);

const tabs = [
  { id: "geral", label: "Visão Geral", icon: BarChart2 },
  { id: "manutencao", label: "Manutenção", icon: Wrench },
  { id: "abastecimento", label: "Abastecimento", icon: Fuel },
  { id: "veiculos", label: "Veículos", icon: Truck },
];
const tab = ref(typeof route.query.tab === "string" && tabs.some((t) => t.id === route.query.tab) ? (route.query.tab as string) : "geral");

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
</script>

<template>
  <div class="w-full space-y-5 p-6 md:p-10">
    <PageHeader title="Análises e Levantamentos" subtitle="Visão estratégica · dados operacionais" :icon="BarChart2" />

    <TabNav v-model="tab" :tabs="tabs" />

    <div v-if="loading" class="flex justify-center py-20"><Spinner /></div>
    <template v-else>
      <AnaliseGeral v-if="tab === 'geral'" :fuel="fuel" :maint="maint" :oper="oper" :vehicles="fleet" />
      <AnaliseManutencao v-else-if="tab === 'manutencao'" :records="maint" :vehicles="fleet" />
      <AnaliseAbastecimento v-else-if="tab === 'abastecimento'" :records="fuel" :vehicles="fleet" />
      <AnaliseVeiculos v-else-if="tab === 'veiculos'" :fuel="fuel" :maint="maint" :oper="oper" :vehicles="fleet" />
    </template>
  </div>
</template>
