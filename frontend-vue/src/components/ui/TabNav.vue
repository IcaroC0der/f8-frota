<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  tabs: { id: string; label: string; icon?: Component }[];
  modelValue: string;
}>();
const emit = defineEmits<{ "update:modelValue": [id: string] }>();
</script>

<template>
  <div class="flex flex-wrap gap-1 border-b">
    <button
      v-for="t in tabs"
      :key="t.id"
      type="button"
      class="-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all duration-200"
      :class="
        modelValue === t.id
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      "
      @click="emit('update:modelValue', t.id)"
    >
      <component :is="t.icon" v-if="t.icon" class="h-4 w-4" :class="modelValue === t.id && 'text-primary'" />
      {{ t.label }}
    </button>
  </div>
</template>
