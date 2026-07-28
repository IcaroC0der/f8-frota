/**
 * Serviço de API do Frota F8 — ponte entre o frontend Vue e o backend FastAPI.
 *
 * Configuração:
 *   Defina VITE_API_URL no .env do Vue (ex.: VITE_API_URL=http://localhost:8000/api/v1).
 *
 * Uso:
 *   import { auth, vehicles, fuelRecords } from "@/services/api";
 *   await auth.login(email, senha);
 *   const lista = await vehicles.list();
 *   await fuelRecords.create({ date: "2026-07-01", plate: "ABC1D23", ... });
 */
import axios, { type AxiosInstance } from "axios";

const BASE_URL =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000/api/v1";

const TOKEN_KEY = "frota_f8_token";

export const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Injeta o Bearer token em toda requisição.
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Em 401, limpa o token (o app pode redirecionar para o login).
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(error);
  },
);

// ─────────────────────────────── Tipos ───────────────────────────────
export interface Base44Fields {
  id: string;
  legacy_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleCategory extends Base44Fields {
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Vehicle extends Base44Fields {
  plate: string;
  category_id: string;
  category_name: string;
  vehicle_model: string | null;
  chassis: string | null;
  renavan: string | null;
  year: string | null;
  company: string | null;
  driver: string | null;
  tracker: boolean;
  is_active: boolean;
}

export interface FuelCostType extends Base44Fields {
  cost_name: string;
  cost_type: string;
  is_active: boolean;
}

export interface FuelRecord extends Base44Fields {
  date: string;
  vehicle_id: string;
  fuel_cost_type_id: string;
  plate: string;
  vehicle_model: string | null;
  category_name: string | null;
  cost_name: string;
  cost_type: string;
  unit: "LT" | "UN";
  km: number | null;
  quantity: number;
  total_value: number;
  supplier: string | null;
  invoice_number: string | null;
  observation: string | null;
}

export interface MaintenanceClassification extends Base44Fields {
  name: string;
  is_active: boolean;
}

export interface MaintenanceCostType extends Base44Fields {
  classification: string;
  cost_group: string;
  cost_type: string;
  is_active: boolean;
}

export interface MaintenanceRecord extends Base44Fields {
  date: string;
  vehicle_id: string;
  classification_id: string;
  maintenance_cost_type_id: string | null;
  plate: string;
  vehicle_model: string | null;
  category_name: string | null;
  classification: string;
  cost_group: string;
  cost_type: string;
  km: number | null;
  total_value: number;
  supplier: string | null;
  invoice_number: string | null;
  attachment_url: string | null;
  observation: string | null;
}

export interface OperationalCost extends Base44Fields {
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface OperationalCostRecord extends Base44Fields {
  date: string;
  operational_cost_id: string;
  vehicle_id: string | null;
  cost_name: string;
  plate: string | null;
  vehicle_model: string | null;
  category_name: string | null;
  km: number | null;
  total_value: number;
  supplier: string | null;
  invoice_number: string | null;
  attachment_url: string | null;
  observation: string | null;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

/** Payload de criação/edição = a entidade sem os campos gerenciados pelo servidor. */
export type Payload<T> = Partial<Omit<T, keyof Base44Fields>>;
export type ListParams = { skip?: number; limit?: number };

// ─────────────────────── CRUD genérico por recurso ───────────────────
function createResource<T>(path: string) {
  return {
    list: (params: ListParams = {}) =>
      http.get<T[]>(path, { params }).then((r) => r.data),
    get: (id: string) => http.get<T>(`${path}/${id}`).then((r) => r.data),
    create: (payload: Payload<T>) =>
      http.post<T>(path, payload).then((r) => r.data),
    update: (id: string, payload: Payload<T>) =>
      http.put<T>(`${path}/${id}`, payload).then((r) => r.data),
    remove: (id: string) => http.delete(`${path}/${id}`).then(() => undefined),
  };
}

// ───────────────────────────── Autenticação ──────────────────────────
export const auth = {
  async login(email: string, password: string): Promise<Token> {
    const { data } = await http.post<Token>("/auth/login/json", { email, password });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    return data;
  },
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },
  register: (payload: { email: string; password: string; full_name?: string }) =>
    http.post<User>("/auth/register", payload).then((r) => r.data),
  me: () => http.get<User>("/auth/me").then((r) => r.data),
  changePassword: (current_password: string, new_password: string) =>
    http
      .post("/auth/change-password", { current_password, new_password })
      .then((r) => r.data),
};

// ───────────────────────────── Recursos ──────────────────────────────
export const vehicleCategories = createResource<VehicleCategory>("/vehicle-categories");
export const vehicles = createResource<Vehicle>("/vehicles");
export const fuelCostTypes = createResource<FuelCostType>("/fuel-cost-types");
export const fuelRecords = createResource<FuelRecord>("/fuel-records");

export interface FuelBulkResult {
  created: number;
  skipped: number;
  errors: { index: number; plate?: string; reason: string }[];
}
/** Importação em massa de abastecimentos (planilha/PDF → /fuel-records/bulk). */
export const importFuelRecords = (records: any[]) =>
  http.post<FuelBulkResult>("/fuel-records/bulk", { records }).then((r) => r.data);
export const maintenanceClassifications = createResource<MaintenanceClassification>(
  "/maintenance-classifications",
);
export const maintenanceCostTypes = createResource<MaintenanceCostType>(
  "/maintenance-cost-types",
);
export const maintenanceRecords = createResource<MaintenanceRecord>("/maintenance-records");
export const operationalCosts = createResource<OperationalCost>("/operational-costs");
export const operationalCostRecords = createResource<OperationalCostRecord>(
  "/operational-cost-records",
);
export const users = createResource<User>("/users");

// ─────────── Atalhos nomeados (estilo pedido: getVehicles, etc.) ──────
export const getVehicles = vehicles.list;
export const getVehicle = vehicles.get;
export const createVehicle = vehicles.create;
export const updateVehicle = vehicles.update;
export const deleteVehicle = vehicles.remove;

export const getFuelRecords = fuelRecords.list;
export const createFuelRecord = fuelRecords.create;
export const updateFuelRecord = fuelRecords.update;
export const deleteFuelRecord = fuelRecords.remove;

export const getMaintenanceRecords = maintenanceRecords.list;
export const createMaintenanceRecord = maintenanceRecords.create;

export const getOperationalCostRecords = operationalCostRecords.list;
export const createOperationalCostRecord = operationalCostRecords.create;

export default {
  http,
  auth,
  vehicleCategories,
  vehicles,
  fuelCostTypes,
  fuelRecords,
  maintenanceClassifications,
  maintenanceCostTypes,
  maintenanceRecords,
  operationalCosts,
  operationalCostRecords,
  users,
};
