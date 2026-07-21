<script setup lang="ts">
defineProps<{ label?: string; required?: boolean }>();
</script>

<template>
  <label class="block">
    <span v-if="label" class="text-sm font-medium text-foreground">
      {{ label }} <span v-if="required" class="text-destructive">*</span>
    </span>
    <div class="mt-1.5"><slot /></div>
  </label>
</template>
