<script setup lang="ts">
import { ref } from "vue";
import { Maximize2, X } from "lucide-vue-next";

withDefaults(
  defineProps<{
    title: string;
    caption?: string;
    /** Altura da área do gráfico, em px. */
    height?: number;
    /** Atraso da animação de entrada, em segundos. */
    delay?: number;
    /** Exibe o botão de maximizar (abre o gráfico ampliado em modal). */
    maximizable?: boolean;
  }>(),
  { height: 264, delay: 0, maximizable: true },
);

const expanded = ref(false);
</script>

<template>
  <div
    v-bind="$attrs"
    class="a-in flex h-full flex-col rounded-xl border bg-card p-5 shadow-card transition-shadow duration-300 hover:shadow-card-md"
    :style="{ animationDelay: `${delay}s` }"
  >
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 class="card-title">{{ title }}</h3>
        <p v-if="caption" class="card-caption">{{ caption }}</p>
      </div>
      <div class="flex items-center gap-1">
        <slot name="actions" />
        <button
          v-if="maximizable"
          type="button"
          class="rounded-lg p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
          title="Maximizar"
          @click="expanded = true"
        >
          <Maximize2 class="h-4 w-4" />
        </button>
      </div>
    </div>
    <!-- flex-1 + min-height: o gráfico estica p/ preencher a altura do card (sem vão branco) -->
    <div class="min-h-0 flex-1" :style="{ minHeight: `${height}px` }">
      <slot />
    </div>
  </div>

  <!-- Modal ampliado -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="expanded"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
        @click.self="expanded = false"
      >
        <div class="modal-panel flex max-h-[92vh] w-full max-w-5xl flex-col rounded-xl border bg-card shadow-card-md">
          <div class="flex items-start justify-between gap-3 border-b p-4">
            <div>
              <h3 class="card-title">{{ title }}</h3>
              <p v-if="caption" class="card-caption">{{ caption }}</p>
            </div>
            <div class="flex items-center gap-1">
              <slot name="actions" />
              <button
                type="button"
                class="rounded-lg p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
                @click="expanded = false"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>
          <div class="scrollbar-brand flex-1 overflow-auto p-5">
            <div class="h-[min(70vh,620px)]"><slot /></div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease-in-out; }
.modal-enter-active .modal-panel, .modal-leave-active .modal-panel { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-in-out; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-panel, .modal-leave-to .modal-panel { transform: scale(0.95) translateY(8px); opacity: 0; }
</style>
