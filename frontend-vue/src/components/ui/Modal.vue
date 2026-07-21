<script setup lang="ts">
import { X } from "lucide-vue-next";
import Button from "./Button.vue";
import Spinner from "./Spinner.vue";

defineProps<{
  open: boolean;
  title?: string;
  saving?: boolean;
  submitLabel?: string;
}>();

const emit = defineEmits<{ close: []; submit: [] }>();
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
        @click.self="emit('close')"
      >
        <div
          class="modal-panel flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border bg-card shadow-card-md"
        >
          <div class="flex items-center justify-between border-b p-4">
            <h2 class="text-lg font-bold text-foreground">{{ title }}</h2>
            <button
              class="rounded-lg p-1.5 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
              @click="emit('close')"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <form class="flex-1 overflow-y-auto p-6" @submit.prevent="emit('submit')">
            <slot />
          </form>

          <div class="flex items-center justify-end gap-2 border-t p-4">
            <Button variant="outline" @click="emit('close')">Cancelar</Button>
            <Button :disabled="saving" @click="emit('submit')">
              <Spinner v-if="saving" :size="4" />
              {{ submitLabel ?? "Salvar" }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease-in-out;
}
.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-in-out;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  transform: scale(0.95) translateY(8px);
  opacity: 0;
}
</style>
