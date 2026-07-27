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

/** Moeda BRL compacta: 1500 → "R$ 1,5 mil"; 2_500_000 → "R$ 2,5 mi". */
export function formatBRLk(value: number | null | undefined): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return formatBRL(n);
}

/** Número pt-BR sem casas decimais. */
export function formatNum(value: number | null | undefined): string {
  return (Number(value) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

/** Intervalo de datas a partir de um preset (all/30d/90d/1y/month). */
export function periodRange(preset: string): { start: string | null; end: string | null } {
  if (preset === "all") return { start: null, end: null };
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now);
  if (preset === "30d") start.setDate(start.getDate() - 30);
  else if (preset === "90d") start.setDate(start.getDate() - 90);
  else if (preset === "1y") start.setFullYear(start.getFullYear() - 1);
  else if (preset === "month") start.setDate(1);
  return { start: start.toISOString().slice(0, 10), end };
}

/** Formata data ISO (YYYY-MM-DD) para pt-BR sem problema de fuso. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
