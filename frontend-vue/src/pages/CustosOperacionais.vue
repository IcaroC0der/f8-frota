<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { DollarSign, Plus, ClipboardList, CalendarDays, TrendingUp } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { Doughnut, Line } from "vue-chartjs";
import {
  operationalCostRecords, operationalCosts, vehicles,
  type OperationalCostRecord, type OperationalCost, type Vehicle,
} from "@/services/api";
import { useResource } from "@/composables/useResource";
import { formatBRL, formatDate } from "@/lib/utils";
import { seriesColors, palette, baseOptions, brlTick } from "@/lib/charts";
import PageHeader from "@/components/ui/PageHeader.vue";
import DataTable from "@/components/ui/DataTable.vue";
import Modal from "@/components/ui/Modal.vue";
import Button from "@/components/ui/Button.vue";
import StatCard from "@/components/ui/StatCard.vue";
import ChartCard from "@/components/ui/ChartCard.vue";
import ChartLegend from "@/components/ui/ChartLegend.vue";
import FormField from "@/components/ui/FormField.vue";
import Spinner from "@/components/ui/Spinner.vue";

const { items, loading, saving, fetchAll, create, update, remove } =
  useResource<OperationalCostRecord>(operationalCostRecords, {
    created: "Custo lançado!", updated: "Custo atualizado!", removed: "Lançamento excluído!",
  });
const costList = ref<OperationalCost[]>([]);
const vehicleList = ref<Vehicle[]>([]);

const dialogOpen = ref(false);
const editing = ref<OperationalCostRecord | null>(null);
const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  cost_name: "", plate: "", vehicle_model: "", category_name: "",
  total_value: 0, km: null as number | null,
  supplier: "", invoice_number: "", attachment_url: "", observation: "",
});
const form = reactive(emptyForm());

onMounted(async () => {
  await Promise.all([
    fetchAll(),
    operationalCosts.list({ limit: 1000 }).then((c) => (costList.value = c)),
    vehicles.list({ limit: 1000 }).then((v) => (vehicleList.value = v)),
  ]);
});

const total = computed(() => items.value.reduce((s, r) => s + Number(r.total_value || 0), 0));
const avgDaily = computed(() => {
  const dates = items.value.map((r) => r.date).filter(Boolean).sort();
  if (dates.length < 2) return total.value;
  const d1 = new Date(dates[0] + "T12:00:00").getTime();
  const d2 = new Date(dates[dates.length - 1] + "T12:00:00").getTime();
  const days = Math.max(1, Math.round((d2 - d1) / 86400000));
  return total.value / days;
});
const avgMonthly = computed(() => {
  const months = new Set(items.value.map((r) => r.date?.slice(0, 7)).filter(Boolean));
  return months.size > 0 ? total.value / months.size : total.value;
});

const stats = computed(() => [
  { label: "Custo Total", value: formatBRL(total.value), sub: `${items.value.length} lançamentos`, icon: DollarSign, tone: "bg-primary/15 text-primary-hover", highlight: true },
  { label: "Lançamentos", value: items.value.length, sub: `${costList.value.length} tipos de custo`, icon: ClipboardList, tone: "bg-accent/10 text-accent" },
  { label: "Média Diária", value: formatBRL(avgDaily.value), sub: "por dia", icon: CalendarDays, tone: "bg-warning/10 text-warning" },
  { label: "Média Mensal", value: formatBRL(avgMonthly.value), sub: "por mês", icon: TrendingUp, tone: "bg-success/10 text-success" },
]);

/* ---- Gráfico 1: donut por tipo de custo (total no centro + legenda R$/%) ---- */
const costEntries = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of items.value) {
    const k = r.cost_name || "Outros";
    acc[k] = (acc[k] || 0) + Number(r.total_value || 0);
  }
  return Object.entries(acc).sort((a, b) => b[1] - a[1]);
});
const byCost = computed(() => ({
  labels: costEntries.value.map((e) => e[0]),
  datasets: [{ data: costEntries.value.map((e) => e[1]), backgroundColor: costEntries.value.map((_, i) => seriesColors[i % seriesColors.length]), borderWidth: 0 }],
}));
const costLegend = computed(() =>
  costEntries.value.map(([label, value], i) => ({ label, value, color: seriesColors[i % seriesColors.length] })),
);
const donutOptions = { ...baseOptions, cutout: "68%", plugins: { legend: { display: false } } };

/* ---- Gráfico 2: evolução mensal (área) ---- */
const monthly = computed(() => {
  const acc: Record<string, number> = {};
  for (const r of items.value) {
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

function onPlate() {
  const v = vehicleList.value.find((x) => x.plate === form.plate);
  form.vehicle_model = v?.vehicle_model ?? "";
  form.category_name = v?.category_name ?? "";
}

// Mais recentes primeiro.
const sorted = computed(() =>
  [...items.value].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
);

const columns = [
  { key: "date", label: "Data" },
  { key: "cost_name", label: "Custo" },
  { key: "plate", label: "Placa" },
  { key: "supplier", label: "Fornecedor" },
  { key: "total_value", label: "Valor" },
];

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
</script>

<template>
  <div class="w-full p-6 md:p-10">
    <PageHeader title="Custos Operacionais" subtitle="Lançamentos de custos operacionais" :icon="DollarSign">
      <template #actions>
        <Button @click="openAdd"><Plus class="h-4 w-4" /> Novo Custo</Button>
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

    <div v-if="loading" class="flex justify-center py-20"><Spinner /></div>
    <DataTable v-else :columns="columns" :data="sorted" search-placeholder="Buscar por custo, placa, fornecedor..." @edit="openEdit" @delete="remove">
      <template #cell-date="{ value }">{{ formatDate(value) }}</template>
      <template #cell-plate="{ value }">{{ value ?? "—" }}</template>
      <template #cell-total_value="{ value }"><span class="font-semibold">{{ formatBRL(value) }}</span></template>
    </DataTable>

    <Modal :open="dialogOpen" :title="editing ? 'Editar Custo' : 'Novo Custo Operacional'" :saving="saving" @close="dialogOpen = false" @submit="submit">
      <div class="grid grid-cols-2 gap-3">
        <FormField label="Data" required><input v-model="form.date" type="date" class="ui-input" /></FormField>
        <FormField label="Tipo de Custo" required>
          <select v-model="form.cost_name" class="ui-input">
            <option value="">Selecione...</option>
            <option v-for="c in costList" :key="c.id" :value="c.name">{{ c.name }}</option>
          </select>
        </FormField>
        <FormField label="Veículo (Placa) — opcional">
          <select v-model="form.plate" class="ui-input" @change="onPlate">
            <option value="">Sem veículo</option>
            <option v-for="v in vehicleList" :key="v.id" :value="v.plate">{{ v.plate }} — {{ v.vehicle_model }}</option>
          </select>
        </FormField>
        <FormField label="Valor Total (R$)" required><input v-model.number="form.total_value" type="number" step="0.01" class="ui-input" /></FormField>
        <FormField label="Fornecedor"><input v-model="form.supplier" class="ui-input" /></FormField>
        <FormField label="Nota Fiscal"><input v-model="form.invoice_number" class="ui-input" /></FormField>
        <FormField label="KM"><input v-model.number="form.km" type="number" class="ui-input" /></FormField>
        <FormField label="URL do Anexo"><input v-model="form.attachment_url" class="ui-input" placeholder="https://..." /></FormField>
        <FormField label="Observação" class="col-span-2"><input v-model="form.observation" class="ui-input" /></FormField>
      </div>
    </Modal>
  </div>
</template>
