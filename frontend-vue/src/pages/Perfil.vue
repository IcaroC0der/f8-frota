<script setup lang="ts">
import { reactive, ref } from "vue";
import { UserCircle } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { auth } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { apiErrorMessage } from "@/composables/useResource";
import PageHeader from "@/components/ui/PageHeader.vue";
import Card from "@/components/ui/Card.vue";
import Button from "@/components/ui/Button.vue";
import Badge from "@/components/ui/Badge.vue";
import FormField from "@/components/ui/FormField.vue";
import Spinner from "@/components/ui/Spinner.vue";

const store = useAuthStore();
const saving = ref(false);
const form = reactive({ current: "", next: "", confirm: "" });

async function submit() {
  if (form.next.length < 6) return toast.error("A nova senha deve ter ao menos 6 caracteres");
  if (form.next !== form.confirm) return toast.error("A confirmação não confere");
  saving.value = true;
  try {
    await auth.changePassword(form.current, form.next);
    toast.success("Senha alterada com sucesso!");
    form.current = form.next = form.confirm = "";
  } catch (e) {
    toast.error(apiErrorMessage(e, "Não foi possível alterar a senha"));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl p-6 md:p-10">
    <PageHeader title="Meu Perfil" subtitle="Dados da conta e segurança" :icon="UserCircle" />

    <Card padded highlight class="a-in mb-6" style="animation-delay: 0.08s">
      <h3 class="card-title mb-3">Conta</h3>
      <div class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div><span class="text-muted-foreground">Nome</span><p class="font-medium">{{ store.user?.full_name ?? "—" }}</p></div>
        <div><span class="text-muted-foreground">E-mail</span><p class="font-medium">{{ store.user?.email }}</p></div>
        <div><span class="text-muted-foreground">Perfil</span>
          <p><Badge :tone="store.user?.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground'">{{ store.user?.role }}</Badge></p>
        </div>
      </div>
    </Card>

    <Card padded class="a-in" style="animation-delay: 0.15s">
      <h3 class="card-title mb-4">Alterar Senha</h3>
      <form class="space-y-3" @submit.prevent="submit">
        <FormField label="Senha atual" required><input v-model="form.current" type="password" class="ui-input" autocomplete="current-password" /></FormField>
        <FormField label="Nova senha" required><input v-model="form.next" type="password" class="ui-input" autocomplete="new-password" /></FormField>
        <FormField label="Confirmar nova senha" required><input v-model="form.confirm" type="password" class="ui-input" autocomplete="new-password" /></FormField>
        <div class="pt-2">
          <Button type="submit" :disabled="saving">
            <Spinner v-if="saving" :size="4" /> Salvar nova senha
          </Button>
        </div>
      </form>
    </Card>
  </div>
</template>
