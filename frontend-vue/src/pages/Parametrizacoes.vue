<script setup lang="ts">
import { RouterLink } from "vue-router";
import { Settings, Tag, Fuel, Wrench, DollarSign, ArrowRight } from "lucide-vue-next";
import PageHeader from "@/components/ui/PageHeader.vue";

const groups = [
  { label: "Categorias de Veículo", desc: "Tipos/categorias da frota", to: "/parametrizacoes/categorias", icon: Tag, tone: "bg-accent/10 text-accent", ready: true },
  { label: "Tipos de Custo (Combustível)", desc: "Em breve", to: "#", icon: Fuel, tone: "bg-warning/10 text-warning", ready: false },
  { label: "Classif./Custos de Manutenção", desc: "Em breve", to: "#", icon: Wrench, tone: "bg-destructive/10 text-destructive", ready: false },
  { label: "Custos Operacionais", desc: "Em breve", to: "#", icon: DollarSign, tone: "bg-success/10 text-success", ready: false },
];
</script>

<template>
  <div class="w-full p-6 md:p-10">
    <PageHeader title="Parametrizações" subtitle="Configuração das tabelas de apoio" :icon="Settings" />
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
