<script setup lang="ts" generic="T extends { id: string }">
import { computed, ref } from "vue";
import { Pencil, Trash2, Search } from "lucide-vue-next";
import Button from "./Button.vue";
import Modal from "./Modal.vue";

interface Column {
  key: string;
  label: string;
  class?: string;
}

const props = withDefaults(
  defineProps<{
    columns: Column[];
    data: T[];
    searchPlaceholder?: string;
    emptyMessage?: string;
    editable?: boolean;
    deletable?: boolean;
  }>(),
  {
    searchPlaceholder: "Buscar...",
    emptyMessage: "Nenhum registro encontrado",
    editable: true,
    deletable: true,
  },
);

const emit = defineEmits<{ edit: [row: T]; delete: [id: string] }>();

const search = ref("");
const deleteId = ref<string | null>(null);

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return props.data;
  return props.data.filter((row) =>
    props.columns.some((col) => {
      const val = (row as any)[col.key];
      return val != null && String(val).toLowerCase().includes(q);
    }),
  );
});

function confirmDelete() {
  if (deleteId.value) emit("delete", deleteId.value);
  deleteId.value = null;
}
</script>

<template>
  <div class="a-in overflow-hidden rounded-xl border bg-card shadow-card" style="animation-delay: 0.15s">
    <div class="flex items-center justify-between gap-4 border-b p-4">
      <div class="relative max-w-sm flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input v-model="search" :placeholder="searchPlaceholder" class="ui-input pl-9" />
      </div>
      <slot name="toolbar" />
    </div>

    <div class="scrollbar-brand overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-muted/50">
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {{ col.label }}
            </th>
            <th
              v-if="editable || deletable"
              class="w-24 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td :colspan="columns.length + 1" class="py-12 text-center text-muted-foreground">
              {{ emptyMessage }}
            </td>
          </tr>
          <tr
            v-for="row in filtered"
            :key="row.id"
            class="border-b transition-colors duration-200 hover:bg-primary/[0.06]"
          >
            <td v-for="col in columns" :key="col.key" :class="['px-4 py-2.5', col.class]">
              <slot :name="`cell-${col.key}`" :row="row" :value="(row as any)[col.key]">
                {{ (row as any)[col.key] ?? "—" }}
              </slot>
            </td>
            <td v-if="editable || deletable" class="px-4 py-2.5 text-right">
              <div class="flex items-center justify-end gap-1">
                <Button v-if="editable" variant="ghost" size="icon" @click="emit('edit', row)">
                  <Pencil class="h-3.5 w-3.5" />
                </Button>
                <Button
                  v-if="deletable"
                  variant="ghost"
                  size="icon"
                  @click="deleteId = row.id"
                >
                  <Trash2 class="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
      {{ filtered.length }} de {{ data.length }} registro(s)
    </div>

    <Modal
      :open="!!deleteId"
      title="Confirmar exclusão"
      submit-label="Excluir"
      @close="deleteId = null"
      @submit="confirmDelete"
    >
      <p class="text-sm text-muted-foreground">
        Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita.
      </p>
    </Modal>
  </div>
</template>
