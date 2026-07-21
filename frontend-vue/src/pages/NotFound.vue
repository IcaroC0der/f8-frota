<script setup lang="ts">
import { RouterLink } from "vue-router";
import { Truck } from "lucide-vue-next";
import Button from "@/components/ui/Button.vue";
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
    <div class="a-in flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-glow">
      <Truck class="h-7 w-7 text-primary-foreground" />
    </div>
    <p class="a-in text-6xl font-extrabold text-primary" style="animation-delay: 0.08s">404</p>
    <p class="a-in text-lg font-semibold text-foreground" style="animation-delay: 0.14s">
      Página não encontrada
    </p>
    <RouterLink to="/" class="a-in" style="animation-delay: 0.2s">
      <Button>Voltar ao início</Button>
    </RouterLink>
  </div>
</template>
