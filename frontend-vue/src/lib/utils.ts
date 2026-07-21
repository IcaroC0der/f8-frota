/** Concatena classes condicionalmente (equivalente simples ao `cn` do shadcn). */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Formata número como moeda BRL. */
export function formatBRL(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return (n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Formata data ISO (YYYY-MM-DD) para pt-BR sem problema de fuso. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
