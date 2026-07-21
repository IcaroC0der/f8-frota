<script setup lang="ts">
import { cn } from "@/lib/utils";

withDefaults(defineProps<{ tone?: string; pill?: boolean }>(), {
  tone: "bg-muted text-muted-foreground border-border",
  pill: false,
});
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex items-center gap-1 border px-2.5 py-0.5 text-xs font-semibold',
        pill ? 'rounded-full' : 'rounded-md',
        tone,
      )
    "
  >
    <slot />
  </span>
</template>
