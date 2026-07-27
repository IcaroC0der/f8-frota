import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { auth } from "@/services/api";

const routes: RouteRecordRaw[] = [
  { path: "/login", name: "login", component: () => import("@/pages/Login.vue"), meta: { public: true } },
  {
    path: "/",
    component: () => import("@/components/layout/AppLayout.vue"),
    children: [
      { path: "", name: "home", component: () => import("@/pages/Home.vue") },
      { path: "veiculos", name: "veiculos", component: () => import("@/pages/Veiculos.vue") },
      { path: "abastecimentos", name: "abastecimentos", component: () => import("@/pages/Abastecimentos.vue") },
      { path: "manutencao", name: "manutencao", component: () => import("@/pages/Manutencao.vue") },
      { path: "custos-operacionais", name: "custos", component: () => import("@/pages/CustosOperacionais.vue") },
      { path: "analises", name: "analises", component: () => import("@/pages/Analises.vue") },
      { path: "relatorio", name: "relatorio", component: () => import("@/pages/Relatorio.vue") },
      { path: "parametrizacoes", name: "parametrizacoes", component: () => import("@/pages/Parametrizacoes.vue") },
      { path: "parametrizacoes/categorias", name: "categorias", component: () => import("@/pages/config/Categorias.vue") },
      { path: "parametrizacoes/abastecimentos", name: "config-abastecimentos", component: () => import("@/pages/config/Combustiveis.vue") },
      { path: "parametrizacoes/manutencao", name: "config-manutencao", component: () => import("@/pages/config/Manutencao.vue") },
      { path: "parametrizacoes/operacionais", name: "config-operacionais", component: () => import("@/pages/config/CustosOperacionais.vue") },
      { path: "usuarios", name: "usuarios", component: () => import("@/pages/Usuarios.vue") },
      { path: "perfil", name: "perfil", component: () => import("@/pages/Perfil.vue") },
    ],
  },
  { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("@/pages/NotFound.vue") },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (!to.meta.public && !auth.isAuthenticated()) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (to.name === "login" && auth.isAuthenticated()) {
    return { name: "home" };
  }
});

export default router;
