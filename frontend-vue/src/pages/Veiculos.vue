<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Truck, Plus, Wifi, WifiOff, AlertTriangle, Tag, FileDown, Search, CheckSquare, Square } from "lucide-vue-next";
import { toast } from "vue-sonner";
import {
  vehicles, vehicleCategories, fuelRecords, maintenanceRecords, operationalCostRecords,
  type Vehicle, type VehicleCategory,
} from "@/services/api";
import { useResource } from "@/composables/useResource";
import { exportVeiculosPDF } from "@/lib/exportRelatorio";
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

/* ---------------- Relatório por Veículo ---------------- */
const reportOpen = ref(false);
const reportSearch = ref("");
const selectedPlates = ref<string[]>([]);
const reportRows = ref<any[]>([]);
const recordsLoaded = ref(false);
const loadingRecords = ref(false);

async function ensureRecords() {
  if (recordsLoaded.value) return;
  loadingRecords.value = true;
  try {
    const [fuel, maint, oper] = await Promise.all([
      fuelRecords.list({ limit: 10000 }),
      maintenanceRecords.list({ limit: 10000 }),
      operationalCostRecords.list({ limit: 10000 }),
    ]);
    reportRows.value = [
      ...fuel.map((r: any) => ({ plate: r.plate ?? "", module: "Abastecimento", description: r.cost_type, total_value: Number(r.total_value || 0), date: r.date })),
      ...maint.map((r: any) => ({ plate: r.plate ?? "", module: "Manutenção", description: `${r.classification} / ${r.cost_type}`, total_value: Number(r.total_value || 0), date: r.date })),
      ...oper.map((r: any) => ({ plate: r.plate ?? "", module: "Operacional", description: r.cost_name, total_value: Number(r.total_value || 0), date: r.date })),
    ];
    recordsLoaded.value = true;
  } catch {
    toast.error("Erro ao carregar os lançamentos para o relatório");
  } finally {
    loadingRecords.value = false;
  }
}

function openReport() {
  reportOpen.value = true;
  ensureRecords();
}

const reportList = computed(() => {
  const q = reportSearch.value.toUpperCase().trim();
  return items.value
    .filter((v) => !q || (v.plate || "").toUpperCase().includes(q))
    .slice()
    .sort((a, b) => (a.plate || "").localeCompare(b.plate || ""));
});
const isSel = (p: string) => selectedPlates.value.includes(p);
function toggleSel(p: string) {
  const i = selectedPlates.value.indexOf(p);
  if (i >= 0) selectedPlates.value.splice(i, 1);
  else selectedPlates.value.push(p);
}
const allVisibleSelected = computed(
  () => reportList.value.length > 0 && reportList.value.every((v) => isSel(v.plate)),
);
function toggleSelectAll() {
  if (allVisibleSelected.value) {
    const visible = new Set(reportList.value.map((v) => v.plate));
    selectedPlates.value = selectedPlates.value.filter((p) => !visible.has(p));
  } else {
    const set = new Set(selectedPlates.value);
    reportList.value.forEach((v) => set.add(v.plate));
    selectedPlates.value = [...set];
  }
}

async function exportReport() {
  if (!selectedPlates.value.length) return toast.error("Selecione ao menos um veículo");
  await ensureRecords();
  const sel = items.value.filter((v) => selectedPlates.value.includes(v.plate));
  exportVeiculosPDF({ vehicles: sel, rows: reportRows.value });
  reportOpen.value = false;
}
</script>

<template>
  <div class="w-full p-6 md:p-10">
    <PageHeader title="Veículos" subtitle="Cadastro e gerenciamento da frota" :icon="Truck">
      <template #actions>
        <div class="flex gap-2">
          <Button variant="outline" @click="openReport"><FileDown class="h-4 w-4" /> Relatório por Veículo</Button>
          <Button @click="openAdd"><Plus class="h-4 w-4" /> Novo Veículo</Button>
        </div>
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

    <!-- Relatório por Veículo -->
    <Modal
      :open="reportOpen"
      title="Relatório por Veículo"
      submit-label="Exportar PDF"
      @close="reportOpen = false"
      @submit="exportReport"
    >
      <div class="space-y-3">
        <p class="text-sm text-muted-foreground">
          Selecione os veículos que entrarão no relatório. Cada veículo gera uma página com os custos por módulo.
        </p>

        <!-- Busca por placa -->
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input v-model="reportSearch" class="ui-input pl-9 uppercase" placeholder="Buscar placa..." />
        </div>

        <!-- Toolbar: selecionar todos / contagem -->
        <div class="flex items-center justify-between">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.06]"
            @click="toggleSelectAll"
          >
            <component :is="allVisibleSelected ? CheckSquare : Square" class="h-4 w-4 text-primary-hover" />
            {{ allVisibleSelected ? "Desmarcar todos" : "Selecionar todos" }}
          </button>
          <span class="text-xs font-medium text-muted-foreground">
            <span class="font-bold text-foreground">{{ selectedPlates.length }}</span> selecionado(s)
          </span>
        </div>

        <!-- Lista de veículos -->
        <div v-if="loadingRecords" class="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner /> Carregando lançamentos...
        </div>
        <div v-else class="scrollbar-brand max-h-[42vh] space-y-1 overflow-auto rounded-lg border p-1">
          <label
            v-for="v in reportList" :key="v.id"
            class="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-primary/[0.06]"
            :class="isSel(v.plate) && 'bg-primary/[0.06]'"
          >
            <input type="checkbox" :checked="isSel(v.plate)" class="h-4 w-4 accent-primary" @change="toggleSel(v.plate)" />
            <span class="rounded bg-muted px-2 py-0.5 text-sm font-bold tracking-widest">{{ v.plate }}</span>
            <span class="min-w-0 flex-1 truncate text-xs text-muted-foreground">{{ v.vehicle_model || "—" }}</span>
            <Badge tone="bg-info/10 text-info border-info/20">{{ v.category_name }}</Badge>
          </label>
          <p v-if="!reportList.length" class="py-8 text-center text-sm text-muted-foreground">Nenhum veículo encontrado</p>
        </div>
      </div>
    </Modal>
  </div>
</template>
