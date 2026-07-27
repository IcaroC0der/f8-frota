# Deploy da Frota F8 — Neon + Render + Vercel (grátis)

Guia para colocar a aplicação no ar **com os usuários e dados idênticos ao local**.
A stack é dividida em três serviços gratuitos, cada um bom no que faz:

```
┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│  Vercel            │     │  Render            │     │  Neon              │
│  Frontend (Vue)    │ ──▶ │  Backend (FastAPI) │ ──▶ │  PostgreSQL 16     │
│  estático + HTTPS  │ API │  uvicorn + Alembic │     │  banco gerenciado  │
└────────────────────┘     └────────────────────┘     └────────────────────┘
```

Os **usuários e todos os lançamentos** moram no PostgreSQL. O que garante o "igual ao
local" é **dumpar o banco local e restaurar no Neon** — os logins (com o hash bcrypt),
os 59 veículos, 1288 abastecimentos e 381 manutenções vão junto. Nada é recriado à mão.

> **Ordem importa** para não haver conflito de schema: crie o Neon → **restaure o dump**
> → só então faça o deploy do backend (a migração no start vira _no-op_ porque o dump já
> traz o schema no head do Alembic).

---

## Pré-requisitos

- Repositório no GitHub já conectado (`github.com/IcaroC0der/f8-frota`).
- Postgres local rodando (`backend/scripts/pg/start_pg.ps1`) para o dump.
- Contas grátis: [neon.tech](https://neon.tech), [render.com](https://render.com),
  [vercel.com](https://vercel.com) (dá para logar com o próprio GitHub nas três).

---

## Passo 1 — Banco no Neon

1. Em [neon.tech](https://neon.tech) → **New Project** (região mais próxima, ex. AWS
   São Paulo / US-East). O Postgres já vem na versão 16+.
2. Copie a **connection string** (Dashboard → *Connect*). Ela tem o formato:
   ```
   postgresql://<user>:<senha>@<host>.neon.tech/<db>?sslmode=require
   ```
   Guarde — será a `DATABASE_URL` do Render e o destino do restore.

---

## Passo 2 — Migrar seus dados locais para o Neon

Rode no **PowerShell**, na máquina onde está o banco local. Usa os binários do Postgres
portátil (`%LOCALAPPDATA%\frota_f8_pg\pgsql\bin`).

```powershell
# 1) Caminho dos binários do Postgres portátil
$pgbin = Join-Path $env:LOCALAPPDATA "frota_f8_pg\pgsql\bin"

# 2) Dump COMPLETO do banco local (schema + dados + usuários + versão do Alembic)
$env:PGPASSWORD = "frota"
& "$pgbin\pg_dump.exe" -h localhost -p 5432 -U frota -d frota_f8 -Fc -f "$env:USERPROFILE\frota_f8.dump"

# 3) Restaura no Neon (troque a URL pela sua connection string do Passo 1)
& "$pgbin\pg_restore.exe" --no-owner --no-privileges `
    -d "postgresql://<user>:<senha>@<host>.neon.tech/<db>?sslmode=require" `
    "$env:USERPROFILE\frota_f8.dump"
```

- `--no-owner --no-privileges`: os objetos passam a pertencer ao seu usuário do Neon
  (o dono `frota` não existe lá) — evita erros de permissão.
- Alguns *warnings* de `role`/`GRANT` no fim são normais e podem ser ignorados.

**Conferir que foi:** no Neon → *SQL Editor* → `SELECT count(*) FROM vehicles;`
(deve dar 59) e `SELECT email FROM users;` (seus logins).

---

## Passo 3 — Backend no Render

1. [render.com](https://render.com) → **New** → **Blueprint** → selecione o repositório.
   O Render lê o `render.yaml` da raiz e propõe o serviço `frota-f8-backend`.
2. Em **Environment**, preencha as variáveis marcadas como *sync: false*:
   - `DATABASE_URL` → a connection string do Neon (o backend normaliza o formato
     `postgresql://` → `postgresql+psycopg://` sozinho; pode colar crua).
   - `BACKEND_CORS_ORIGINS` → deixe `http://localhost:5173` por enquanto (ajustamos no
     Passo 5 com a URL da Vercel).
   - `FIRST_ADMIN_*` → só necessárias se você optar por semear admin do zero (ver
     "Alternativa" no fim). Como vamos restaurar o dump, pode deixar em branco.
   - `SECRET_KEY` já é gerada automaticamente pelo Render.
3. **Create** → aguarde o build. O start roda `alembic upgrade head` (no-op, o schema já
   veio do dump) e sobe o uvicorn.
4. Anote a URL pública, algo como `https://frota-f8-backend.onrender.com`.
   Teste: abrir `https://frota-f8-backend.onrender.com/health` → `{"status":"ok"}`.

---

## Passo 4 — Frontend na Vercel

1. [vercel.com](https://vercel.com) → **Add New… → Project** → importe o repositório.
2. **Root Directory**: selecione **`frontend-vue`** (importante — o app Vue está nessa
   subpasta). O Vercel detecta o Vite automaticamente e usa o `vercel.json`.
3. Em **Environment Variables**, adicione:
   - `VITE_API_URL` = `https://frota-f8-backend.onrender.com/api/v1`
     (a URL do backend do Passo 3 **+ `/api/v1`**).
4. **Deploy**. Ao terminar, anote a URL, ex.: `https://frota-f8.vercel.app`.

> `VITE_API_URL` é lida **no build**. Se mudar depois, é preciso *Redeploy* na Vercel.

---

## Passo 5 — Ligar o CORS (backend ↔ frontend)

O backend só aceita origens listadas. Volte ao **Render** → serviço → **Environment**:

- `BACKEND_CORS_ORIGINS` = `https://frota-f8.vercel.app`
  (a URL exata da Vercel, **sem** barra no final; separe várias por vírgula).

Salve — o Render reinicia o serviço sozinho.

---

## Passo 6 — Testar

1. Abra `https://frota-f8.vercel.app`.
2. Faça login com um usuário que veio do dump (ex.: `tecnologia8@grupof8.com.br`).
3. Confira Veículos/Abastecimentos com os dados reais.

Pronto — app no ar, com usuários e dados idênticos ao local.

---

## Gotchas e operação

- **Cold start (plano grátis):** o Web Service do Render **dorme após ~15 min** sem uso;
  a 1ª requisição depois leva ~30–50s para "acordar". O Nero/Neon também suspende e
  religa em segundos. Para ferramenta interna costuma ser aceitável. Se incomodar, o
  plano pago do Render (~US$ 7/mês) elimina o sono.
- **Atualizar depois:** dê `git push` na branch `main` → Render e Vercel **redeployam
  automaticamente**. (Migrações novas rodam no start via `alembic upgrade head`.)
- **Segredos:** o `.env` local **não** vai para o Git; em produção tudo é variável de
  ambiente no Render (o `render.yaml` marca os sensíveis como `sync: false`).
- **Trocar Neon por Supabase:** o Supabase também dá um Postgres grátis — basta usar a
  connection string dele na `DATABASE_URL`. O resto é idêntico.

### Alternativa: começar com banco vazio (sem o dump)

Se algum dia quiser subir do zero em vez de restaurar o dump:

1. No Render, preencha `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` / `FIRST_ADMIN_NAME`.
2. O start já cria o schema (`alembic upgrade head`).
3. No **Render → Shell**, rode:
   ```bash
   python -m scripts.seed_admin           # cria o admin inicial
   python -m scripts.migrate_csv          # importa os CSVs de dados_export_csv/ (opcional)
   ```

> Esse caminho **não** reproduz os usuários/senhas atuais — use o dump (Passo 2) para
> ficar idêntico ao local.
