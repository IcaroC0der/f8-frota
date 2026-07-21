<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";
import { TrendingUp, TrendingDown, Minus } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    sub?: string;
    icon?: Component;
    /** Classes do quadrado do ícone (ex.: "bg-warning/10 text-warning"). */
    tone?: string;
    /** Variação % vs. período anterior. Para custos: subir = ruim (vermelho). */
    trend?: number;
    trendLabel?: string;
    /** Borda esquerda amarela (Card com Destaque do guia). */
    highlight?: boolean;
    /** Atraso da animação de entrada, em segundos. */
    delay?: number;
  }>(),
  { tone: "bg-primary/15 text-primary-hover", delay: 0 },
);

const trendIcon = computed(() =>
  props.trend === undefined ? null : props.trend > 0 ? TrendingUp : props.trend < 0 ? TrendingDown : Minus,
);
const trendClass = computed(() =>
  props.trend === undefined
    ? ""
    : props.trend > 0
      ? "text-destructive"
      : props.trend < 0
        ? "text-success"
        : "text-muted-foreground",
);
</script>

<template>
  <div
    class="a-in group rounded-xl border bg-card p-4 shadow-card transition-all duration-300 hover:shadow-card-md"
    :class="highlight && 'border-l-4 border-l-primary'"
    :style="{ animationDelay: `${delay}s` }"
  >
    <div class="mb-2 flex items-start justify-between">
      <div
        v-if="icon"
        class="flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-105"
        :class="tone"
      >
        <component :is="icon" class="h-3.5 w-3.5" />
      </div>
      <div
        v-if="trendIcon"
        class="flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold"
        :class="trendClass"
      >
        <component :is="trendIcon" class="h-3 w-3" />
        <span>{{ Math.abs(trend!) }}%</span>
      </div>
    </div>

    <p class="f8-stat-label leading-tight">{{ label }}</p>
    <p class="mt-1 text-xl font-extrabold leading-tight tracking-tight text-foreground">{{ value }}</p>
    <p v-if="sub" class="mt-0.5 text-[11px] leading-tight text-muted-foreground">{{ sub }}</p>
    <p v-if="trendLabel" class="text-[10px] italic leading-tight text-muted-foreground/70">
      {{ trendLabel }}
    </p>
  </div>
</template>
