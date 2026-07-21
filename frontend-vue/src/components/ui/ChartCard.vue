<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    caption?: string;
    /** Altura da área do gráfico, em px. */
    height?: number;
    /** Atraso da animação de entrada, em segundos. */
    delay?: number;
  }>(),
  { height: 264, delay: 0 },
);
</script>

<template>
  <div
    class="a-in rounded-xl border bg-card p-5 shadow-card transition-shadow duration-300 hover:shadow-card-md"
    :style="{ animationDelay: `${delay}s` }"
  >
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 class="card-title">{{ title }}</h3>
        <p v-if="caption" class="card-caption">{{ caption }}</p>
      </div>
      <slot name="actions" />
    </div>
    <div :style="{ height: `${height}px` }">
      <slot />
    </div>
  </div>
</template>
