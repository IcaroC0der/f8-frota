import { ref } from "vue";
import { toast } from "vue-sonner";

/** Extrai a mensagem `detail` de um erro do FastAPI. */
export function apiErrorMessage(e: any, fallback = "Ocorreu um erro"): string {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return fallback;
}

interface Resource<T> {
  list: (params?: any) => Promise<T[]>;
  create: (payload: any) => Promise<T>;
  update: (id: string, payload: any) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

interface Labels {
  created?: string;
  updated?: string;
  removed?: string;
}

/**
 * Envolve um recurso da API (list/create/update/remove) com estado reativo,
 * toasts e recarga automática. Mantém as páginas enxutas.
 */
export function useResource<T extends { id: string }>(
  resource: Resource<T>,
  labels: Labels = {},
) {
  const items = ref<T[]>([]) as { value: T[] };
  const loading = ref(false);
  const saving = ref(false);

  // Limite alto p/ carregar a base inteira (ex.: 1288 abastecimentos > 1000).
  async function fetchAll(params: any = { limit: 10000 }) {
    loading.value = true;
    try {
      items.value = await resource.list(params);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Erro ao carregar dados"));
    } finally {
      loading.value = false;
    }
  }

  async function create(payload: any): Promise<boolean> {
    saving.value = true;
    try {
      await resource.create(payload);
      toast.success(labels.created ?? "Registro criado!");
      await fetchAll();
      return true;
    } catch (e) {
      toast.error(apiErrorMessage(e));
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function update(id: string, payload: any): Promise<boolean> {
    saving.value = true;
    try {
      await resource.update(id, payload);
      toast.success(labels.updated ?? "Registro atualizado!");
      await fetchAll();
      return true;
    } catch (e) {
      toast.error(apiErrorMessage(e));
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function remove(id: string): Promise<void> {
    try {
      await resource.remove(id);
      toast.success(labels.removed ?? "Registro excluído!");
      await fetchAll();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  return { items, loading, saving, fetchAll, create, update, remove };
}
