<script setup lang="ts">
import { cn } from "@/lib/utils";

// `highlight` = "Card com Destaque" do guia (borda esquerda amarela 4px).
defineProps<{ padded?: boolean; highlight?: boolean }>();
</script>

<template>
  <div
    :class="
      cn(
        'rounded-xl border bg-card text-card-foreground shadow-card transition-shadow duration-300 hover:shadow-card-md',
        padded && 'p-5',
        highlight && 'border-l-4 border-l-primary',
      )
    "
  >
    <slot />
  </div>
</template>
