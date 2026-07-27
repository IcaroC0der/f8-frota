<script setup lang="ts">
import { onMounted, reactive, ref, computed } from "vue";
import { Wrench, Plus, ArrowLeft } from "lucide-vue-next";
import { RouterLink } from "vue-router";
import { toast } from "vue-sonner";
import { maintenanceClassifications, maintenanceCostTypes, type MaintenanceClassification, type MaintenanceCostType } from "@/services/api";
import { useResource } from "@/composables/useResource";
import PageHeader from "@/components/ui/PageHeader.vue";
import DataTable from "@/components/ui/DataTable.vue";
import Modal from "@/components/ui/Modal.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import FormField from "@/components/ui/FormField.vue";
import Spinner from "@/components/ui/Spinner.vue";
import TabNav from "@/components/ui/TabNav.vue";

const activeTab = ref("classificacoes");
const tabs = [
  { id: "classificacoes", label: "Classificações" },
  { id: "tipos", label: "Tipos de Manutenção" }
];

// -- State for Classificações --
const classifRes = useResource<MaintenanceClassification>(maintenanceClassifications, {
  created: "Classificação criada!", updated: "Classificação atualizada!", removed: "Classificação excluída!",
});
const dialogClassif = ref(false);
const editingClassif = ref<MaintenanceClassification | null>(null);
const formClassif = reactive({ name: "", is_active: true });

// -- State for Tipos --
const tiposRes = useResource<MaintenanceCostType>(maintenanceCostTypes, {
  created: "Tipo de manutenção criado!", updated: "Tipo atualizado!", removed: "Tipo excluído!",
});
const dialogTipos = ref(false);
const editingTipo = ref<MaintenanceCostType | null>(null);
const formTipo = reactive({ classification: "", cost_group: "Peças", cost_type: "", is_active: true });

onMounted(() => {
  classifRes.fetchAll();
  tiposRes.fetchAll();
});

const classifColumns = [
  { key: "name", label: "Classificação" },
  { key: "is_active", label: "Status" },
];

const tiposColumns = [
  { key: "cost_type", label: "Tipo de Manutenção (Serviço/Peça)" },
  { key: "cost_group", label: "Grupo" },
  { key: "classification", label: "Classificação Padrão" },
  { key: "is_active", label: "Status" },
];

// -- Actions Classif --
function openAddClassif() {
  editingClassif.value = null;
  Object.assign(formClassif, { name: "", is_active: true });
  dialogClassif.value = true;
}
function openEditClassif(row: MaintenanceClassification) {
  editingClassif.value = row;
  Object.assign(formClassif, { name: row.name, is_active: row.is_active });
  dialogClassif.value = true;
}
async function submitClassif() {
  if (!formClassif.name.trim()) return toast.error("Informe o nome da classificação");
  const ok = editingClassif.value ? await classifRes.update(editingClassif.value.id, { ...formClassif }) : await classifRes.create({ ...formClassif });
  if (ok) dialogClassif.value = false;
}

// -- Actions Tipos --
function openAddTipo() {
  editingTipo.value = null;
  Object.assign(formTipo, { classification: classifRes.items.value[0]?.name || "", cost_group: "Peças", cost_type: "", is_active: true });
  dialogTipos.value = true;
}
function openEditTipo(row: MaintenanceCostType) {
  editingTipo.value = row;
  Object.assign(formTipo, { classification: row.classification, cost_group: row.cost_group, cost_type: row.cost_type, is_active: row.is_active });
  dialogTipos.value = true;
}
async function submitTipo() {
  if (!formTipo.cost_type.trim()) return toast.error("Informe o tipo de manutenção");
  if (!formTipo.classification.trim()) return toast.error("Selecione a classificação padrão");
  const ok = editingTipo.value ? await tiposRes.update(editingTipo.value.id, { ...formTipo }) : await tiposRes.create({ ...formTipo });
  if (ok) dialogTipos.value = false;
}

const activeClassifications = computed(() => classifRes.items.value.filter(c => c.is_active).map(c => c.name));
</script>

<template>
  <div class="w-full p-6 md:p-10">
    <RouterLink to="/parametrizacoes" class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft class="h-4 w-4" /> Estrutura dos Módulos
    </RouterLink>
    <PageHeader title="Manutenção" subtitle="Configuração de classificações e tipos de serviços/peças" :icon="Wrench">
      <template #actions>
        <Button v-if="activeTab === 'classificacoes'" @click="openAddClassif"><Plus class="h-4 w-4" /> Nova Classificação</Button>
        <Button v-else @click="openAddTipo"><Plus class="h-4 w-4" /> Novo Tipo</Button>
      </template>
    </PageHeader>

    <div class="mb-6">
      <TabNav :tabs="tabs" v-model="activeTab" />
    </div>

    <!-- TABS CONTENT -->
    <div v-if="activeTab === 'classificacoes'">
      <div v-if="classifRes.loading.value" class="flex justify-center py-20"><Spinner /></div>
      <DataTable v-else :columns="classifColumns" :data="classifRes.items.value" search-placeholder="Buscar classificação..." @edit="openEditClassif" @delete="classifRes.remove">
        <template #cell-name="{ value }"><span class="font-semibold">{{ value }}</span></template>
        <template #cell-is_active="{ value }">
          <Badge :tone="value ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'">
            {{ value ? "Ativa" : "Inativa" }}
          </Badge>
        </template>
      </DataTable>
    </div>

    <div v-if="activeTab === 'tipos'">
      <div v-if="tiposRes.loading.value" class="flex justify-center py-20"><Spinner /></div>
      <DataTable v-else :columns="tiposColumns" :data="tiposRes.items.value" search-placeholder="Buscar tipo de manutenção..." @edit="openEditTipo" @delete="tiposRes.remove">
        <template #cell-cost_type="{ value }"><span class="font-semibold">{{ value }}</span></template>
        <template #cell-is_active="{ value }">
          <Badge :tone="value ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'">
            {{ value ? "Ativo" : "Inativo" }}
          </Badge>
        </template>
      </DataTable>
    </div>

    <!-- MODALS -->
    <Modal :open="dialogClassif" :title="editingClassif ? 'Editar Classificação' : 'Nova Classificação'" :saving="classifRes.saving.value" @close="dialogClassif = false" @submit="submitClassif">
      <div class="space-y-3">
        <FormField label="Classificação" required><input v-model="formClassif.name" class="ui-input" placeholder="Ex: Preventiva" /></FormField>
        <label class="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
          <span class="text-sm font-medium">Status Ativo</span>
          <input v-model="formClassif.is_active" type="checkbox" class="h-5 w-5 accent-primary" />
        </label>
      </div>
    </Modal>

    <Modal :open="dialogTipos" :title="editingTipo ? 'Editar Tipo' : 'Novo Tipo de Manutenção'" :saving="tiposRes.saving.value" @close="dialogTipos = false" @submit="submitTipo">
      <div class="space-y-3">
        <FormField label="Tipo (Serviço ou Peça)" required><input v-model="formTipo.cost_type" class="ui-input" placeholder="Ex: Pastilha de Freio" /></FormField>
        
        <div class="grid grid-cols-2 gap-3">
          <FormField label="Grupo" required>
            <select v-model="formTipo.cost_group" class="ui-input">
              <option value="Peças">Peças</option>
              <option value="Serviços">Serviços</option>
              <option value="Outros">Outros</option>
            </select>
          </FormField>

          <FormField label="Classificação Padrão" required>
            <select v-model="formTipo.classification" class="ui-input">
              <option value="" disabled>Selecione...</option>
              <option v-for="c in activeClassifications" :key="c" :value="c">{{ c }}</option>
            </select>
          </FormField>
        </div>

        <label class="flex items-center justify-between rounded-xl border bg-muted/30 p-3 mt-4">
          <span class="text-sm font-medium">Status Ativo</span>
          <input v-model="formTipo.is_active" type="checkbox" class="h-5 w-5 accent-primary" />
        </label>
      </div>
    </Modal>
  </div>
</template>
