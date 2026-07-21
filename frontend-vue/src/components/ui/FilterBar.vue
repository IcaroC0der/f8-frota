<script setup lang="ts">
import { Filter, X } from "lucide-vue-next";

withDefaults(defineProps<{ hasActive?: boolean; delay?: number }>(), {
  hasActive: false,
  delay: 0,
});
const emit = defineEmits<{ clear: [] }>();
</script>

<template>
  <div class="a-in rounded-xl border bg-card p-5 shadow-card" :style="{ animationDelay: `${delay}s` }">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="card-title flex items-center gap-1.5">
        <Filter class="h-3.5 w-3.5 text-primary" /> Filtros
      </h3>
      <button
        v-if="hasActive"
        type="button"
        class="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-muted-foreground transition-colors duration-200 hover:text-destructive"
        @click="emit('clear')"
      >
        <X class="h-3 w-3" /> Limpar filtros
      </button>
    </div>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      <slot />
    </div>
  </div>
</template>
