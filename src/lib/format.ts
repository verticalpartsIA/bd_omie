/**
 * Formata número como Real Brasileiro sem espaço: R$1.000,00
 */
export function formatBRL(v: number | null | undefined): string {
  const n = Number(v) || 0;
  return "R$" + n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata de forma compacta: R$1,2M, R$950K, R$12,3K
 */
export function formatBRLCompact(v: number | null | undefined): string {
  const n = Number(v) || 0;
  if (n >= 1_000_000)
    return "R$" + (n / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "M";
  if (n >= 1_000)
    return "R$" + (n / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "K";
  return formatBRL(n);
}
