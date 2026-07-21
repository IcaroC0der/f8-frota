<script setup lang="ts">
import { formatBRL } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    items: { label: string; value: number; color: string }[];
    total: number;
    /** Formato compacto "R$ X,Y mil" (como no original) em vez do valor cheio. */
    compact?: boolean;
  }>(),
  { compact: false },
);

function fmtVal(v: number) {
  if (props.compact && v >= 1000) {
    const mil = (v / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `R$ ${mil} mil`;
  }
  return formatBRL(v);
}
const pctOf = (v: number) => (props.total > 0 ? Math.round((v / props.total) * 100) : 0);
</script>

<template>
  <ul class="scrollbar-brand max-h-full space-y-2.5 overflow-y-auto pr-1">
    <li v-for="it in items" :key="it.label" class="flex items-center gap-2 text-xs">
      <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: it.color }" />
      <span class="min-w-0 flex-1 truncate text-muted-foreground" :title="it.label">{{ it.label }}</span>
      <span class="shrink-0 font-semibold text-foreground">{{ fmtVal(it.value) }}</span>
      <span class="w-9 shrink-0 text-right font-semibold text-muted-foreground">{{ pctOf(it.value) }}%</span>
    </li>
  </ul>
</template>
