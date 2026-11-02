const currencyFormat = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

// Zona horaria fija para que servidor y navegador rendericen el mismo texto.
const dateTimeFormat = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

export const formatCurrency = (value: number) => currencyFormat.format(value);
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));

export function formatPriceRange(prices: number[]): string {
  if (prices.length === 0) return "—";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
}
