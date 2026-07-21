<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Truck } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { useAuthStore } from "@/stores/auth";
import { apiErrorMessage } from "@/composables/useResource";
import Button from "@/components/ui/Button.vue";
import Spinner from "@/components/ui/Spinner.vue";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const loading = ref(false);

async function submit() {
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    const redirect = (route.query.redirect as string) || "/";
    router.push(redirect);
  } catch (e) {
    toast.error(apiErrorMessage(e, "Falha no login"));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] p-4">
    <!-- Brilho amarelo de fundo -->
    <div
      class="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
    />
    <div
      class="pointer-events-none absolute -bottom-52 right-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
    />

    <div class="a-in relative w-full max-w-sm rounded-xl border border-white/10 bg-card p-8 shadow-card-md">
      <div class="mb-8 flex flex-col items-center gap-4 text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-glow">
          <Truck class="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 class="text-xl font-extrabold tracking-wide text-foreground">FROTA F8</h1>
          <p class="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            Sistema de Gestão de Frota
          </p>
        </div>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <label class="block">
          <span class="text-sm font-medium text-foreground">E-mail</span>
          <input v-model="email" type="email" required class="ui-input mt-1.5" placeholder="voce@empresa.com" />
        </label>
        <label class="block">
          <span class="text-sm font-medium text-foreground">Senha</span>
          <input v-model="password" type="password" required class="ui-input mt-1.5" placeholder="••••••••" />
        </label>
        <Button type="submit" :disabled="loading" class="w-full">
          <Spinner v-if="loading" :size="4" />
          Entrar
        </Button>
      </form>
    </div>
  </div>
</template>
