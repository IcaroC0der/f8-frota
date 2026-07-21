<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    variant?: "default" | "outline" | "ghost" | "destructive";
    size?: "default" | "sm" | "icon";
    type?: "button" | "submit";
    disabled?: boolean;
  }>(),
  { variant: "default", size: "default", type: "button", disabled: false },
);

// Guia F8: primário amarelo c/ texto preto + glow no hover; risco vermelho.
const variants: Record<string, string> = {
  default:
    "bg-primary text-primary-foreground font-semibold hover:bg-primary-hover hover:shadow-glow",
  outline:
    "border border-input bg-transparent text-foreground hover:bg-card hover:border-muted-foreground/40",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  destructive:
    "bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/85",
};
const sizes: Record<string, string> = {
  default: "h-9 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
  icon: "h-8 w-8",
};

const classes = computed(() =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
    variants[props.variant],
    sizes[props.size],
  ),
);
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>
