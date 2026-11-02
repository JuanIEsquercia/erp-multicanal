import { replaceVariantStock, type Context, type DemoState, type Movement } from "./state";

export type SaleOrigin = "tiendanube" | "portal" | "local";

// "reported" es lo que informa el canal o el vendedor; "consolidated" confirma
// que la plata se acreditó, normalmente por un monto menor por las comisiones.
export type SalePayment =
  | { status: "pending" }
  | { status: "reported"; method: string; reference?: string; reportedAt: string }
  | {
      status: "consolidated";
      method: string;
      reference?: string;
      reportedAt: string;
      credited: number;
      consolidatedAt: string;
    }
  | { status: "voided" };

export type SaleInvoice =
  | { status: "pending" }
  | { status: "invoiced"; reference: string; invoicedAt: string };

export type SaleItem = { sku: string; name: string; quantity: number; unitPrice: number };

export type Sale = {
  id: string;
  number: string;
  createdAt: string;
  origin: SaleOrigin;
  externalRef?: string;
  customer: string;
  customerDocument?: string;
  items: SaleItem[];
  total: number;
  payment: SalePayment;
  invoice: SaleInvoice;
};

export type SaleInput = {
  origin: SaleOrigin;
  externalRef?: string;
  customer: string;
  customerDocument?: string;
  items: { sku: string; quantity: number }[];
  payment?: SalePayment;
};

function nextSaleNumber(state: DemoState): string {
  const highest = Math.max(1000, ...state.sales.map((sale) => Number(sale.number.replace("V-", ""))));
  return `V-${highest + 1}`;
}

function updateSale(state: DemoState, saleId: string, update: (sale: Sale) => Sale): DemoState {
  if (!state.sales.some((sale) => sale.id === saleId)) throw new Error("La venta no existe.");
  return { ...state, sales: state.sales.map((sale) => (sale.id === saleId ? update(sale) : sale)) };
}

// El precio queda congelado en la venta: un cambio posterior del artículo no la altera.
export function registerSale(state: DemoState, input: SaleInput, context: Context): DemoState {
  if (!input.customer.trim()) throw new Error("Indicá el cliente.");
  if (input.items.length === 0) throw new Error("Agregá al menos un artículo.");

  const stockBySku = new Map<string, number>();
  const movements: Movement[] = [];
  const items: SaleItem[] = [];
  const number = nextSaleNumber(state);

  for (const { sku, quantity } of input.items) {
    const article = state.articles.find((candidate) => candidate.variants.some((variant) => variant.sku === sku));
    const variant = article?.variants.find((candidate) => candidate.sku === sku);
    if (!article || !variant) throw new Error(`No existe el SKU ${sku}.`);
    if (stockBySku.has(sku)) throw new Error(`El SKU ${sku} está repetido en la venta.`);
    if (article.managedBy !== "erp") throw new Error(`${sku} se gestiona en Tango: registrá la venta allá.`);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error(`Cantidad inválida para ${sku}.`);
    if (quantity > variant.stock) throw new Error(`Stock insuficiente de ${sku}: hay ${variant.stock}.`);

    const resulting = variant.stock - quantity;
    stockBySku.set(sku, resulting);
    items.push({ sku, name: article.name, quantity, unitPrice: variant.promotionalPrice ?? variant.price });
    movements.push({
      id: context.newId(),
      at: context.now,
      sku,
      type: "venta",
      delta: -quantity,
      resulting,
      reason: `Venta ${number}`,
    });
  }

  const sale: Sale = {
    id: context.newId(),
    number,
    createdAt: context.now,
    origin: input.origin,
    externalRef: input.externalRef,
    customer: input.customer.trim(),
    customerDocument: input.customerDocument?.trim() || undefined,
    items,
    total: items.reduce((total, item) => total + item.quantity * item.unitPrice, 0),
    payment: input.payment ?? { status: "pending" },
    invoice: { status: "pending" },
  };

  return {
    ...state,
    articles: replaceVariantStock(state, stockBySku),
    movements: [...movements, ...state.movements],
    sales: [sale, ...state.sales],
  };
}

export function reportPayment(
  state: DemoState,
  saleId: string,
  payment: { method: string; reference?: string },
  context: Context,
): DemoState {
  if (!payment.method.trim()) throw new Error("Indicá el medio de pago.");
  return updateSale(state, saleId, (sale) => {
    if (sale.payment.status !== "pending") throw new Error("La venta no tiene un pago pendiente.");
    return {
      ...sale,
      payment: {
        status: "reported",
        method: payment.method.trim(),
        reference: payment.reference?.trim() || undefined,
        reportedAt: context.now,
      },
    };
  });
}

export function consolidatePayment(state: DemoState, saleId: string, credited: number, context: Context): DemoState {
  return updateSale(state, saleId, (sale) => {
    if (sale.payment.status !== "reported") throw new Error("Solo se consolida un pago informado.");
    if (!Number.isFinite(credited) || credited <= 0 || credited > sale.total) {
      throw new Error("El monto acreditado debe ser mayor a cero y no superar el total de la venta.");
    }
    return {
      ...sale,
      payment: { ...sale.payment, status: "consolidated", credited, consolidatedAt: context.now },
    };
  });
}

export function markInvoiced(state: DemoState, saleId: string, reference: string, context: Context): DemoState {
  const trimmed = reference.trim();
  if (!trimmed) throw new Error("Indicá el número de comprobante.");
  const duplicate = state.sales.find(
    (sale) => sale.id !== saleId && sale.invoice.status === "invoiced" && sale.invoice.reference === trimmed,
  );
  if (duplicate) throw new Error(`Ese comprobante ya está en la venta ${duplicate.number}.`);

  return updateSale(state, saleId, (sale) => ({
    ...sale,
    invoice: { status: "invoiced", reference: trimmed, invoicedAt: context.now },
  }));
}

export function clearInvoice(state: DemoState, saleId: string): DemoState {
  return updateSale(state, saleId, (sale) => ({ ...sale, invoice: { status: "pending" } }));
}
