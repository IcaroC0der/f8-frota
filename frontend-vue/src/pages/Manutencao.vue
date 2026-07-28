<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { Wrench, Plus, DollarSign, ShieldCheck, BarChart3, Car, Paperclip, Pencil, Trash2 } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { Doughnut, Bar } from "vue-chartjs";
import {
  maintenanceRecords, vehicles, maintenanceClassifications, maintenanceCostTypes, uploadFile,
  type MaintenanceRecord, type Vehicle, type MaintenanceClassification, type MaintenanceCostType,
} from "@/services/api";
import { useResource } from "@/composables/useResource";
import { formatBRL, formatDate, formatNum } from "@/lib/utils";
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

const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
async function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploading.value = true;
  try {
    const { url } = await uploadFile(file);
    form.attachment_url = url;
    toast.success("Arquivo anexado!");
  } catch { toast.error("Erro ao enviar arquivo."); }
  finally { uploading.value = false; if (fileInput.value) fileInput.value.value = ""; }
}

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
const groupColorMap = computed(() => {
  const m: Record<string, string> = {};
  groupEntries.value.forEach(([label], i) => { m[label] = seriesColors[i % seriesColors.length]; });
  return m;
});
const groupColor = (name?: string) => groupColorMap.value[name || "Outros"] ?? "#9ca3af";
const byGroup = computed(() => ({
  labels: groupEntries.value.map((e) => e[0]),
  datasets: [{ data: groupEntries.value.map((e) => e[1]), backgroundColor: groupEntries.value.map(([l]) => groupColor(l)), borderWidth: 0 }],
}));
const groupLegend = computed(() =>
  groupEntries.value.map(([label, value]) => ({ label, value, color: groupColor(label) })),
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

/* ---------- exclusão ---------- */
const deleteId = ref<string | null>(null);
async function confirmDelete() {
  if (deleteId.value) await remove(deleteId.value);
  deleteId.value = null;
}

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
    <div v-else class="a-in overflow-hidden rounded-xl border bg-card shadow-card" style="animation-delay: 0.38s">
      <div class="flex items-center justify-between border-b p-4">
        <div class="flex items-center gap-2">
          <Wrench class="h-4 w-4 text-destructive" />
          <span class="text-sm font-bold uppercase tracking-wider">Lançamentos de Manutenção</span>
          <Badge>{{ filtered.length }}</Badge>
        </div>
        <span class="text-sm font-semibold">{{ formatBRL(total) }}</span>
      </div>

      <div class="scrollbar-brand overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-muted/50">
            <tr>
              <th class="th">Data</th>
              <th class="th">Veículo</th>
              <th class="th">Categoria</th>
              <th class="th">Classificação</th>
              <th class="th">Custo</th>
              <th class="th">Tipo</th>
              <th class="th">Fornecedor</th>
              <th class="th th-r">Valor (R$)</th>
              <th class="th th-r">KM</th>
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
              <!-- Classificação -->
              <td class="px-4 py-2.5">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="isPrev(r.classification) ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                  {{ r.classification || "—" }}
                </span>
              </td>
              <!-- Custo (grupo) -->
              <td class="px-4 py-2.5">
                <span class="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-semibold">
                  <span class="h-1.5 w-1.5 rounded-full" :style="{ background: groupColor(r.cost_group) }" />
                  {{ r.cost_group || "—" }}
                </span>
              </td>
              <!-- Tipo -->
              <td class="px-4 py-2.5 text-xs font-medium">{{ r.cost_type || "—" }}</td>
              <!-- Fornecedor -->
              <td class="px-4 py-2.5">
                <div class="max-w-[160px] leading-tight">
                  <p class="truncate text-xs font-medium" :title="r.supplier ?? ''">{{ r.supplier || "—" }}</p>
                  <p v-if="r.invoice_number" class="text-xs text-muted-foreground">NF: {{ r.invoice_number }}</p>
                </div>
              </td>
              <!-- Valor -->
              <td class="px-4 py-2.5 text-right font-semibold text-destructive tabular-nums">{{ formatBRL(r.total_value) }}</td>
              <!-- KM -->
              <td class="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{{ r.km ? formatNum(Number(r.km)) : "—" }}</td>
              <!-- Ações -->
              <td class="px-4 py-2.5">
                <div class="flex items-center justify-end gap-1">
                  <a
                    v-if="r.attachment_url" :href="r.attachment_url" target="_blank" rel="noopener noreferrer"
                    class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Paperclip class="h-3.5 w-3.5" />
                  </a>
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
        <FormField label="Anexo (PDF/Imagem)" class="col-span-2">
          <div class="flex items-center gap-2">
            <label class="flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
              <Paperclip class="h-3.5 w-3.5" />
              {{ uploading ? "Enviando..." : "Escolher arquivo" }}
              <input ref="fileInput" type="file" accept=".pdf,.png,.jpg,.jpeg" class="hidden" :disabled="uploading" @change="handleFileUpload" />
            </label>
            <a v-if="form.attachment_url" :href="form.attachment_url" target="_blank" rel="noopener noreferrer" class="text-xs text-primary underline">Ver anexo atual</a>
            <button v-if="form.attachment_url" type="button" class="text-xs text-destructive hover:underline" @click="form.attachment_url = ''">Remover</button>
          </div>
        </FormField>
        <FormField label="Observação" class="col-span-2"><input v-model="form.observation" class="ui-input" /></FormField>
      </div>
    </Modal>

    <!-- Confirmar exclusão -->
    <Modal :open="!!deleteId" title="Confirmar exclusão" submit-label="Excluir" @close="deleteId = null" @submit="confirmDelete">
      <p class="text-sm text-muted-foreground">Tem certeza que deseja excluir este lançamento? Esta ação não poderá ser desfeita.</p>
    </Modal>
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
</style>
