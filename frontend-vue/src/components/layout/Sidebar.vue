<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import {
  Home, Truck, Fuel, Wrench, DollarSign, BarChart2, FileText, Settings,
  Users, UserCircle, LogOut, Sun, Moon,
} from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useTheme } from "@/composables/useTheme";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { isDark, toggle } = useTheme();

const nav = computed(() => {
  const items = [
    { label: "Início", icon: Home, to: "/" },
    { label: "Veículos", icon: Truck, to: "/veiculos" },
    { label: "Abastecimentos", icon: Fuel, to: "/abastecimentos" },
    { label: "Manutenção", icon: Wrench, to: "/manutencao" },
    { label: "Custos Operacionais", icon: DollarSign, to: "/custos-operacionais" },
    { label: "Análises", icon: BarChart2, to: "/analises" },
    { label: "Relatório", icon: FileText, to: "/relatorio" },
    { label: "Parametrizações", icon: Settings, to: "/parametrizacoes" },
    { label: "Meu Perfil", icon: UserCircle, to: "/perfil" },
  ];
  if (auth.user?.role === "admin") {
    items.push({ label: "Usuários", icon: Users, to: "/usuarios" });
  }
  return items;
});

function isActive(to: string) {
  return to === "/" ? route.path === "/" : route.path.startsWith(to);
}

function logout() {
  auth.logout();
  router.push({ name: "login" });
}
</script>

<template>
  <aside
    class="sticky top-0 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
  >
    <!-- Marca F8: caixa amarela + caminhão preto -->
    <div class="flex items-center gap-3 border-b border-sidebar-border p-4">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow">
        <Truck class="h-5 w-5 text-primary-foreground" />
      </div>
      <div>
        <h1 class="text-sm font-extrabold tracking-wide">FROTA F8</h1>
        <p class="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">Gestão de Frota</p>
      </div>
    </div>

    <nav class="scrollbar-brand flex-1 space-y-1 overflow-y-auto p-3">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200"
        :class="
          isActive(item.to)
            ? 'bg-sidebar-accent text-primary'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
        "
      >
        <span
          v-if="isActive(item.to)"
          class="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
        />
        <component :is="item.icon" class="h-5 w-5 shrink-0" />
        <span
          class="text-sm font-medium"
          :class="isActive(item.to) && 'font-semibold text-sidebar-foreground'"
          >{{ item.label }}</span
        >
      </RouterLink>
    </nav>

    <div class="border-t border-sidebar-border p-3">
      <button
        class="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        @click="toggle"
      >
        <Sun v-if="isDark" class="h-4 w-4 text-primary" />
        <Moon v-else class="h-4 w-4" />
        {{ isDark ? "Modo claro" : "Modo escuro" }}
      </button>

      <div class="mb-1 border-t border-sidebar-border pt-2 px-3 text-xs text-sidebar-foreground/60">
        <p class="truncate font-semibold text-sidebar-foreground/90">
          {{ auth.user?.full_name ?? auth.user?.email }}
        </p>
        <p class="uppercase tracking-widest text-[10px]">{{ auth.user?.role }}</p>
      </div>
      <button
        class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors duration-200 hover:bg-destructive/20 hover:text-destructive"
        @click="logout"
      >
        <LogOut class="h-4 w-4" /> Sair
      </button>
    </div>
  </aside>
</template>
