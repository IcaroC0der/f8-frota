<script setup lang="ts">
import { computed, nextTick, ref, reactive, watch, onUnmounted } from "vue";
import { Search, ChevronDown, X } from "lucide-vue-next";

export interface SelectOption {
  value: string;
  label: string;
}

const props = withDefaults(defineProps<{
  modelValue: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}>(), { placeholder: "Selecione...", disabled: false });

const emit = defineEmits<{ "update:modelValue": [val: string]; change: [] }>();

const open = ref(false);
const query = ref("");
const btnRef = ref<HTMLElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);
const pos = reactive({ top: "0px", left: "0px", width: "240px" });

const filtered = computed(() => {
  const q = query.value.toUpperCase().trim();
  const list = q ? props.options.filter((o) => o.label.toUpperCase().includes(q)) : props.options;
  return list;
});

const selectedLabel = computed(() => {
  const opt = props.options.find((o) => o.value === props.modelValue);
  return opt ? opt.label : "";
});

async function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
  if (!open.value) return;
  query.value = "";
  await nextTick();
  updatePos();
  searchRef.value?.focus();
}

function updatePos() {
  if (btnRef.value) {
    const r = btnRef.value.getBoundingClientRect();
    pos.top = `${r.bottom + 4}px`;
    pos.left = `${r.left}px`;
    pos.width = `${Math.max(r.width, 240)}px`;
  }
}

function select(val: string) {
  emit("update:modelValue", val);
  emit("change");
  open.value = false;
}

function clear() {
  emit("update:modelValue", "");
  emit("change");
}

function onScroll() {
  if (open.value) updatePos();
}
watch(open, (v) => {
  if (v) window.addEventListener("scroll", onScroll, true);
  else window.removeEventListener("scroll", onScroll, true);
});
onUnmounted(() => window.removeEventListener("scroll", onScroll, true));
</script>

<template>
  <div class="relative">
    <button
      ref="btnRef"
      type="button"
      class="ui-input flex w-full items-center justify-between gap-2 text-left"
      :class="disabled && 'opacity-50 cursor-not-allowed'"
      @click="toggle"
    >
      <span class="truncate text-sm" :class="!modelValue && 'text-muted-foreground'">
        {{ selectedLabel || placeholder }}
      </span>
      <div class="flex shrink-0 items-center gap-1">
        <button
          v-if="modelValue"
          type="button"
          class="rounded p-0.5 text-muted-foreground hover:text-foreground"
          @click.stop="clear"
        >
          <X class="h-3 w-3" />
        </button>
        <ChevronDown class="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </button>

    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-[9998]" @click="open = false" />
      <div
        v-if="open"
        class="fixed z-[9999] rounded-lg border bg-card p-1.5 shadow-card-md"
        :style="{ top: pos.top, left: pos.left, width: pos.width }"
      >
        <div class="relative mb-1.5">
          <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref="searchRef"
            v-model="query"
            class="ui-input pl-8 text-xs"
            placeholder="Buscar..."
          />
        </div>
        <div class="scrollbar-brand max-h-52 overflow-auto">
          <button
            v-for="opt in filtered"
            :key="opt.value"
            type="button"
            class="flex w-full items-center rounded px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-primary/[0.08]"
            :class="opt.value === modelValue && 'bg-primary/10 font-semibold text-primary'"
            @click="select(opt.value)"
          >
            {{ opt.label }}
          </button>
          <div v-if="!filtered.length" class="px-2.5 py-2 text-xs text-muted-foreground">
            Nenhum resultado
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
