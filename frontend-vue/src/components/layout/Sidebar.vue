<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import {
  Home, Truck, Fuel, Wrench, DollarSign, BarChart2, FileText, Settings,
  Users, UserCircle, LogOut, Sun, Moon, SlidersHorizontal, X, ChevronRight,
} from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useTheme } from "@/composables/useTheme";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { isDark, toggle } = useTheme();

const nav = [
  { label: "Início", icon: Home, to: "/" },
  { label: "Veículos", icon: Truck, to: "/veiculos" },
  { label: "Abastecimentos", icon: Fuel, to: "/abastecimentos" },
  { label: "Manutenção", icon: Wrench, to: "/manutencao" },
  { label: "Custos Operacionais", icon: DollarSign, to: "/custos-operacionais" },
  { label: "Análises", icon: BarChart2, to: "/analises" },
  { label: "Relatório", icon: FileText, to: "/relatorio" },
];

// Itens que foram para o modal "Configurações" (Usuários só p/ admin).
const settingsItems = computed(() => {
  const items = [
    { label: "Parametrizações", icon: Settings, to: "/parametrizacoes", desc: "Categorias e tabelas de apoio" },
    { label: "Meu Perfil", icon: UserCircle, to: "/perfil", desc: "Dados da conta e senha" },
  ];
  if (auth.user?.role === "admin") {
    items.push({ label: "Usuários", icon: Users, to: "/usuarios", desc: "Gestão de acesso ao sistema" });
  }
  return items;
});

const menuOpen = ref(false);

function isActive(to: string) {
  return to === "/" ? route.path === "/" : route.path.startsWith(to);
}
function goTo(to: string) {
  menuOpen.value = false;
  router.push(to);
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
    <!-- Marca F8 -->
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
        <span v-if="isActive(item.to)" class="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
        <component :is="item.icon" class="h-5 w-5 shrink-0" />
        <span class="text-sm font-medium" :class="isActive(item.to) && 'font-semibold text-sidebar-foreground'">{{ item.label }}</span>
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

      <div class="mb-1 border-t border-sidebar-border px-3 pt-2 text-xs text-sidebar-foreground/60">
        <p class="truncate font-semibold text-sidebar-foreground/90">{{ auth.user?.full_name ?? auth.user?.email }}</p>
        <p class="text-[10px] uppercase tracking-widest">{{ auth.user?.role }}</p>
      </div>

      <!-- Botão que abre o modal de Configurações -->
      <button
        class="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-200"
        :class="
          settingsItems.some((i) => isActive(i.to))
            ? 'bg-sidebar-accent text-primary'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        "
        @click="menuOpen = true"
      >
        <SlidersHorizontal class="h-4 w-4" /> Configurações
      </button>

      <button
        class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors duration-200 hover:bg-destructive/20 hover:text-destructive"
        @click="logout"
      >
        <LogOut class="h-4 w-4" /> Sair
      </button>
    </div>
  </aside>

  <!-- Modal de Configurações -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="menuOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
        @click.self="menuOpen = false"
      >
        <div class="modal-panel w-full max-w-sm rounded-xl border bg-card text-card-foreground shadow-card-md">
          <div class="flex items-center justify-between border-b p-4">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary-hover">
                <SlidersHorizontal class="h-4 w-4" />
              </div>
              <h2 class="text-base font-bold text-foreground">Configurações</h2>
            </div>
            <button class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" @click="menuOpen = false">
              <X class="h-4 w-4" />
            </button>
          </div>
          <div class="space-y-1 p-3">
            <button
              v-for="item in settingsItems"
              :key="item.to"
              class="group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all duration-200 hover:border-primary/50 hover:bg-primary/[0.06]"
              :class="isActive(item.to) && 'border-primary/50 bg-primary/[0.06]'"
              @click="goTo(item.to)"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary-hover transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground"
              >
                <component :is="item.icon" class="h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-foreground">{{ item.label }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ item.desc }}</p>
              </div>
              <ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease-in-out; }
.modal-enter-active .modal-panel, .modal-leave-active .modal-panel { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-in-out; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-panel, .modal-leave-to .modal-panel { transform: scale(0.95) translateY(8px); opacity: 0; }
</style>
