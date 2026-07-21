<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Tag, Plus, ArrowLeft } from "lucide-vue-next";
import { RouterLink } from "vue-router";
import { toast } from "vue-sonner";
import { vehicleCategories, type VehicleCategory } from "@/services/api";
import { useResource } from "@/composables/useResource";
import PageHeader from "@/components/ui/PageHeader.vue";
import DataTable from "@/components/ui/DataTable.vue";
import Modal from "@/components/ui/Modal.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import FormField from "@/components/ui/FormField.vue";
import Spinner from "@/components/ui/Spinner.vue";

const { items, loading, saving, fetchAll, create, update, remove } =
  useResource<VehicleCategory>(vehicleCategories, {
    created: "Categoria criada!", updated: "Categoria atualizada!", removed: "Categoria excluída!",
  });

const dialogOpen = ref(false);
const editing = ref<VehicleCategory | null>(null);
const form = reactive({ name: "", description: "", is_active: true });

onMounted(fetchAll);

const columns = [
  { key: "name", label: "Categoria" },
  { key: "description", label: "Descrição" },
  { key: "is_active", label: "Status" },
];

function openAdd() {
  editing.value = null;
  Object.assign(form, { name: "", description: "", is_active: true });
  dialogOpen.value = true;
}
function openEdit(row: VehicleCategory) {
  editing.value = row;
  Object.assign(form, { name: row.name, description: row.description ?? "", is_active: row.is_active });
  dialogOpen.value = true;
}
async function submit() {
  if (!form.name.trim()) return toast.error("Informe o nome da categoria");
  const ok = editing.value ? await update(editing.value.id, { ...form }) : await create({ ...form });
  if (ok) dialogOpen.value = false;
}
</script>

<template>
  <div class="w-full p-6 md:p-10">
    <RouterLink to="/parametrizacoes" class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft class="h-4 w-4" /> Parametrizações
    </RouterLink>
    <PageHeader title="Categorias de Veículo" subtitle="Parametrização das categorias da frota" :icon="Tag">
      <template #actions>
        <Button @click="openAdd"><Plus class="h-4 w-4" /> Nova Categoria</Button>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex justify-center py-20"><Spinner /></div>
    <DataTable v-else :columns="columns" :data="items" search-placeholder="Buscar categoria..." @edit="openEdit" @delete="remove">
      <template #cell-name="{ value }"><span class="font-semibold">{{ value }}</span></template>
      <template #cell-is_active="{ value }">
        <Badge :tone="value ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'">
          {{ value ? "Ativa" : "Inativa" }}
        </Badge>
      </template>
    </DataTable>

    <Modal :open="dialogOpen" :title="editing ? 'Editar Categoria' : 'Nova Categoria'" :saving="saving" @close="dialogOpen = false" @submit="submit">
      <div class="space-y-3">
        <FormField label="Nome" required><input v-model="form.name" class="ui-input" placeholder="Ex: CAMINHÃO" /></FormField>
        <FormField label="Descrição"><input v-model="form.description" class="ui-input" /></FormField>
        <label class="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
          <span class="text-sm font-medium">Categoria Ativa</span>
          <input v-model="form.is_active" type="checkbox" class="h-5 w-5 accent-primary" />
        </label>
      </div>
    </Modal>
  </div>
</template>
