<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { DollarSign, Plus, ClipboardList, CalendarDays, TrendingUp, Car, Paperclip, Pencil, Trash2 } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { Doughnut, Line } from "vue-chartjs";
import {
  operationalCostRecords, operationalCosts, vehicles, uploadFile,
  type OperationalCostRecord, type OperationalCost, type Vehicle,
} from "@/services/api";
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
import SearchSelect from "@/components/ui/SearchSelect.vue";

const { items, loading, saving, fetchAll, create, update, remove } =
  useResource<OperationalCostRecord>(operationalCostRecords, {
    created: "Custo lançado!", updated: "Custo atualizado!", removed: "Lançamento excluído!",
  });
const costList = ref<OperationalCost[]>([]);
const vehicleList = ref<Vehicle[]>([]);

onMounted(async () => {
  await Promise.all([
    fetchAll(),
    operationalCosts.list({ limit: 1000 }).then((c) => (costList.value = c)),
    vehicles.list({ limit: 1000 }).then((v) => (vehicleList.value = v)),
  ]);
});

const vehByPlate = computed(() => {
  const m: Record<string, Vehicle> = {};
  for (const v of vehicleList.value) if (v.plate) m[v.plate] = v;
  return m;
});

/* ---------- filtros ---------- */
const filters = reactive({ from: "", to: "", costName: "", plate: "" });
const filtered = computed(() =>
  items.value
    .filter((r) => {
      if (filters.from && (r.date ?? "") < filters.from) return false;
      if (filters.to && (r.date ?? "") > filters.to) return false;
      if (filters.costName && r.cost_name !== filters.costName) return false;
      if (filters.plate && r.plate !== filters.plate) return false;
      return true;
    })
    // Mais recentes primeiro.
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
);
const hasFilters = computed(() => Object.values(filters).some(Boolean));
function clearFilters() {
  filters.from = filters.to = filters.costName = filters.plate = "";
}

const uniqSorted = (arr: (string | undefined | null)[]) =>
  [...new Set(arr.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));
const costNameOptions = computed(() => uniqSorted(items.value.map((r) => r.cost_name)));
const plateOptions = computed(() => uniqSorted(items.value.map((r) => r.plate)));

/* ---------- resumo (reflete os filtros) ---------- */
const total = computed(() => filtered.value.reduce((s, r) => s + Number(r.total_value || 0), 0));
const avgDaily = computed(() => {
  const dates = filtered.value.map((r) => r.date).filter(Boolean).sort();
  if (dates.length < 2) return total.value;
  const d1 = new Date(dates[0] + "T12:00:00").getTime();
  const d2 = new Date(dates[dates.length - 1] + "T12:00:00").getTime();
  const days = Math.max(1, Math.round((d2 - d1) / 86400000));
  return total.value / days;
});
const avgMonthly = computed(() => {
  const months = new Set(filtered.value.map((r) => r.date?.slice(0, 7)).filter(Boolean));
  return months.size > 0 ? total.value / months.size : total.value;
});

const stats = computed(() => [
  { label: "Custo Total", value: formatBRL(total.value), sub: `${filtered.value.length} lançamentos`, icon: DollarSign, tone: "bg-primary/15 text-primary-hover", highlight: true },
  { label: "Lançamentos", value: filtered.value.length, sub: `${costList.value.length} tipos de custo`, icon: ClipboardList, tone: "bg-accent/10 text-accent" },
  { label: "Média Diária", value: formatBRL(avgDaily.value), sub: "por dia", icon: CalendarDays, tone: "bg-warning/10 text-warning" },
  { label: "Média Mensal", value: formatBRL(avgMonthly.value), sub: "por mês", icon: TrendingUp, tone: "bg-success/10 text-success" },
]);

/* ---------- cor por tipo de custo (consistente donut ↔ pill da tabela) ---------- */
const costEntries = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of filtered.value) {
    const k = r.cost_name || "Outros";
    acc[k] = (acc[k] || 0) + Number(r.total_value || 0);
  }
  return Object.entries(acc).sort((a, b) => b[1] - a[1]);
});
const costColorMap = computed(() => {
  const m: Record<string, string> = {};
  costEntries.value.forEach(([label], i) => { m[label] = seriesColors[i % seriesColors.length]; });
  return m;
});
const costColor = (name?: string) => costColorMap.value[name || "Outros"] ?? "#9ca3af";

/* ---------- Gráfico 1: donut por tipo de custo ---------- */
const byCost = computed(() => ({
  labels: costEntries.value.map((e) => e[0]),
  datasets: [{ data: costEntries.value.map((e) => e[1]), backgroundColor: costEntries.value.map(([l]) => costColor(l)), borderWidth: 0 }],
}));
const costLegend = computed(() =>
  costEntries.value.map(([label, value]) => ({ label, value, color: costColor(label) })),
);
const donutOptions = { ...baseOptions, cutout: "68%", plugins: { legend: { display: false } } };

/* ---------- Gráfico 2: evolução mensal (área) ---------- */
const monthly = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of filtered.value) {
    if (!r.date) continue;
    const k = r.date.slice(0, 7);
    acc[k] = (acc[k] || 0) + Number(r.total_value || 0);
  }
  const keys = Object.keys(acc).sort();
  const label = (k: string) => { const [y, m] = k.split("-"); return `${m}/${y.slice(2)}`; };
  return {
    labels: keys.map(label),
    datasets: [{
      label: "Custo", data: keys.map((k) => acc[k]),
      borderColor: palette.primary, backgroundColor: "rgba(251,191,36,0.12)",
      fill: true, tension: 0.35, pointRadius: 3, borderWidth: 2.5,
    }],
  };
});
const areaOptions = {
  ...baseOptions,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false } }, y: { ticks: { callback: brlTick } } },
};

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

/* ---------- formulário ---------- */
const dialogOpen = ref(false);
const editing = ref<OperationalCostRecord | null>(null);
const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  cost_name: "", plate: "", vehicle_model: "", category_name: "",
  total_value: 0, km: null as number | null,
  supplier: "", invoice_number: "", attachment_url: "", observation: "",
});
const form = reactive(emptyForm());

const costNameFormOpts = computed(() =>
  costList.value
    .map((c) => ({ value: c.name, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label)),
);
const vehicleFormOpts = computed(() =>
  vehicleList.value
    .filter((v) => v.plate)
    .sort((a, b) => a.plate.localeCompare(b.plate))
    .map((v) => ({ value: v.plate, label: `${v.plate} — ${v.vehicle_model || "S/MODELO"}` })),
);

function onPlate() {
  const v = vehByPlate.value[form.plate];
  form.vehicle_model = v?.vehicle_model ?? "";
  form.category_name = v?.category_name ?? "";
}
function openAdd() {
  editing.value = null;
  Object.assign(form, emptyForm());
  dialogOpen.value = true;
}
function openEdit(row: OperationalCostRecord) {
  editing.value = row;
  Object.assign(form, {
    date: row.date?.slice(0, 10), cost_name: row.cost_name, plate: row.plate ?? "",
    vehicle_model: row.vehicle_model ?? "", category_name: row.category_name ?? "",
    total_value: Number(row.total_value), km: row.km, supplier: row.supplier ?? "",
    invoice_number: row.invoice_number ?? "", attachment_url: row.attachment_url ?? "",
    observation: row.observation ?? "",
  });
  dialogOpen.value = true;
}
async function submit() {
  if (!form.cost_name) return toast.error("Selecione o tipo de custo");
  const payload = { ...form, plate: form.plate || null, km: form.km || null };
  const ok = editing.value ? await update(editing.value.id, payload) : await create(payload);
  if (ok) dialogOpen.value = false;
}

/* ---------- exclusão ---------- */
const deleteId = ref<string | null>(null);
async function confirmDelete() {
  if (deleteId.value) await remove(deleteId.value);
  deleteId.value = null;
}
</script>

<template>
  <div class="w-full p-6 md:p-10">
    <PageHeader title="Custos Operacionais" subtitle="Lançamentos de custos operacionais" :icon="DollarSign">
      <template #actions>
        <Button @click="openAdd"><Plus class="h-4 w-4" /> Novo Custo</Button>
      </template>
    </PageHeader>

    <!-- Resumo -->
    <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        v-for="(s, i) in stats" :key="s.label"
        :label="s.label" :value="s.value" :sub="s.sub" :icon="s.icon" :tone="s.tone"
        :highlight="s.highlight" :delay="0.05 + i * 0.05"
      />
    </div>

    <!-- Gráficos -->
    <div v-if="!loading && items.length" class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Custo por Tipo" caption="Participação por categoria" :delay="0.25">
        <div class="flex h-full items-center gap-5">
          <div class="relative h-full min-w-0 flex-1">
            <Doughnut :data="byCost" :options="donutOptions" />
            <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-[11px] font-semibold text-muted-foreground">Total</span>
              <span class="text-sm font-extrabold text-foreground">{{ formatBRL(total) }}</span>
            </div>
          </div>
          <ChartLegend class="flex-1" :items="costLegend" :total="total" />
        </div>
      </ChartCard>
      <ChartCard title="Evolução dos Custos" caption="Total por mês" :delay="0.3">
        <Line :data="monthly" :options="areaOptions" />
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
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Custo</span>
        <select v-model="filters.costName" class="ui-input">
          <option value="">Todos</option>
          <option v-for="c in costNameOptions" :key="c" :value="c">{{ c }}</option>
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
          <DollarSign class="h-4 w-4 text-primary" />
          <span class="text-sm font-bold uppercase tracking-wider">Lançamentos de Custos</span>
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
              <th class="th">Custo</th>
              <th class="th">Descrição</th>
              <th class="th">Fornecedor</th>
              <th class="th th-r">Valor (R$)</th>
              <th class="th th-r">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="paged.length === 0">
              <td colspan="7" class="py-12 text-center text-muted-foreground">Nenhum lançamento encontrado</td>
            </tr>
            <tr v-for="r in paged" :key="r.id" class="border-b transition-colors duration-200 hover:bg-primary/[0.06]">
              <!-- Data -->
              <td class="whitespace-nowrap px-4 py-2.5 font-medium">{{ formatDate(r.date) }}</td>
              <!-- Veículo -->
              <td class="whitespace-nowrap px-4 py-2.5">
                <div v-if="r.plate" class="flex items-center gap-2">
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
                <span v-else class="text-xs text-muted-foreground">—</span>
              </td>
              <!-- Custo -->
              <td class="px-4 py-2.5">
                <span class="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-semibold">
                  <span class="h-1.5 w-1.5 rounded-full" :style="{ background: costColor(r.cost_name) }" />
                  {{ r.cost_name || "—" }}
                </span>
              </td>
              <!-- Descrição -->
              <td class="px-4 py-2.5">
                <span class="block max-w-[200px] truncate text-xs text-muted-foreground" :title="r.observation ?? ''">{{ r.observation || "—" }}</span>
              </td>
              <!-- Fornecedor -->
              <td class="px-4 py-2.5">
                <div class="max-w-[160px] leading-tight">
                  <p class="truncate text-xs font-medium" :title="r.supplier ?? ''">{{ r.supplier || "—" }}</p>
                  <p v-if="r.invoice_number" class="text-xs text-muted-foreground">Nota: {{ r.invoice_number }}</p>
                </div>
              </td>
              <!-- Valor -->
              <td class="px-4 py-2.5 text-right font-semibold text-success tabular-nums">{{ formatBRL(r.total_value) }}</td>
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

    <!-- Formulário -->
    <Modal :open="dialogOpen" :title="editing ? 'Editar Custo' : 'Novo Custo Operacional'" :saving="saving" @close="dialogOpen = false" @submit="submit">
      <div class="grid grid-cols-2 gap-3">
        <FormField label="Data" required><input v-model="form.date" type="date" class="ui-input" /></FormField>
        <FormField label="Tipo de Custo" required>
          <SearchSelect v-model="form.cost_name" :options="costNameFormOpts" placeholder="Buscar custo..." />
        </FormField>
        <FormField label="Veículo (Placa) — opcional">
          <SearchSelect v-model="form.plate" :options="vehicleFormOpts" placeholder="Buscar placa..." @change="onPlate" />
        </FormField>
        <FormField label="Valor Total (R$)" required><input v-model.number="form.total_value" type="number" step="0.01" class="ui-input" /></FormField>
        <FormField label="Fornecedor"><input v-model="form.supplier" class="ui-input" /></FormField>
        <FormField label="Nota Fiscal"><input v-model="form.invoice_number" class="ui-input" /></FormField>
        <FormField label="KM"><input v-model.number="form.km" type="number" class="ui-input" /></FormField>
        <FormField label="Anexo (PDF/Imagem)">
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
