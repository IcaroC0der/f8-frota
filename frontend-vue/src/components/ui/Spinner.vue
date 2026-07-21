<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 8 });
</script>

<template>
  <div
    class="border-4 border-primary/20 border-t-primary rounded-full animate-spin"
    :style="{ width: `${size * 4}px`, height: `${size * 4}px` }"
  />
</template>
