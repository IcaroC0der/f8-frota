<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Users as UsersIcon, Plus } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { users, type User } from "@/services/api";
import { useResource } from "@/composables/useResource";
import { formatDate } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader.vue";
import DataTable from "@/components/ui/DataTable.vue";
import Modal from "@/components/ui/Modal.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import FormField from "@/components/ui/FormField.vue";
import Spinner from "@/components/ui/Spinner.vue";

const { items, loading, saving, fetchAll, create, update, remove } =
  useResource<User>(users, { created: "Usuário criado!", updated: "Usuário atualizado!", removed: "Usuário excluído!" });

const dialogOpen = ref(false);
const editing = ref<User | null>(null);
const form = reactive({
  email: "", password: "", full_name: "", role: "user" as "admin" | "user", is_active: true,
});

onMounted(fetchAll);

// Mais recentes primeiro.
const sorted = computed(() =>
  [...items.value].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
);

const columns = [
  { key: "email", label: "E-mail" },
  { key: "full_name", label: "Nome" },
  { key: "role", label: "Perfil" },
  { key: "is_active", label: "Status" },
  { key: "created_at", label: "Criado em" },
];

function openAdd() {
  editing.value = null;
  Object.assign(form, { email: "", password: "", full_name: "", role: "user", is_active: true });
  dialogOpen.value = true;
}
function openEdit(row: User) {
  editing.value = row;
  Object.assign(form, {
    email: row.email, password: "", full_name: row.full_name ?? "",
    role: row.role, is_active: row.is_active,
  });
  dialogOpen.value = true;
}
async function submit() {
  if (!editing.value && (!form.email || !form.password))
    return toast.error("Informe e-mail e senha");
  if (form.password && form.password.length < 6)
    return toast.error("A senha deve ter ao menos 6 caracteres");

  let ok: boolean;
  if (editing.value) {
    const payload: any = { full_name: form.full_name, role: form.role, is_active: form.is_active };
    if (form.password) payload.password = form.password;
    ok = await update(editing.value.id, payload);
  } else {
    ok = await create({ email: form.email, password: form.password, full_name: form.full_name, role: form.role, is_active: form.is_active });
  }
  if (ok) dialogOpen.value = false;
}
</script>

<template>
  <div class="w-full p-6 md:p-10">
    <PageHeader title="Usuários" subtitle="Gestão de acesso ao sistema" :icon="UsersIcon">
      <template #actions>
        <Button @click="openAdd"><Plus class="h-4 w-4" /> Novo Usuário</Button>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex justify-center py-20"><Spinner /></div>
    <DataTable v-else :columns="columns" :data="sorted" search-placeholder="Buscar por e-mail ou nome..." @edit="openEdit" @delete="remove">
      <template #cell-email="{ value }"><span class="font-medium">{{ value }}</span></template>
      <template #cell-full_name="{ value }">{{ value ?? "—" }}</template>
      <template #cell-role="{ value }">
        <Badge :tone="value === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground'">{{ value }}</Badge>
      </template>
      <template #cell-is_active="{ value }">
        <Badge :tone="value ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'">{{ value ? "Ativo" : "Inativo" }}</Badge>
      </template>
      <template #cell-created_at="{ value }">{{ formatDate(value) }}</template>
    </DataTable>

    <Modal :open="dialogOpen" :title="editing ? 'Editar Usuário' : 'Novo Usuário'" :saving="saving" @close="dialogOpen = false" @submit="submit">
      <div class="grid grid-cols-2 gap-3">
        <FormField label="E-mail" required class="col-span-2">
          <input v-model="form.email" type="email" class="ui-input" :disabled="!!editing" :class="editing && 'bg-muted/50'" />
        </FormField>
        <FormField :label="editing ? 'Nova senha (deixe em branco p/ manter)' : 'Senha'" :required="!editing" class="col-span-2">
          <input v-model="form.password" type="password" class="ui-input" autocomplete="new-password" />
        </FormField>
        <FormField label="Nome" class="col-span-2"><input v-model="form.full_name" class="ui-input" /></FormField>
        <FormField label="Perfil">
          <select v-model="form.role" class="ui-input"><option value="user">Usuário</option><option value="admin">Administrador</option></select>
        </FormField>
        <label class="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
          <span class="text-sm font-medium">Ativo</span>
          <input v-model="form.is_active" type="checkbox" class="h-5 w-5 accent-primary" />
        </label>
      </div>
    </Modal>
  </div>
</template>
