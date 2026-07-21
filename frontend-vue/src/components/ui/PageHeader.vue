<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  title: string;
  subtitle?: string;
  icon?: Component;
  /** Sobrescreve a caixa do ícone; padrão = marca F8 (amarelo/preto). */
  iconClass?: string;
}>();
</script>

<template>
  <div class="a-in mb-8 flex items-center gap-4">
    <div
      v-if="icon"
      class="flex h-11 w-11 items-center justify-center rounded-lg shadow-glow"
      :class="iconClass ?? 'bg-primary text-primary-foreground'"
    >
      <component :is="icon" class="h-5 w-5" />
    </div>
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">{{ title }}</h1>
      <p v-if="subtitle" class="mt-0.5 text-xs uppercase tracking-widest text-muted-foreground">
        {{ subtitle }}
      </p>
    </div>
    <div class="ml-auto"><slot name="actions" /></div>
  </div>
</template>
