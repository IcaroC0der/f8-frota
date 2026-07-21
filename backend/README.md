# Frota F8 — Backend (FastAPI + PostgreSQL)

Backend próprio que substitui o Base44, mantendo controle total da infraestrutura.
Stack: **FastAPI · SQLAlchemy 2.0 · Pydantic v2 · Alembic · PostgreSQL · JWT**.

## Decisões da migração

- **Chave primária**: nova `id` em **UUID**; o id original do Base44 fica preservado
  em `legacy_id` (só para conferência/rastreabilidade).
- **Relacionamentos híbridos**: FKs reais deduzidas dos dados **+** as colunas de
  texto denormalizadas mantidas (`plate`, `category_name`, etc.) para não quebrar o
  frontend. O elo real dos lançamentos é a **placa** (100% íntegra no export), não o
  `category_id` (que vinha 97% vazio).
- **FK opcional**: `MaintenanceRecord → MaintenanceCostType` é *best-effort* (~91% de
  match por variações de grafia); fica nula quando não há combinação exata, sem perder
  os campos de texto.
- **Auth**: JWT completo (`/auth/login`, `/auth/register`, rotas protegidas).

## Estrutura

```
backend/
  app/
    core/        config, database, security (JWT/bcrypt)
    models/      SQLAlchemy 2.0 (declarative) — 1 arquivo por entidade
    schemas/     Pydantic v2 (Create/Update/Response)
    crud/        CRUD genérico reutilizável
    api/
      deps.py    get_db, get_current_user, require_admin
      resolvers.py  traduz placa/nomes → FK
      routers/   1 APIRouter por entidade (CRUD REST)
      api.py     agrega os routers
    main.py      app FastAPI + CORS
  alembic/       migrations
  scripts/
    migrate_csv.py  importa os CSVs do Base44
    seed_admin.py   cria o admin inicial
```

## Passo a passo

```bash
# 1. Ambiente
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows PowerShell
pip install -r requirements.txt

# 2. Configuração
copy .env.example .env            # ajuste SECRET_KEY e senha do admin

# 3. Banco de dados — SEM Docker (PostgreSQL portátil, local, sem admin)
#    Baixa os binários oficiais, cria o cluster em %LOCALAPPDATA%\frota_f8_pg,
#    sobe o servidor e cria a role/banco. (Ver nota sobre o download abaixo.)
powershell -File scripts\pg\setup_local_pg.ps1
#    Para parar/iniciar depois: scripts\pg\stop_pg.ps1  |  scripts\pg\start_pg.ps1
#
#    Alternativa com Docker (se preferir): docker compose up -d

# 4. Criar as tabelas
alembic revision --autogenerate -m "schema inicial"
alembic upgrade head

# 5. Admin + importação dos dados do Base44
python -m scripts.seed_admin
python -m scripts.migrate_csv     # lê ../dados_export_csv

# 6. Rodar a API
uvicorn app.main:app --reload
```

### PostgreSQL portátil (sem Docker) — detalhes

- `scripts\pg\setup_local_pg.ps1` espera o zip dos binários em `.pglocal\pg.zip`.
  Baixe uma vez (≈300 MB, fonte oficial EnterpriseDB):
  ```powershell
  New-Item -ItemType Directory -Force .pglocal | Out-Null
  Invoke-WebRequest -Uri "https://get.enterprisedb.com/postgresql/postgresql-16.9-1-windows-x64-binaries.zip" -OutFile .pglocal\pg.zip
  ```
- **Importante**: o cluster é criado em `%LOCALAPPDATA%\frota_f8_pg` (caminho ASCII)
  porque o PostgreSQL no Windows **não** aceita caracteres acentuados no caminho
  (a pasta "Laboratório" quebra o `initdb`).
- Auth `trust` apenas em `localhost` — adequado para desenvolvimento local.

- Documentação interativa: <http://localhost:8000/docs>
- Health check: <http://localhost:8000/health>
- Prefixo das rotas: `/api/v1`

## Notas

- O importador é **idempotente** (usa `legacy_id`): rodar de novo não duplica.
- Se não usar Docker, basta um PostgreSQL acessível e ajustar `DATABASE_URL` no `.env`.
- Endpoints de escrita exigem login; `DELETE` e `/users` exigem papel **admin**.
