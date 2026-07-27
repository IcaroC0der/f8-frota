<script setup lang="ts">
import { Layers, Truck, Fuel, Wrench, DollarSign, ArrowRight } from "lucide-vue-next";
import PageHeader from "@/components/ui/PageHeader.vue";

const groups = [
  { label: "Veículos", desc: "Categorias de veículos da frota", to: "/parametrizacoes/categorias", icon: Truck, tone: "bg-blue-500/10 text-blue-500", ready: true },
  { label: "Abastecimentos", desc: "Custos e tipos de combustíveis", to: "/parametrizacoes/abastecimentos", icon: Fuel, tone: "bg-orange-500/10 text-orange-500", ready: true },
  { label: "Manutenção", desc: "Classificações e tipos de manutenção", to: "/parametrizacoes/manutencao", icon: Wrench, tone: "bg-red-500/10 text-red-500", ready: true },
  { label: "Custos Operacionais", desc: "Custos administrativos diversos", to: "/parametrizacoes/operacionais", icon: DollarSign, tone: "bg-green-500/10 text-green-500", ready: true },
];
</script>

<template>
  <div class="w-full p-6 md:p-10">
    <PageHeader title="Estrutura dos Módulos" subtitle="Configure categorias, custos e regras de funcionamento de cada módulo" :icon="Layers" />
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <component
        :is="g.ready ? 'RouterLink' : 'div'"
        v-for="(g, i) in groups"
        :key="g.label"
        :to="g.ready ? g.to : undefined"
        class="a-in flex items-center gap-4 rounded-xl border bg-card p-5 shadow-card transition-all duration-300"
        :class="g.ready ? 'cursor-pointer hover:shadow-card-md hover:border-primary/50' : 'opacity-60'"
        :style="{ animationDelay: `${0.05 + i * 0.05}s` }"
      >
        <div class="flex h-11 w-11 items-center justify-center rounded-xl" :class="g.tone">
          <component :is="g.icon" class="h-6 w-6" />
        </div>
        <div class="flex-1">
          <p class="font-semibold">{{ g.label }}</p>
          <p class="text-xs text-muted-foreground">{{ g.desc }}</p>
        </div>
        <ArrowRight v-if="g.ready" class="h-4 w-4 text-muted-foreground" />
      </component>
    </div>
  </div>
</template>

