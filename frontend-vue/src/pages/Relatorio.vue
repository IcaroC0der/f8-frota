<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { FileText, FileSpreadsheet, FileDown } from "lucide-vue-next";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { fuelRecords, maintenanceRecords, operationalCostRecords } from "@/services/api";
import { formatBRL, formatDate } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader.vue";
import FilterBar from "@/components/ui/FilterBar.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import Spinner from "@/components/ui/Spinner.vue";

interface Row {
  date: string; module: string; plate: string;
  description: string; supplier: string; total_value: number;
}

const loading = ref(true);
const rows = ref<Row[]>([]);

const fModule = ref("all");
const fFrom = ref("");
const fTo = ref("");
const fPlate = ref("");

onMounted(async () => {
  try {
    const [fuel, maint, oper] = await Promise.all([
      fuelRecords.list({ limit: 5000 }),
      maintenanceRecords.list({ limit: 5000 }),
      operationalCostRecords.list({ limit: 5000 }),
    ]);
    rows.value = [
      ...fuel.map((r: any) => ({ date: r.date, module: "Combustível", plate: r.plate ?? "", description: r.cost_type, supplier: r.supplier ?? "", total_value: Number(r.total_value || 0) })),
      ...maint.map((r: any) => ({ date: r.date, module: "Manutenção", plate: r.plate ?? "", description: `${r.classification} / ${r.cost_type}`, supplier: r.supplier ?? "", total_value: Number(r.total_value || 0) })),
      ...oper.map((r: any) => ({ date: r.date, module: "Operacional", plate: r.plate ?? "", description: r.cost_name, supplier: r.supplier ?? "", total_value: Number(r.total_value || 0) })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));
  } finally {
    loading.value = false;
  }
});

const filtered = computed(() =>
  rows.value.filter((r) => {
    if (fModule.value !== "all" && r.module !== fModule.value) return false;
    if (fFrom.value && r.date < fFrom.value) return false;
    if (fTo.value && r.date > fTo.value) return false;
    if (fPlate.value && !r.plate.toLowerCase().includes(fPlate.value.toLowerCase())) return false;
    return true;
  }),
);
const total = computed(() => filtered.value.reduce((s, r) => s + r.total_value, 0));
const hasFilters = computed(() => fModule.value !== "all" || !!fFrom.value || !!fTo.value || !!fPlate.value);
function clearFilters() {
  fModule.value = "all";
  fFrom.value = "";
  fTo.value = "";
  fPlate.value = "";
}

const moduleTone: Record<string, string> = {
  "Combustível": "bg-warning/10 text-warning border-warning/20",
  "Manutenção": "bg-destructive/10 text-destructive border-destructive/20",
  "Operacional": "bg-success/10 text-success border-success/20",
};

function exportExcel() {
  const data = filtered.value.map((r) => ({
    Data: formatDate(r.date), Módulo: r.module, Placa: r.plate,
    Descrição: r.description, Fornecedor: r.supplier, "Valor (R$)": r.total_value,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(wb, "relatorio-frota.xlsx");
}

function exportPDF() {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Relatório de Custos — Frota F8", 14, 16);
  doc.setFontSize(10);
  doc.text(`Total: ${formatBRL(total.value)}  ·  ${filtered.value.length} lançamento(s)`, 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [["Data", "Módulo", "Placa", "Descrição", "Fornecedor", "Valor"]],
    body: filtered.value.map((r) => [
      formatDate(r.date), r.module, r.plate, r.description, r.supplier, formatBRL(r.total_value),
    ]),
    styles: { fontSize: 8 },
    // Identidade F8: cabeçalho amarelo com texto preto
    headStyles: { fillColor: [251, 191, 36], textColor: [0, 0, 0], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 249, 249] },
  });
  doc.save("relatorio-frota.pdf");
}
</script>

<template>
  <div class="w-full p-6 md:p-10">
    <PageHeader title="Relatório" subtitle="Consolidação e exportação de custos" :icon="FileText">
      <template #actions>
        <div class="flex gap-2">
          <Button variant="outline" @click="exportExcel"><FileSpreadsheet class="h-4 w-4" /> Excel</Button>
          <Button @click="exportPDF"><FileDown class="h-4 w-4" /> PDF</Button>
        </div>
      </template>
    </PageHeader>

    <FilterBar :has-active="hasFilters" :delay="0.08" @clear="clearFilters">
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Módulo</span>
        <select v-model="fModule" class="ui-input">
          <option value="all">Todos</option><option>Combustível</option><option>Manutenção</option><option>Operacional</option>
        </select>
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">De</span>
        <input v-model="fFrom" type="date" class="ui-input" />
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Até</span>
        <input v-model="fTo" type="date" class="ui-input" />
      </label>
      <label class="block"><span class="mb-1 block text-xs font-medium text-muted-foreground">Placa</span>
        <input v-model="fPlate" class="ui-input" placeholder="Filtrar placa..." />
      </label>
    </FilterBar>

    <div v-if="loading" class="flex justify-center py-20"><Spinner /></div>
    <div v-else class="a-in overflow-hidden rounded-xl border bg-card shadow-card" style="animation-delay: 0.15s">
      <div class="flex items-center justify-between border-b p-4">
        <span class="text-sm text-muted-foreground">{{ filtered.length }} lançamento(s)</span>
        <span class="text-lg font-bold">{{ formatBRL(total) }}</span>
      </div>
      <div class="max-h-[60vh] overflow-auto">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-muted/80 backdrop-blur">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Data</th>
              <th class="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Módulo</th>
              <th class="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Placa</th>
              <th class="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Descrição</th>
              <th class="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Fornecedor</th>
              <th class="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in filtered" :key="i" class="border-b hover:bg-muted/30">
              <td class="whitespace-nowrap px-4 py-2">{{ formatDate(r.date) }}</td>
              <td class="px-4 py-2"><Badge :tone="moduleTone[r.module]">{{ r.module }}</Badge></td>
              <td class="px-4 py-2 font-medium">{{ r.plate || "—" }}</td>
              <td class="px-4 py-2 text-muted-foreground">{{ r.description }}</td>
              <td class="px-4 py-2 text-muted-foreground">{{ r.supplier || "—" }}</td>
              <td class="px-4 py-2 text-right font-semibold">{{ formatBRL(r.total_value) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
