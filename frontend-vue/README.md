# Frota F8 — Frontend (Vue 3)

Migração do frontend React para **Vue 3 + Vite + TypeScript**, consumindo o backend
FastAPI próprio (substituindo o Base44).

Stack: **Vue 3 (`<script setup>`) · Vite · TypeScript · Vue Router · Pinia · Tailwind ·
Axios · vue-sonner · lucide-vue-next**.

## Rodar

```bash
cd frontend-vue
npm install
copy .env.example .env     # ajuste VITE_API_URL se necessário
npm run dev                # http://localhost:5173
```

O backend precisa estar rodando (`uvicorn app.main:app --reload`, porta 8000).
Faça login com o admin criado por `scripts/seed_admin.py`.

## Estrutura

```
src/
  services/api.ts       Cliente Axios tipado (JWT via interceptor) — a "ponte" com a API
  stores/auth.ts        Pinia: login/logout, usuário atual
  router/index.ts       Rotas + guarda de autenticação
  composables/
    useResource.ts      CRUD reativo genérico (list/create/update/remove + toasts)
  components/
    ui/                 Button, Card, Badge, Modal, DataTable, PageHeader, StatCard...
    layout/             AppLayout + Sidebar
  pages/
    Login.vue           Autenticação JWT
    Home.vue            Dashboard com contagens/totais reais
    Veiculos.vue        CRUD completo (padrão de referência)
    Abastecimentos.vue  CRUD completo (resolve FK por placa + tipo de custo)
    config/Categorias.vue   CRUD de categorias
    Manutencao.vue / CustosOperacionais.vue   Listagens com dados reais
    Analises.vue / Relatorio.vue              Placeholders (próxima etapa)
```

## Estado da migração

| Tela | Status |
|------|--------|
| Login / Layout / Sidebar / Auth JWT | ✅ completo |
| Início (dashboard) | ✅ com dados reais |
| Veículos | ✅ CRUD completo |
| Categorias (parametrização) | ✅ CRUD completo |
| Abastecimentos | ✅ CRUD completo |
| Manutenção | ✅ CRUD completo (selects em cascata) |
| Custos Operacionais | ✅ CRUD completo |
| Análises | ✅ gráficos Chart.js (custo por módulo, evolução, top veículos) |
| Relatório | ✅ filtros + exportação PDF (jsPDF) e Excel (xlsx) |
| Usuários (admin) | ✅ CRUD de logins (criar/editar/ativar/senha) |
| Meu Perfil | ✅ troca da própria senha |

Todas as telas do sistema original foram migradas. Pendências menores: upload de
anexos (hoje campo de URL) e telas de parametrização dos demais lookups.
