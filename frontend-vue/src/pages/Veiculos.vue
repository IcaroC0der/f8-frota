<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Truck, Plus, Wifi, WifiOff, AlertTriangle, Tag } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { vehicles, vehicleCategories, type Vehicle, type VehicleCategory } from "@/services/api";
import { useResource } from "@/composables/useResource";
import PageHeader from "@/components/ui/PageHeader.vue";
import DataTable from "@/components/ui/DataTable.vue";
import Modal from "@/components/ui/Modal.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import StatCard from "@/components/ui/StatCard.vue";
import FilterBar from "@/components/ui/FilterBar.vue";
import FormField from "@/components/ui/FormField.vue";
import Spinner from "@/components/ui/Spinner.vue";

const { items, loading, saving, fetchAll, create, update, remove } = useResource<Vehicle>(
  vehicles,
  { created: "Veículo cadastrado!", updated: "Veículo atualizado!", removed: "Veículo excluído!" },
);
const categories = ref<VehicleCategory[]>([]);

const filterCategory = ref("all");
const filterCompany = ref("all");

const dialogOpen = ref(false);
const editing = ref<Vehicle | null>(null);
const emptyForm = () => ({
  plate: "", category_name: "", vehicle_model: "", chassis: "",
  renavan: "", year: "", company: "", driver: "", tracker: false, is_active: true,
});
const form = reactive(emptyForm());

onMounted(async () => {
  await Promise.all([fetchAll(), vehicleCategories.list({ limit: 1000 }).then((c) => (categories.value = c))]);
});

const companies = computed(() =>
  [...new Set(items.value.map((v) => v.company).filter(Boolean))].sort() as string[],
);

const filtered = computed(() =>
  items.value.filter((v) => {
    const catOk = filterCategory.value === "all" || v.category_name === filterCategory.value;
    const compOk = filterCompany.value === "all" || v.company === filterCompany.value;
    return catOk && compOk;
  }),
);
const hasFilters = computed(() => filterCategory.value !== "all" || filterCompany.value !== "all");
function clearFilters() {
  filterCategory.value = "all";
  filterCompany.value = "all";
}

const stats = computed(() => [
  { label: "Total de Veículos", value: items.value.length, icon: Truck, tone: "bg-primary/15 text-primary-hover", highlight: true },
  { label: "Com Rastreador", value: items.value.filter((v) => v.tracker).length, icon: Wifi, tone: "bg-success/10 text-success" },
  { label: "Sem Rastreador", value: items.value.filter((v) => !v.tracker).length, icon: WifiOff, tone: "bg-warning/10 text-warning" },
  { label: "Categorias", value: new Set(items.value.map((v) => v.category_name)).size, icon: Tag, tone: "bg-accent/10 text-accent" },
]);

const columns = [
  { key: "plate", label: "Placa" },
  { key: "category_name", label: "Categoria" },
  { key: "vehicle_model", label: "Modelo" },
  { key: "year", label: "Ano" },
  { key: "company", label: "Empresa" },
  { key: "tracker", label: "Rastreador" },
  { key: "is_active", label: "Status" },
];

function openAdd() {
  editing.value = null;
  Object.assign(form, emptyForm());
  dialogOpen.value = true;
}
function openEdit(row: Vehicle) {
  editing.value = row;
  Object.assign(form, {
    plate: row.plate ?? "", category_name: row.category_name ?? "",
    vehicle_model: row.vehicle_model ?? "", chassis: row.chassis ?? "",
    renavan: row.renavan ?? "", year: row.year ?? "", company: row.company ?? "",
    driver: row.driver ?? "", tracker: row.tracker, is_active: row.is_active,
  });
  dialogOpen.value = true;
}

async function submit() {
  if (!form.plate.trim()) return toast.error("Informe a placa");
  if (!form.category_name) return toast.error("Selecione uma categoria");
  const payload = { ...form, plate: form.plate.toUpperCase().trim() };
  const ok = editing.value
    ? await update(editing.value.id, payload)
    : await create(payload);
  if (ok) dialogOpen.value = false;
}
</script>

<template>
  <div class="w-full p-6 md:p-10">
    <PageHeader title="Veículos" subtitle="Cadastro e gerenciamento da frota" :icon="Truck">
      <template #actions>
        <Button @click="openAdd"><Plus class="h-4 w-4" /> Novo Veículo</Button>
      </template>
    </PageHeader>

    <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        v-for="(s, i) in stats" :key="s.label"
        :label="s.label" :value="s.value" :icon="s.icon" :tone="s.tone"
        :highlight="s.highlight" :delay="0.05 + i * 0.05"
      />
    </div>

    <FilterBar :has-active="hasFilters" :delay="0.1" @clear="clearFilters">
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Categoria</span>
        <select v-model="filterCategory" class="ui-input">
          <option value="all">Todas as Categorias</option>
          <option v-for="c in categories" :key="c.id" :value="c.name">{{ c.name }}</option>
        </select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Empresa</span>
        <select v-model="filterCompany" class="ui-input">
          <option value="all">Todas as Empresas</option>
          <option v-for="c in companies" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
    </FilterBar>

    <div v-if="loading" class="flex justify-center py-20"><Spinner /></div>

    <DataTable
      v-else
      :columns="columns"
      :data="filtered"
      search-placeholder="Buscar por placa, modelo, empresa..."
      @edit="openEdit"
      @delete="remove"
    >
      <template #cell-plate="{ value }">
        <span class="rounded bg-muted px-2 py-0.5 text-sm font-bold tracking-widest">{{ value }}</span>
      </template>
      <template #cell-category_name="{ row, value }">
        <div class="flex items-center gap-1.5">
          <AlertTriangle v-if="!row.category_id" class="h-3.5 w-3.5 shrink-0 text-warning" />
          <Badge tone="bg-info/10 text-info border-info/20">{{ value }}</Badge>
        </div>
      </template>
      <template #cell-tracker="{ value }">
        <Badge v-if="value" tone="bg-success/10 text-success border-success/20"><Wifi class="h-3 w-3" /> SIM</Badge>
        <Badge v-else tone="bg-destructive/10 text-destructive border-destructive/20"><WifiOff class="h-3 w-3" /> NÃO</Badge>
      </template>
      <template #cell-is_active="{ value }">
        <Badge :tone="value ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'">
          {{ value ? "Ativo" : "Inativo" }}
        </Badge>
      </template>
    </DataTable>

    <Modal
      :open="dialogOpen"
      :title="editing ? 'Editar Veículo' : 'Novo Veículo'"
      :saving="saving"
      @close="dialogOpen = false"
      @submit="submit"
    >
      <div class="grid grid-cols-2 gap-3">
        <FormField label="Placa" required class="col-span-2 sm:col-span-1">
          <input v-model="form.plate" class="ui-input uppercase" placeholder="AAA0000" />
        </FormField>
        <FormField label="Categoria" required class="col-span-2 sm:col-span-1">
          <select v-model="form.category_name" class="ui-input">
            <option value="">Selecione...</option>
            <option v-for="c in categories" :key="c.id" :value="c.name">{{ c.name }}</option>
          </select>
        </FormField>
        <FormField label="Modelo do Veículo" class="col-span-2">
          <input v-model="form.vehicle_model" class="ui-input" placeholder="Ex: VW GOL" />
        </FormField>
        <FormField label="Chassi"><input v-model="form.chassis" class="ui-input" /></FormField>
        <FormField label="RENAVAN"><input v-model="form.renavan" class="ui-input" /></FormField>
        <FormField label="Ano"><input v-model="form.year" class="ui-input" placeholder="2024" /></FormField>
        <FormField label="Empresa"><input v-model="form.company" class="ui-input" /></FormField>
        <FormField label="Motorista" class="col-span-2">
          <input v-model="form.driver" class="ui-input" />
        </FormField>
        <label class="col-span-2 flex items-center justify-between rounded-xl border bg-muted/30 p-3">
          <span class="text-sm font-medium">Rastreador</span>
          <input v-model="form.tracker" type="checkbox" class="h-5 w-5 accent-primary" />
        </label>
        <label class="col-span-2 flex items-center justify-between rounded-xl border bg-muted/30 p-3">
          <span class="text-sm font-medium">Veículo Ativo</span>
          <input v-model="form.is_active" type="checkbox" class="h-5 w-5 accent-primary" />
        </label>
      </div>
    </Modal>
  </div>
</template>
