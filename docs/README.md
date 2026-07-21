# Documentação — Frota F8

Sistema de gestão de frota migrado do **Base44 (low-code/BaaS)** para uma stack própria
**PostgreSQL + FastAPI + Vue 3**.

## Índice

| Documento | Conteúdo | Público |
|-----------|----------|---------|
| **[ARQUITETURA.md](ARQUITETURA.md)** | Explicação funcional e arquitetural completa: stack, camadas, modelo de dados, decisões, auth, importador, frontend, infraestrutura e roadmap (com diagramas). | Técnico |
| **[API.md](API.md)** | Referência dos endpoints REST, payloads e exemplos. | Técnico |
| **[Frota-F8-Migracao-Executivo.docx](Frota-F8-Migracao-Executivo.docx)** | Documento executivo (visão funcional, benefícios, status, riscos) para apresentar a decisores. | Stakeholders |
| [../backend/README.md](../backend/README.md) | Como rodar o backend (inclui PostgreSQL portátil, sem Docker). | Técnico |
| [../frontend-vue/README.md](../frontend-vue/README.md) | Como rodar o frontend Vue e o estado da migração das telas. | Técnico |

## Mapa do repositório

```
FROTA-F8/
  base44/entities/     JSON Schema original das entidades (fonte da migração)
  dados_export_csv/    CSVs exportados do Base44 (dados a importar)
  src/                 Frontend React ORIGINAL (referência da migração)
  backend/             ★ API FastAPI + SQLAlchemy + Alembic + importador
  frontend-vue/        ★ Novo frontend Vue 3 (consome a API)
  docs/                ★ Esta documentação
```

## TL;DR — subir tudo

```powershell
# Banco (PostgreSQL portátil, sem Docker) — 1ª vez usa setup_local_pg.ps1
backend\scripts\pg\start_pg.ps1
# Backend (venv ativa, em backend/)
uvicorn app.main:app --reload            # http://localhost:8000/docs
# Frontend (em frontend-vue/)
npm run dev                              # http://localhost:5173
```

Login inicial: definido em `backend/.env` (`FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD`).

## Princípios da migração (resumo)

1. **PK UUID nova + `legacy_id`** guardando o id do Base44 para conferência.
2. **Relacionamento híbrido**: FKs reais deduzidas dos dados **+** colunas de texto
   denormalizadas mantidas (o elo real é a **placa**, não o `category_id` — que vinha
   97% vazio).
3. **Importador idempotente** que religa as FKs por placa/nome e preserva timestamps.
4. **JWT próprio** (bcrypt), com papéis `admin`/`user`.
