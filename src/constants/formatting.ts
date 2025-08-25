export const currencyFmt = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

export function formatCurrency(n: number) {
  return currencyFmt.format(Number.isFinite(n) ? n : 0);
}

export function parseAmount(str: string) {
  if (str == null) return 0;
  const s = String(str)
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
