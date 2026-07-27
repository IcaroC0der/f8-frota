<script setup lang="ts">
defineProps<{ modelValue: string }>();
const emit = defineEmits<{ "update:modelValue": [v: string] }>();
const periods = [
  { label: "Tudo", value: "all" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "1 ano", value: "1y" },
  { label: "Este mês", value: "month" },
];
</script>

<template>
  <div class="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
    <button
      v-for="p in periods"
      :key="p.value"
      type="button"
      class="rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200"
      :class="
        modelValue === p.value
          ? 'bg-primary text-primary-foreground shadow-card'
          : 'text-muted-foreground hover:text-foreground'
      "
      @click="emit('update:modelValue', p.value)"
    >
      {{ p.label }}
    </button>
  </div>
</template>
