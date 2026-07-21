<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Wrench, Plus, DollarSign, ShieldCheck, BarChart3 } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { Doughnut, Bar } from "vue-chartjs";
import {
  maintenanceRecords, vehicles, maintenanceClassifications, maintenanceCostTypes,
  type MaintenanceRecord, type Vehicle, type MaintenanceClassification, type MaintenanceCostType,
} from "@/services/api";
import { useResource } from "@/composables/useResource";
import { formatBRL, formatDate } from "@/lib/utils";
import { seriesColors, palette, baseOptions, brlTick } from "@/lib/charts";
import PageHeader from "@/components/ui/PageHeader.vue";
import DataTable from "@/components/ui/DataTable.vue";
import Modal from "@/components/ui/Modal.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import StatCard from "@/components/ui/StatCard.vue";
import ChartCard from "@/components/ui/ChartCard.vue";
import ChartLegend from "@/components/ui/ChartLegend.vue";
import FilterBar from "@/components/ui/FilterBar.vue";
import FormField from "@/components/ui/FormField.vue";
import Spinner from "@/components/ui/Spinner.vue";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const isPrev = (c?: string) => !!c && c.toUpperCase().includes("PREVENTIV");

const { items, loading, saving, fetchAll, create, update, remove } =
  useResource<MaintenanceRecord>(maintenanceRecords, {
    created: "Manutenção lançada!", updated: "Manutenção atualizada!", removed: "Manutenção excluída!",
  });
const vehicleList = ref<Vehicle[]>([]);
const classifications = ref<MaintenanceClassification[]>([]);
const costTypes = ref<MaintenanceCostType[]>([]);

const dialogOpen = ref(false);
const editing = ref<MaintenanceRecord | null>(null);
const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  plate: "", vehicle_model: "", category_name: "",
  classification: "", cost_group: "", cost_type: "",
  total_value: 0, km: null as number | null,
  supplier: "", invoice_number: "", attachment_url: "", observation: "",
});
const form = reactive(emptyForm());

onMounted(async () => {
  await Promise.all([
    fetchAll(),
    vehicles.list({ limit: 1000 }).then((v) => (vehicleList.value = v)),
    maintenanceClassifications.list({ limit: 1000 }).then((c) => (classifications.value = c)),
    maintenanceCostTypes.list({ limit: 1000 }).then((c) => (costTypes.value = c)),
  ]);
});

/* ---------- categoria resolvida pela placa (fallback ao denormalizado) ---------- */
const vehByPlate = computed(() => {
  const m: Record<string, Vehicle> = {};
  for (const v of vehicleList.value) if (v.plate) m[v.plate] = v;
  return m;
});
const catOf = (r: MaintenanceRecord) => vehByPlate.value[r.plate]?.category_name || r.category_name || "";

/* ---------- filtros (alimentam tabela + cards + gráficos) ---------- */
const filters = reactive({ from: "", to: "", classification: "", costType: "", category: "", plate: "" });
const filtered = computed(() =>
  items.value
    .filter((r) => {
      if (filters.from && (r.date ?? "") < filters.from) return false;
      if (filters.to && (r.date ?? "") > filters.to) return false;
      if (filters.classification && r.classification !== filters.classification) return false;
      if (filters.costType && r.cost_type !== filters.costType) return false;
      if (filters.category && catOf(r) !== filters.category) return false;
      if (filters.plate && r.plate !== filters.plate) return false;
      return true;
    })
    // Mais recentes primeiro.
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
);
const hasFilters = computed(() => Object.values(filters).some(Boolean));
function clearFilters() {
  filters.from = filters.to = filters.classification = filters.costType = filters.category = filters.plate = "";
}

const uniqSorted = (arr: (string | undefined | null)[]) =>
  [...new Set(arr.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));
const classificationOptions = computed(() => uniqSorted(items.value.map((r) => r.classification)));
const costTypeOptions = computed(() => uniqSorted(items.value.map((r) => r.cost_type)));
const categoryOptions = computed(() => uniqSorted(vehicleList.value.map((v) => v.category_name)));
const plateOptions = computed(() => uniqSorted(items.value.map((r) => r.plate)));

const total = computed(() => filtered.value.reduce((s, r) => s + Number(r.total_value || 0), 0));
const totalPrev = computed(() =>
  filtered.value.filter((r) => isPrev(r.classification)).reduce((s, r) => s + Number(r.total_value || 0), 0),
);
const totalCorr = computed(() => total.value - totalPrev.value);
const pct = (v: number) => (total.value > 0 ? ((v / total.value) * 100).toFixed(1) : "0.0");

const stats = computed(() => [
  { label: "Custo Total", value: formatBRL(total.value), sub: `${filtered.value.length} lançamentos`, icon: DollarSign, tone: "bg-primary/15 text-primary-hover", highlight: true },
  { label: "Preventivas", value: formatBRL(totalPrev.value), sub: `${pct(totalPrev.value)}% do total`, icon: ShieldCheck, tone: "bg-success/10 text-success" },
  { label: "Corretivas", value: formatBRL(totalCorr.value), sub: `${pct(totalCorr.value)}% do total`, icon: Wrench, tone: "bg-destructive/10 text-destructive" },
  { label: "Lançamentos", value: filtered.value.length, sub: "no período", icon: BarChart3, tone: "bg-accent/10 text-accent" },
]);

/* ---- Gráfico 1: donut por grupo de custo (com legenda em R$ e %) ---- */
const groupEntries = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of filtered.value) {
    const k = r.cost_group || "Outros";
    acc[k] = (acc[k] || 0) + Number(r.total_value || 0);
  }
  return Object.entries(acc).sort((a, b) => b[1] - a[1]);
});
const byGroup = computed(() => ({
  labels: groupEntries.value.map((e) => e[0]),
  datasets: [{ data: groupEntries.value.map((e) => e[1]), backgroundColor: groupEntries.value.map((_, i) => seriesColors[i % seriesColors.length]), borderWidth: 0 }],
}));
const groupLegend = computed(() =>
  groupEntries.value.map(([label, value], i) => ({ label, value, color: seriesColors[i % seriesColors.length] })),
);
const donutOptions = { ...baseOptions, plugins: { legend: { display: false } } };

/* ---- Gráfico 2: preventivas vs corretivas por mês ---- */
const byMonth = computed(() => {
  const acc: Record<number, { prev: number; corr: number }> = {};
  for (const r of filtered.value) {
    if (!r.date) continue;
    const m = Number(r.date.split("-")[1]) - 1;
    const b = (acc[m] ??= { prev: 0, corr: 0 });
    if (isPrev(r.classification)) b.prev += Number(r.total_value || 0);
    else b.corr += Number(r.total_value || 0);
  }
  const keys = Object.keys(acc).map(Number).sort((a, b) => a - b);
  return {
    labels: keys.map((m) => MONTHS[m]),
    datasets: [
      { label: "Preventivas", data: keys.map((m) => acc[m].prev), backgroundColor: palette.success, borderRadius: 5 },
      { label: "Corretivas", data: keys.map((m) => acc[m].corr), backgroundColor: palette.destructive, borderRadius: 5 },
    ],
  };
});
const barOptions = {
  ...baseOptions,
  scales: { x: { grid: { display: false } }, y: { ticks: { callback: brlTick } } },
};

// Selects em cascata: classificação → grupo → tipo
const groups = computed(() => [
  ...new Set(
    costTypes.value
      .filter((c) => !form.classification || c.classification === form.classification)
      .map((c) => c.cost_group),
  ),
]);
const types = computed(() =>
  costTypes.value.filter(
    (c) =>
      (!form.classification || c.classification === form.classification) &&
      (!form.cost_group || c.cost_group === form.cost_group),
  ),
);

function onPlate() {
  const v = vehicleList.value.find((x) => x.plate === form.plate);
  form.vehicle_model = v?.vehicle_model ?? "";
  form.category_name = v?.category_name ?? "";
}
function onClassification() {
  form.cost_group = "";
  form.cost_type = "";
}
function onGroup() {
  form.cost_type = "";
}

const columns = [
  { key: "date", label: "Data" },
  { key: "plate", label: "Placa" },
  { key: "classification", label: "Classificação" },
  { key: "cost_group", label: "Grupo" },
  { key: "cost_type", label: "Tipo" },
  { key: "total_value", label: "Valor" },
];

function openAdd() {
  editing.value = null;
  Object.assign(form, emptyForm());
  dialogOpen.value = true;
}
function openEdit(row: MaintenanceRecord) {
  editing.value = row;
  Object.assign(form, {
    date: row.date?.slice(0, 10), plate: row.plate, vehicle_model: row.vehicle_model ?? "",
    category_name: row.category_name ?? "", classification: row.classification,
    cost_group: row.cost_group, cost_type: row.cost_type, total_value: Number(row.total_value),
    km: row.km, supplier: row.supplier ?? "", invoice_number: row.invoice_number ?? "",
    attachment_url: row.attachment_url ?? "", observation: row.observation ?? "",
  });
  dialogOpen.value = true;
}
async function submit() {
  if (!form.plate) return toast.error("Selecione o veículo");
  if (!form.classification || !form.cost_group || !form.cost_type)
    return toast.error("Preencha classificação, grupo e tipo");
  const payload = { ...form, km: form.km || null };
  const ok = editing.value ? await update(editing.value.id, payload) : await create(payload);
  if (ok) dialogOpen.value = false;
}
</script>

<template>
  <div class="w-full p-6 md:p-10">
    <PageHeader title="Manutenção" subtitle="Registros de manutenção da frota" :icon="Wrench">
      <template #actions>
        <Button @click="openAdd"><Plus class="h-4 w-4" /> Nova Manutenção</Button>
      </template>
    </PageHeader>

    <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        v-for="(s, i) in stats" :key="s.label"
        :label="s.label" :value="s.value" :sub="s.sub" :icon="s.icon" :tone="s.tone"
        :highlight="s.highlight" :delay="0.05 + i * 0.05"
      />
    </div>

    <div v-if="!loading && items.length" class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Resumo por Custo" caption="Participação por grupo" :delay="0.25">
        <div class="flex h-full items-center gap-5">
          <div class="h-full min-w-0 flex-1"><Doughnut :data="byGroup" :options="donutOptions" /></div>
          <ChartLegend class="flex-1" :items="groupLegend" :total="total" compact />
        </div>
      </ChartCard>
      <ChartCard title="Preventivas × Corretivas" caption="Comparativo mensal" :delay="0.3">
        <Bar :data="byMonth" :options="barOptions" />
      </ChartCard>
    </div>

    <!-- Filtros -->
    <FilterBar v-if="!loading" :has-active="hasFilters" :delay="0.32" class="mb-5" @clear="clearFilters">
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">De</span>
        <input v-model="filters.from" type="date" class="ui-input" />
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Até</span>
        <input v-model="filters.to" type="date" class="ui-input" />
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Classificação</span>
        <select v-model="filters.classification" class="ui-input">
          <option value="">Todas</option>
          <option v-for="c in classificationOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Tipo de Custo</span>
        <select v-model="filters.costType" class="ui-input">
          <option value="">Todos</option>
          <option v-for="c in costTypeOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Categoria</span>
        <select v-model="filters.category" class="ui-input">
          <option value="">Todas</option>
          <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Veículo</span>
        <select v-model="filters.plate" class="ui-input">
          <option value="">Todos</option>
          <option v-for="p in plateOptions" :key="p" :value="p">{{ p }}</option>
        </select>
      </label>
    </FilterBar>

    <div v-if="loading" class="flex justify-center py-20"><Spinner /></div>
    <DataTable v-else :columns="columns" :data="filtered" search-placeholder="Buscar por placa, tipo, fornecedor..." @edit="openEdit" @delete="remove">
      <template #cell-date="{ value }">{{ formatDate(value) }}</template>
      <template #cell-plate="{ value }"><span class="rounded bg-muted px-2 py-0.5 text-sm font-bold tracking-widest">{{ value }}</span></template>
      <template #cell-classification="{ value }">
        <Badge :tone="value === 'PREVENTIVO' ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'">{{ value }}</Badge>
      </template>
      <template #cell-total_value="{ value }"><span class="font-semibold">{{ formatBRL(value) }}</span></template>
    </DataTable>

    <Modal :open="dialogOpen" :title="editing ? 'Editar Manutenção' : 'Nova Manutenção'" :saving="saving" @close="dialogOpen = false" @submit="submit">
      <div class="grid grid-cols-2 gap-3">
        <FormField label="Data" required><input v-model="form.date" type="date" class="ui-input" /></FormField>
        <FormField label="Veículo (Placa)" required>
          <select v-model="form.plate" class="ui-input" @change="onPlate">
            <option value="">Selecione...</option>
            <option v-for="v in vehicleList" :key="v.id" :value="v.plate">{{ v.plate }} — {{ v.vehicle_model }}</option>
          </select>
        </FormField>
        <FormField label="Categoria (auto)"><input :value="form.category_name" readonly class="ui-input bg-muted/50" placeholder="Automático" /></FormField>
        <FormField label="Classificação" required>
          <select v-model="form.classification" class="ui-input" @change="onClassification">
            <option value="">Selecione...</option>
            <option v-for="c in classifications" :key="c.id" :value="c.name">{{ c.name }}</option>
          </select>
        </FormField>
        <FormField label="Custo (Grupo)" required>
          <select v-model="form.cost_group" class="ui-input" :disabled="!form.classification" @change="onGroup">
            <option value="">Selecione...</option>
            <option v-for="g in groups" :key="g" :value="g">{{ g }}</option>
          </select>
        </FormField>
        <FormField label="Tipo de Custo" required>
          <select v-model="form.cost_type" class="ui-input" :disabled="!form.cost_group">
            <option value="">Selecione...</option>
            <option v-for="t in types" :key="t.id" :value="t.cost_type">{{ t.cost_type }}</option>
          </select>
        </FormField>
        <FormField label="Valor Total (R$)" required><input v-model.number="form.total_value" type="number" step="0.01" class="ui-input" /></FormField>
        <FormField label="KM"><input v-model.number="form.km" type="number" class="ui-input" /></FormField>
        <FormField label="Fornecedor"><input v-model="form.supplier" class="ui-input" /></FormField>
        <FormField label="Nota Fiscal"><input v-model="form.invoice_number" class="ui-input" /></FormField>
        <FormField label="URL do Anexo" class="col-span-2"><input v-model="form.attachment_url" class="ui-input" placeholder="https://..." /></FormField>
        <FormField label="Observação" class="col-span-2"><input v-model="form.observation" class="ui-input" /></FormField>
      </div>
    </Modal>
  </div>
</template>
