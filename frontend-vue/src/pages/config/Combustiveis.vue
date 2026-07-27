<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Fuel, Plus, ArrowLeft } from "lucide-vue-next";
import { RouterLink } from "vue-router";
import { toast } from "vue-sonner";
import { fuelCostTypes, type FuelCostType } from "@/services/api";
import { useResource } from "@/composables/useResource";
import PageHeader from "@/components/ui/PageHeader.vue";
import DataTable from "@/components/ui/DataTable.vue";
import Modal from "@/components/ui/Modal.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import FormField from "@/components/ui/FormField.vue";
import Spinner from "@/components/ui/Spinner.vue";

const { items, loading, saving, fetchAll, create, update, remove } =
  useResource<FuelCostType>(fuelCostTypes, {
    created: "Tipo de combustível criado!", updated: "Tipo de combustível atualizado!", removed: "Tipo excluído!",
  });

const dialogOpen = ref(false);
const editing = ref<FuelCostType | null>(null);
const form = reactive({ cost_name: "", cost_type: "Combustível", is_active: true });

onMounted(fetchAll);

const columns = [
  { key: "cost_name", label: "Nome do Combustível" },
  { key: "cost_type", label: "Tipo de Custo" },
  { key: "is_active", label: "Status" },
];

function openAdd() {
  editing.value = null;
  Object.assign(form, { cost_name: "", cost_type: "Combustível", is_active: true });
  dialogOpen.value = true;
}
function openEdit(row: FuelCostType) {
  editing.value = row;
  Object.assign(form, { cost_name: row.cost_name, cost_type: row.cost_type, is_active: row.is_active });
  dialogOpen.value = true;
}
async function submit() {
  if (!form.cost_name.trim()) return toast.error("Informe o nome do combustível");
  const ok = editing.value ? await update(editing.value.id, { ...form }) : await create({ ...form });
  if (ok) dialogOpen.value = false;
}
</script>

<template>
  <div class="w-full p-6 md:p-10">
    <RouterLink to="/parametrizacoes" class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft class="h-4 w-4" /> Estrutura dos Módulos
    </RouterLink>
    <PageHeader title="Tipos de Combustível" subtitle="Configuração de custos e tipos de combustíveis" :icon="Fuel">
      <template #actions>
        <Button @click="openAdd"><Plus class="h-4 w-4" /> Novo Combustível</Button>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex justify-center py-20"><Spinner /></div>
    <DataTable v-else :columns="columns" :data="items" search-placeholder="Buscar combustível..." @edit="openEdit" @delete="remove">
      <template #cell-cost_name="{ value }"><span class="font-semibold">{{ value }}</span></template>
      <template #cell-is_active="{ value }">
        <Badge :tone="value ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'">
          {{ value ? "Ativo" : "Inativo" }}
        </Badge>
      </template>
    </DataTable>

    <Modal :open="dialogOpen" :title="editing ? 'Editar Combustível' : 'Novo Combustível'" :saving="saving" @close="dialogOpen = false" @submit="submit">
      <div class="space-y-3">
        <FormField label="Nome do Combustível" required><input v-model="form.cost_name" class="ui-input" placeholder="Ex: Diesel S10" /></FormField>
        <FormField label="Tipo de Custo"><input v-model="form.cost_type" class="ui-input" placeholder="Ex: Combustível" /></FormField>
        <label class="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
          <span class="text-sm font-medium">Status Ativo</span>
          <input v-model="form.is_active" type="checkbox" class="h-5 w-5 accent-primary" />
        </label>
      </div>
    </Modal>
  </div>
</template>
