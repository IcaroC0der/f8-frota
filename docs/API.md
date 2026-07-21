# Referência da API — Frota F8

- **Base URL**: `http://localhost:8000/api/v1`
- **Documentação interativa**: `http://localhost:8000/docs` (Swagger) · `/redoc`
- **Autenticação**: JWT Bearer em todas as rotas (exceto `/auth/*` de login/registro).
  Envie `Authorization: Bearer <token>`.
- **Convenção REST** (igual para toda entidade): `GET /` lista, `POST /` cria (201),
  `GET /{id}` detalha, `PUT /{id}` atualiza, `DELETE /{id}` remove (204, **admin**).
  Listas aceitam `?skip=0&limit=100`.

## Campos comuns nas respostas (entidades de domínio)

Toda resposta de entidade migrada inclui, além dos campos próprios:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária nova |
| `legacy_id` | string \| null | ID original do Base44 (conferência) |
| `created_by` | string \| null | E-mail de quem criou (auditoria) |
| `created_at` / `updated_at` | datetime | Gerenciados pelo servidor |

---

## Autenticação — `/auth`

| Método | Rota | Corpo | Retorno |
|--------|------|-------|---------|
| POST | `/auth/login` | form `username`(=e-mail), `password` | `{ access_token, token_type }` |
| POST | `/auth/login/json` | `{ email, password }` | `{ access_token, token_type }` |
| POST | `/auth/register` | `{ email, password, full_name? }` | `UserResponse` (role sempre `user`) |
| GET | `/auth/me` | — | `UserResponse` |
| POST | `/auth/change-password` | `{ current_password, new_password }` | `{ status: "ok" }` — troca a própria senha (400 se a atual estiver errada) |

```bash
# Login (JSON, usado pelo Vue)
curl -X POST http://localhost:8000/api/v1/auth/login/json \
  -H "Content-Type: application/json" \
  -d '{"email":"grupof8.ely2026@gmail.com","password":"Frota@2026"}'
# → { "access_token": "eyJ...", "token_type": "bearer" }

# Usar o token
curl http://localhost:8000/api/v1/vehicles \
  -H "Authorization: Bearer eyJ..."
```

## Usuários — `/users` (somente admin)

CRUD padrão. `POST`/`PUT` aceitam `email`, `password`, `full_name`, `role`
(`admin`|`user`), `is_active`. A resposta **nunca** inclui a senha.

---

## Recursos de domínio

Payloads de **criação** (campos obrigatórios em **negrito**; a resposta acrescenta os
campos comuns acima). Nos lançamentos, as FKs são **resolvidas automaticamente** pelos
campos denormalizados — não é preciso enviar os `*_id`.

### `/vehicle-categories`
`{ `**`name`**`, description?, is_active=true }`

### `/vehicles`
`{ `**`plate`**`, `**`category_name`**`, category_id?, vehicle_model?, chassis?, renavan?, year?, company?, driver?, tracker=false, is_active=true }`
→ resolve `category_id` pela `category_name` (ou usa o `category_id` enviado).

### `/fuel-cost-types`
`{ `**`cost_name`**`, `**`cost_type`**`, is_active=true }`

### `/fuel-records`
`{ `**`date`**`, `**`plate`**`, `**`cost_name`**`, `**`cost_type`**`, `**`quantity`**`, `**`total_value`**`, unit="LT", km?, vehicle_model?, category_name?, supplier?, invoice_number?, observation? }`
→ resolve `vehicle_id` (placa) e `fuel_cost_type_id` (`cost_type`+`cost_name`).

### `/maintenance-classifications`
`{ `**`name`**`, is_active=true }`

### `/maintenance-cost-types`
`{ `**`classification`**`, `**`cost_group`**`, `**`cost_type`**`, is_active=true }`

### `/maintenance-records`
`{ `**`date`**`, `**`plate`**`, `**`classification`**`, `**`cost_group`**`, `**`cost_type`**`, `**`total_value`**`, km?, supplier?, invoice_number?, attachment_url?, vehicle_model?, category_name?, observation? }`
→ resolve `vehicle_id` (placa), `classification_id` (nome) e, **best-effort**,
`maintenance_cost_type_id` (combinação classificação+grupo+tipo; fica nulo se não casar).

### `/operational-costs`
`{ `**`name`**`, description?, is_active=true }`

### `/operational-cost-records`
`{ `**`date`**`, `**`cost_name`**`, `**`total_value`**`, plate?, km?, supplier?, invoice_number?, attachment_url?, vehicle_model?, category_name?, observation? }`
→ resolve `operational_cost_id` (`cost_name`) e `vehicle_id` (placa, **opcional**).

---

## Códigos de status

| Código | Quando |
|--------|--------|
| `200` | GET/PUT com sucesso |
| `201` | POST criou o recurso |
| `204` | DELETE com sucesso (sem corpo) |
| `401` | Sem token / token inválido |
| `403` | Sem privilégio (ex.: DELETE sem ser admin) |
| `404` | Recurso ou FK (placa/tipo) não encontrado |
| `409` | Conflito (ex.: e-mail já cadastrado) |
| `422` | Validação do corpo falhou (Pydantic) |

## Exemplo — criar abastecimento (FK automática)

```bash
curl -X POST http://localhost:8000/api/v1/fuel-records \
  -H "Authorization: Bearer eyJ..." -H "Content-Type: application/json" \
  -d '{
    "date": "2026-07-15",
    "plate": "ERG1E95",
    "cost_name": "COMBUSTÍVEIS",
    "cost_type": "DIESEL (P)",
    "quantity": 100.5,
    "total_value": 750.25
  }'
# → 201; a resposta traz vehicle_id e fuel_cost_type_id já resolvidos.
```
