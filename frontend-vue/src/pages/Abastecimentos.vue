<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { Fuel, Plus, DollarSign, Droplets, Gauge, Car, Pencil, Trash2, Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, X } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { Doughnut, Bar } from "vue-chartjs";
import {
  fuelRecords, vehicles, fuelCostTypes, importFuelRecords,
  type FuelRecord, type Vehicle, type FuelCostType, type FuelBulkResult,
} from "@/services/api";
import { parseImportFile, downloadTemplate, type ImportRow } from "@/lib/importAbastecimentos";
import { useResource } from "@/composables/useResource";
import { formatBRL, formatDate } from "@/lib/utils";
import { seriesColors, palette, baseOptions, brlTick } from "@/lib/charts";
import PageHeader from "@/components/ui/PageHeader.vue";
import Modal from "@/components/ui/Modal.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import StatCard from "@/components/ui/StatCard.vue";
import ChartCard from "@/components/ui/ChartCard.vue";
import ChartLegend from "@/components/ui/ChartLegend.vue";
import FilterBar from "@/components/ui/FilterBar.vue";
import FormField from "@/components/ui/FormField.vue";
import Spinner from "@/components/ui/Spinner.vue";

const { items, loading, saving, fetchAll, create, update, remove } = useResource<FuelRecord>(
  fuelRecords,
  { created: "Abastecimento lançado!", updated: "Abastecimento atualizado!", removed: "Abastecimento excluído!" },
);
const vehicleList = ref<Vehicle[]>([]);
const costTypes = ref<FuelCostType[]>([]);

onMounted(async () => {
  await Promise.all([
    fetchAll(),
    vehicles.list({ limit: 1000 }).then((v) => (vehicleList.value = v)),
    fuelCostTypes.list({ limit: 1000 }).then((c) => (costTypes.value = c)),
  ]);
});

/* ---------- categoria resolvida pela placa (fallback ao denormalizado) ---------- */
const vehByPlate = computed(() => {
  const m: Record<string, Vehicle> = {};
  for (const v of vehicleList.value) if (v.plate) m[v.plate] = v;
  return m;
});
const catOf = (r: FuelRecord) => vehByPlate.value[r.plate]?.category_name || r.category_name || "";

/* ---------- filtros ---------- */
const filters = reactive({ from: "", to: "", category: "", costName: "", costType: "", plate: "" });
const filtered = computed(() =>
  items.value
    .filter((r) => {
      if (filters.from && (r.date ?? "") < filters.from) return false;
      if (filters.to && (r.date ?? "") > filters.to) return false;
      if (filters.category && catOf(r) !== filters.category) return false;
      if (filters.costName && r.cost_name !== filters.costName) return false;
      if (filters.costType && r.cost_type !== filters.costType) return false;
      if (filters.plate && r.plate !== filters.plate) return false;
      return true;
    })
    // Mais recentes primeiro.
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
);
const hasFilters = computed(() => Object.values(filters).some(Boolean));
function clearFilters() {
  filters.from = filters.to = filters.category = filters.costName = filters.costType = filters.plate = "";
}

const uniqSorted = (arr: (string | undefined | null)[]) =>
  [...new Set(arr.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));
const categoryOptions = computed(() => uniqSorted(vehicleList.value.map((v) => v.category_name)));
const costNameOptions = computed(() => uniqSorted(items.value.map((r) => r.cost_name)));
const costTypeOptions = computed(() => uniqSorted(items.value.map((r) => r.cost_type)));
const plateOptions = computed(() => uniqSorted(items.value.map((r) => r.plate)));

/* ---------- resumo (reflete os filtros) ---------- */
const totalValue = computed(() => filtered.value.reduce((s, r) => s + Number(r.total_value || 0), 0));
const totalLiters = computed(() => filtered.value.reduce((s, r) => s + Number(r.quantity || 0), 0));
const kmRange = computed(() => {
  const kms = filtered.value.map((r) => Number(r.km)).filter((v) => v > 0);
  return kms.length ? Math.max(...kms) - Math.min(...kms) : 0;
});
const avgConsumption = computed(() =>
  totalLiters.value > 0 && kmRange.value > 0 ? kmRange.value / totalLiters.value : 0,
);
const num = (v: number, d = 0) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

const stats = computed(() => [
  { label: "Custo Total", value: formatBRL(totalValue.value), icon: DollarSign, tone: "bg-primary/15 text-primary-hover", highlight: true },
  { label: "Litros Abastecidos", value: `${num(totalLiters.value, 0)} L`, icon: Droplets, tone: "bg-success/10 text-success" },
  { label: "Quilometragem", value: `${num(kmRange.value)} km`, icon: Gauge, tone: "bg-warning/10 text-warning" },
  { label: "Média de Consumo", value: `${num(avgConsumption.value, 1)} km/L`, icon: Fuel, tone: "bg-accent/10 text-accent" },
]);

/* ---------- gráficos ---------- */
const costTypeEntries = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of filtered.value) {
    const k = r.cost_type || "Outros";
    acc[k] = (acc[k] || 0) + Number(r.total_value || 0);
  }
  return Object.entries(acc).sort((a, b) => b[1] - a[1]);
});
const byCostType = computed(() => ({
  labels: costTypeEntries.value.map((e) => e[0]),
  datasets: [{ data: costTypeEntries.value.map((e) => e[1]), backgroundColor: costTypeEntries.value.map((_, i) => seriesColors[i % seriesColors.length]), borderWidth: 0 }],
}));
const costTypeLegend = computed(() =>
  costTypeEntries.value.map(([label, value], i) => ({ label, value, color: seriesColors[i % seriesColors.length] })),
);
const pieOptions = { ...baseOptions, plugins: { legend: { display: false } } };

const monthly = computed(() => {
  const acc: Record<string, { custo: number; litros: number }> = {};
  for (const r of filtered.value) {
    if (!r.date) continue;
    const k = r.date.slice(0, 7);
    (acc[k] ??= { custo: 0, litros: 0 }).custo += Number(r.total_value || 0);
    acc[k].litros += Number(r.quantity || 0);
  }
  const keys = Object.keys(acc).sort();
  const label = (k: string) => { const [y, m] = k.split("-"); return `${m}/${y.slice(2)}`; };
  return {
    labels: keys.map(label),
    datasets: [
      { type: "bar" as const, label: "Custo (R$)", data: keys.map((k) => acc[k].custo), backgroundColor: palette.primary, borderRadius: 6, yAxisID: "y", order: 2 },
      { type: "line" as const, label: "Litros", data: keys.map((k) => acc[k].litros), borderColor: palette.success, backgroundColor: palette.success, tension: 0.35, pointRadius: 3, yAxisID: "y1", order: 1 },
    ],
  };
});
const monthlyOptions = {
  ...baseOptions,
  plugins: { legend: { position: "bottom" as const, labels: { usePointStyle: true, boxWidth: 8, padding: 16 } } },
  scales: {
    x: { grid: { display: false } },
    y: { position: "left" as const, ticks: { callback: brlTick }, grid: { drawOnChartArea: true } },
    y1: { position: "right" as const, ticks: { callback: (v: number | string) => `${v} L` }, grid: { drawOnChartArea: false } },
  },
};

/* ---------- cor da bolinha por tipo de combustível ---------- */
function typeColor(ct?: string) {
  const u = (ct ?? "").toUpperCase();
  if (u.includes("DIESEL")) return u.includes("(T)") ? "#f97316" : "#f59e0b";
  if (u.includes("ETANOL")) return "#10b981";
  if (u.includes("GASOLINA")) return "#ef4444";
  if (u.includes("ARLA")) return "#8b5cf6";
  return "#9ca3af";
}

/* ---------- paginação ---------- */
const page = ref(1);
const pageSize = 10;
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
watch(filtered, () => { page.value = 1; });
const pageNumbers = computed(() => {
  const t = totalPages.value, c = page.value;
  const out: (number | "...")[] = [];
  for (let p = 1; p <= t; p++) {
    if (p === 1 || p === t || Math.abs(p - c) <= 1) {
      if (out.length && (out[out.length - 1] as number) < p - 1) out.push("...");
      out.push(p);
    }
  }
  return out;
});

/* ---------- formulário ---------- */
const dialogOpen = ref(false);
const editing = ref<FuelRecord | null>(null);
const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  plate: "", cost_name: "", cost_type: "", quantity: 0, total_value: 0,
  unit: "LT" as "LT" | "UN", km: null as number | null,
  supplier: "", invoice_number: "", observation: "",
});
const form = reactive(emptyForm());
const selectedCostTypeId = ref("");
function selectCostType(id: string) {
  const ct = costTypes.value.find((c) => c.id === id);
  if (ct) { form.cost_type = ct.cost_type; form.cost_name = ct.cost_name; }
}
function openAdd() {
  editing.value = null;
  Object.assign(form, emptyForm());
  selectedCostTypeId.value = "";
  dialogOpen.value = true;
}
function openEdit(row: FuelRecord) {
  editing.value = row;
  Object.assign(form, {
    date: row.date?.slice(0, 10), plate: row.plate, cost_name: row.cost_name,
    cost_type: row.cost_type, quantity: Number(row.quantity), total_value: Number(row.total_value),
    unit: row.unit, km: row.km, supplier: row.supplier ?? "",
    invoice_number: row.invoice_number ?? "", observation: row.observation ?? "",
  });
  selectedCostTypeId.value =
    costTypes.value.find((c) => c.cost_type === row.cost_type && c.cost_name === row.cost_name)?.id ?? "";
  dialogOpen.value = true;
}
async function submit() {
  if (!form.plate) return toast.error("Selecione o veículo (placa)");
  if (!form.cost_type) return toast.error("Selecione o tipo de custo");
  const payload = { ...form, km: form.km || null };
  const ok = editing.value ? await update(editing.value.id, payload) : await create(payload);
  if (ok) dialogOpen.value = false;
}

/* ---------- exclusão ---------- */
const deleteId = ref<string | null>(null);
async function confirmDelete() {
  if (deleteId.value) await remove(deleteId.value);
  deleteId.value = null;
}

/* ---------- importação em massa (planilha/PDF) ---------- */
const importOpen = ref(false);
const importStep = ref<"upload" | "preview" | "importing" | "done">("upload");
const importFileName = ref("");
const importRows = ref<ImportRow[]>([]);
const importErrors = ref<string[]>([]);
const importResult = ref<FuelBulkResult | null>(null);
const parsing = ref(false);

function openImport() {
  importStep.value = "upload";
  importFileName.value = "";
  importRows.value = [];
  importErrors.value = [];
  importResult.value = null;
  importOpen.value = true;
}

async function onImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  importFileName.value = file.name;
  parsing.value = true;
  importRows.value = [];
  importErrors.value = [];
  try {
    const { rows, errors } = await parseImportFile(file);
    importRows.value = rows;
    importErrors.value = errors;
    if (rows.length) importStep.value = "preview";
    else toast.error(errors[0] || "Nenhum registro reconhecido no arquivo");
  } catch (err: any) {
    toast.error(err?.message || "Erro ao ler o arquivo");
  } finally {
    parsing.value = false;
    (e.target as HTMLInputElement).value = "";
  }
}

async function confirmImport() {
  if (!importRows.value.length) return;
  importStep.value = "importing";
  try {
    const res = await importFuelRecords(importRows.value);
    importResult.value = res;
    importStep.value = "done";
    await fetchAll();
  } catch (err: any) {
    toast.error(err?.response?.data?.detail || err?.message || "Erro ao importar");
    importStep.value = "preview";
  }
}
</script>

<template>
  <div class="w-full p-6 md:p-10">
    <PageHeader title="Abastecimentos" subtitle="Lançamentos de combustível" :icon="Fuel">
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" @click="downloadTemplate"><Download class="h-4 w-4" /> Baixar modelo</Button>
          <Button variant="outline" @click="openImport"><Upload class="h-4 w-4" /> Importar</Button>
          <Button @click="openAdd"><Plus class="h-4 w-4" /> Novo Abastecimento</Button>
        </div>
      </template>
    </PageHeader>

    <!-- Resumo -->
    <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        v-for="(s, i) in stats" :key="s.label"
        :label="s.label" :value="s.value" :icon="s.icon" :tone="s.tone"
        :highlight="s.highlight" :delay="0.05 + i * 0.05"
      />
    </div>

    <!-- Gráficos -->
    <div v-if="!loading && items.length" class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Tipos de Custo" caption="Participação por combustível" :delay="0.25">
        <div class="flex h-full items-center gap-5">
          <div class="h-full min-w-0 flex-1"><Doughnut :data="byCostType" :options="pieOptions" /></div>
          <ChartLegend class="flex-1" :items="costTypeLegend" :total="totalValue" />
        </div>
      </ChartCard>
      <ChartCard title="Custo e Litros por Período" caption="Evolução mensal" :delay="0.3">
        <Bar :data="(monthly as any)" :options="monthlyOptions" />
      </ChartCard>
    </div>

    <!-- Filtros -->
    <FilterBar :has-active="hasFilters" :delay="0.32" @clear="clearFilters">
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">De</span>
        <input v-model="filters.from" type="date" class="ui-input" />
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Até</span>
        <input v-model="filters.to" type="date" class="ui-input" />
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Categoria</span>
        <select v-model="filters.category" class="ui-input">
          <option value="">Todas</option>
          <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Custo</span>
        <select v-model="filters.costName" class="ui-input">
          <option value="">Todos</option>
          <option v-for="c in costNameOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Tipo de Custo</span>
        <select v-model="filters.costType" class="ui-input">
          <option value="">Todos</option>
          <option v-for="c in costTypeOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Placa</span>
        <select v-model="filters.plate" class="ui-input">
          <option value="">Todas</option>
          <option v-for="p in plateOptions" :key="p" :value="p">{{ p }}</option>
        </select>
      </label>
    </FilterBar>

    <!-- Tabela -->
    <div v-if="loading" class="flex justify-center py-20"><Spinner /></div>
    <div v-else class="a-in overflow-hidden rounded-xl border bg-card shadow-card" style="animation-delay: 0.38s">
      <div class="flex items-center justify-between border-b p-4">
        <div class="flex items-center gap-2">
          <Fuel class="h-4 w-4 text-warning" />
          <span class="text-sm font-bold uppercase tracking-wider">Lançamentos de Combustível</span>
          <Badge>{{ filtered.length }}</Badge>
        </div>
        <span class="text-sm font-semibold">{{ formatBRL(totalValue) }}</span>
      </div>

      <div class="scrollbar-brand overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-muted/50">
            <tr>
              <th class="th">Data</th>
              <th class="th">Veículo</th>
              <th class="th">Categoria</th>
              <th class="th">Tipo de Custo</th>
              <th class="th">Custo</th>
              <th class="th th-r">Litros</th>
              <th class="th th-r">Valor (R$)</th>
              <th class="th th-r">KM</th>
              <th class="th">Fornecedor</th>
              <th class="th th-r">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="paged.length === 0">
              <td colspan="10" class="py-12 text-center text-muted-foreground">Nenhum registro encontrado</td>
            </tr>
            <tr v-for="r in paged" :key="r.id" class="border-b transition-colors duration-200 hover:bg-primary/[0.06]">
              <!-- Data -->
              <td class="whitespace-nowrap px-4 py-2.5 font-medium">{{ formatDate(r.date) }}</td>
              <!-- Veículo -->
              <td class="whitespace-nowrap px-4 py-2.5">
                <div class="flex items-center gap-2">
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Car class="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div class="leading-tight">
                    <p class="text-sm font-bold tracking-widest">{{ r.plate }}</p>
                    <p v-if="r.vehicle_model || vehByPlate[r.plate]?.vehicle_model" class="text-xs text-muted-foreground">
                      {{ r.vehicle_model || vehByPlate[r.plate]?.vehicle_model }}
                    </p>
                  </div>
                </div>
              </td>
              <!-- Categoria -->
              <td class="px-4 py-2.5"><Badge>{{ catOf(r) || "—" }}</Badge></td>
              <!-- Tipo de Custo -->
              <td class="px-4 py-2.5">
                <span class="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-semibold">
                  <span class="h-1.5 w-1.5 rounded-full" :style="{ background: typeColor(r.cost_type) }" />
                  {{ r.cost_type }}
                </span>
              </td>
              <!-- Custo -->
              <td class="px-4 py-2.5"><Badge tone="bg-warning/10 text-warning border-warning/20">{{ r.cost_name }}</Badge></td>
              <!-- Litros -->
              <td class="px-4 py-2.5 text-right tabular-nums">{{ num(Number(r.quantity), 2) }}</td>
              <!-- Valor -->
              <td class="px-4 py-2.5 text-right font-semibold text-success tabular-nums">{{ formatBRL(r.total_value) }}</td>
              <!-- KM -->
              <td class="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{{ r.km ? num(Number(r.km)) : "—" }}</td>
              <!-- Fornecedor -->
              <td class="px-4 py-2.5">
                <div class="max-w-[180px] leading-tight">
                  <p class="truncate text-xs font-medium" :title="r.supplier ?? ''">{{ r.supplier || "—" }}</p>
                  <p v-if="r.invoice_number" class="text-xs text-muted-foreground">Nota: {{ r.invoice_number }}</p>
                </div>
              </td>
              <!-- Ações -->
              <td class="px-4 py-2.5">
                <div class="flex items-center justify-end gap-1">
                  <button class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" @click="openEdit(r)">
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                  <button class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" @click="deleteId = r.id">
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Rodapé + paginação -->
      <div class="flex flex-col items-center justify-between gap-3 border-t bg-muted/30 px-4 py-2.5 sm:flex-row">
        <span class="text-xs text-muted-foreground">{{ filtered.length }} de {{ items.length }} registro(s)</span>
        <div v-if="totalPages > 1" class="flex items-center gap-1">
          <button class="pg" :disabled="page === 1" @click="page = 1">«</button>
          <button class="pg" :disabled="page === 1" @click="page--">‹</button>
          <template v-for="(p, i) in pageNumbers" :key="i">
            <span v-if="p === '...'" class="px-1.5 text-xs text-muted-foreground">…</span>
            <button v-else class="pg" :class="p === page && 'border-primary bg-primary text-primary-foreground'" @click="page = (p as number)">{{ p }}</button>
          </template>
          <button class="pg" :disabled="page === totalPages" @click="page++">›</button>
          <button class="pg" :disabled="page === totalPages" @click="page = totalPages">»</button>
        </div>
      </div>
    </div>

    <!-- Formulário -->
    <Modal :open="dialogOpen" :title="editing ? 'Editar Abastecimento' : 'Novo Abastecimento'" :saving="saving" @close="dialogOpen = false" @submit="submit">
      <div class="grid grid-cols-2 gap-3">
        <FormField label="Data" required><input v-model="form.date" type="date" class="ui-input" /></FormField>
        <FormField label="Veículo (Placa)" required>
          <select v-model="form.plate" class="ui-input">
            <option value="">Selecione...</option>
            <option v-for="v in vehicleList" :key="v.id" :value="v.plate">{{ v.plate }} — {{ v.vehicle_model }}</option>
          </select>
        </FormField>
        <FormField label="Tipo de Custo" required class="col-span-2">
          <select v-model="selectedCostTypeId" class="ui-input" @change="selectCostType(selectedCostTypeId)">
            <option value="">Selecione...</option>
            <option v-for="c in costTypes" :key="c.id" :value="c.id">{{ c.cost_name }} — {{ c.cost_type }}</option>
          </select>
        </FormField>
        <FormField label="Quantidade" required><input v-model.number="form.quantity" type="number" step="0.001" class="ui-input" /></FormField>
        <FormField label="Unidade">
          <select v-model="form.unit" class="ui-input"><option>LT</option><option>UN</option></select>
        </FormField>
        <FormField label="Valor Total (R$)" required><input v-model.number="form.total_value" type="number" step="0.01" class="ui-input" /></FormField>
        <FormField label="KM"><input v-model.number="form.km" type="number" class="ui-input" /></FormField>
        <FormField label="Fornecedor" class="col-span-2"><input v-model="form.supplier" class="ui-input" /></FormField>
        <FormField label="Nota Fiscal"><input v-model="form.invoice_number" class="ui-input" /></FormField>
        <FormField label="Observação" class="col-span-2"><input v-model="form.observation" class="ui-input" /></FormField>
      </div>
    </Modal>

    <!-- Confirmar exclusão -->
    <Modal :open="!!deleteId" title="Confirmar exclusão" submit-label="Excluir" @close="deleteId = null" @submit="confirmDelete">
      <p class="text-sm text-muted-foreground">Tem certeza que deseja excluir este lançamento? Esta ação não poderá ser desfeita.</p>
    </Modal>

    <!-- Importar em massa -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="importOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" @click.self="importOpen = false">
          <div class="modal-panel flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border bg-card shadow-card-md">
            <div class="flex items-center justify-between border-b p-4">
              <div class="flex items-center gap-2">
                <Upload class="h-5 w-5 text-primary-hover" />
                <h2 class="text-base font-bold text-foreground">Importar Abastecimentos</h2>
              </div>
              <button class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" @click="importOpen = false"><X class="h-4 w-4" /></button>
            </div>

            <div class="scrollbar-brand flex-1 overflow-auto p-5">
              <!-- Upload -->
              <div v-if="importStep === 'upload'" class="space-y-4">
                <div class="rounded-xl border-2 border-dashed bg-muted/30 p-8 text-center">
                  <FileSpreadsheet class="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p class="mb-1 text-sm font-medium text-foreground">Selecione um arquivo CSV, Excel ou PDF</p>
                  <p class="mb-4 text-xs text-muted-foreground">
                    Use a planilha-modelo para o formato correto. O PDF do relatório de combustível do sistema antigo também é aceito.
                  </p>
                  <input
                    type="file" accept=".csv,.xlsx,.xls,.pdf" :disabled="parsing" @change="onImportFile"
                    class="block w-full text-xs text-muted-foreground file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-6 file:py-2 file:text-xs file:font-semibold file:text-primary-foreground hover:file:bg-primary-hover"
                  />
                  <p v-if="parsing" class="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground"><Spinner :size="4" /> Lendo arquivo...</p>
                </div>
                <button class="flex items-center gap-2 text-xs font-semibold text-primary-hover hover:underline" @click="downloadTemplate">
                  <Download class="h-3.5 w-3.5" /> Baixar planilha-modelo
                </button>
                <div v-if="importErrors.length && !importRows.length" class="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {{ importErrors[0] }}
                </div>
              </div>

              <!-- Pré-visualização -->
              <div v-else-if="importStep === 'preview'" class="space-y-3">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                    <CheckCircle2 class="h-3.5 w-3.5" /> {{ importRows.length }} válido(s)
                  </span>
                  <span v-if="importErrors.length" class="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                    <AlertTriangle class="h-3.5 w-3.5" /> {{ importErrors.length }} com problema
                  </span>
                  <span class="text-xs text-muted-foreground">de {{ importFileName }}</span>
                </div>

                <div class="scrollbar-brand max-h-[42vh] overflow-auto rounded-lg border">
                  <table class="w-full text-xs">
                    <thead class="sticky top-0 bg-muted/70 backdrop-blur">
                      <tr>
                        <th class="px-2 py-1.5 text-left font-semibold uppercase text-muted-foreground">Data</th>
                        <th class="px-2 py-1.5 text-left font-semibold uppercase text-muted-foreground">Placa</th>
                        <th class="px-2 py-1.5 text-left font-semibold uppercase text-muted-foreground">Tipo</th>
                        <th class="px-2 py-1.5 text-right font-semibold uppercase text-muted-foreground">Qtd</th>
                        <th class="px-2 py-1.5 text-right font-semibold uppercase text-muted-foreground">Valor</th>
                        <th class="px-2 py-1.5 text-left font-semibold uppercase text-muted-foreground">Fornecedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(r, i) in importRows.slice(0, 100)" :key="i" class="border-b border-border/60">
                        <td class="whitespace-nowrap px-2 py-1.5">{{ formatDate(r.date) }}</td>
                        <td class="whitespace-nowrap px-2 py-1.5 font-bold tracking-widest">{{ r.plate }}</td>
                        <td class="whitespace-nowrap px-2 py-1.5">{{ r.cost_type }}</td>
                        <td class="px-2 py-1.5 text-right tabular-nums">{{ r.quantity }}</td>
                        <td class="px-2 py-1.5 text-right font-semibold tabular-nums">{{ formatBRL(r.total_value) }}</td>
                        <td class="max-w-[160px] truncate px-2 py-1.5 text-muted-foreground">{{ r.supplier || "—" }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-if="importRows.length > 100" class="text-xs text-muted-foreground">Mostrando 100 de {{ importRows.length }} registros. Todos serão importados.</p>

                <details v-if="importErrors.length" class="rounded-lg border border-warning/20 bg-warning/[0.06] p-3">
                  <summary class="cursor-pointer text-xs font-semibold text-warning">{{ importErrors.length }} linha(s) ignorada(s) — ver detalhes</summary>
                  <ul class="mt-2 max-h-32 space-y-0.5 overflow-auto text-xs text-muted-foreground">
                    <li v-for="(e, i) in importErrors.slice(0, 60)" :key="i">• {{ e }}</li>
                  </ul>
                </details>
              </div>

              <!-- Importando -->
              <div v-else-if="importStep === 'importing'" class="flex flex-col items-center justify-center gap-4 py-16">
                <Spinner :size="10" />
                <p class="text-sm text-muted-foreground">Importando {{ importRows.length }} registro(s)...</p>
              </div>

              <!-- Concluído -->
              <div v-else-if="importStep === 'done' && importResult" class="space-y-4">
                <div class="rounded-xl border border-success/20 bg-success/10 p-6 text-center">
                  <CheckCircle2 class="mx-auto mb-3 h-12 w-12 text-success" />
                  <p class="text-lg font-bold text-success">{{ importResult.created }} abastecimento(s) importado(s)!</p>
                  <p v-if="importResult.skipped" class="mt-1 text-sm text-warning">{{ importResult.skipped }} ignorado(s) (veja abaixo)</p>
                </div>
                <details v-if="importResult.errors.length" class="rounded-lg border border-warning/20 bg-warning/[0.06] p-3">
                  <summary class="cursor-pointer text-xs font-semibold text-warning">Linhas ignoradas</summary>
                  <ul class="mt-2 max-h-40 space-y-0.5 overflow-auto text-xs text-muted-foreground">
                    <li v-for="(e, i) in importResult.errors" :key="i">• Linha {{ e.index + 1 }} ({{ e.plate || "—" }}): {{ e.reason }}</li>
                  </ul>
                </details>
              </div>
            </div>

            <!-- Rodapé -->
            <div class="flex justify-end gap-2 border-t p-4">
              <template v-if="importStep === 'upload'">
                <Button variant="outline" @click="importOpen = false">Cancelar</Button>
              </template>
              <template v-else-if="importStep === 'preview'">
                <Button variant="outline" @click="importStep = 'upload'">Voltar</Button>
                <Button @click="confirmImport"><CheckCircle2 class="h-4 w-4" /> Importar {{ importRows.length }} registro(s)</Button>
              </template>
              <template v-else-if="importStep === 'done'">
                <Button @click="importOpen = false">Fechar</Button>
              </template>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.th {
  @apply px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground;
}
.th-r {
  @apply text-right;
}
.pg {
  @apply flex h-7 min-w-[1.75rem] items-center justify-center rounded-md border bg-card px-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40;
}
.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease-in-out; }
.modal-enter-active .modal-panel, .modal-leave-active .modal-panel { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-in-out; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-panel, .modal-leave-to .modal-panel { transform: scale(0.95) translateY(8px); opacity: 0; }
</style>
