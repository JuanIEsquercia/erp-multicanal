import type { NewProduct } from "../schemas";
import type { SaleInput, SalePayment } from "./sales";

// Contrato que cumplirá la integración real; hoy solo existe la simulación.
export type ChannelAdapter = {
  publishProduct(product: NewProduct): Promise<{ externalId: number }>;
};

const SIMULATED_DELAY_MS = 700;
// Permite probar el flujo de error: falla todo SKU que contenga este texto.
export const SIMULATED_FAILURE_MARKER = "ERROR";

let nextExternalId = 200000;

export const simulatedChannel: ChannelAdapter = {
  async publishProduct(product) {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));
    if (product.variants.some((variant) => variant.sku.includes(SIMULATED_FAILURE_MARKER))) {
      throw new Error("Error simulado: el canal rechazó el producto.");
    }
    nextExternalId += 1;
    return { externalId: nextExternalId };
  },
};

// Subconjunto del pedido de la API de Tiendanube que necesita el ERP.
export type TiendanubeOrder = {
  id: number;
  contact_name: string;
  contact_identification?: string;
  payment_status:
    | "authorized"
    | "pending"
    | "paid"
    | "partially_paid"
    | "abandoned"
    | "refunded"
    | "partially_refunded"
    | "voided";
  gateway_name?: string;
  gateway_id?: string;
  paid_at?: string;
  products: { sku: string; quantity: number }[];
};

// Un pago parcial sigue pendiente, y una devolución parcial sigue siendo un pago
// informado: ambos se revisan a mano al consolidar.
function toSalePayment(order: TiendanubeOrder, now: string): SalePayment {
  switch (order.payment_status) {
    case "paid":
    case "partially_refunded":
      return {
        status: "reported",
        method: order.gateway_name ?? "Tiendanube",
        reference: order.gateway_id,
        reportedAt: order.paid_at ?? now,
      };
    case "refunded":
    case "voided":
      return { status: "voided" };
    case "authorized":
    case "pending":
    case "partially_paid":
    case "abandoned":
      return { status: "pending" };
  }
}

export function saleInputFromTiendanubeOrder(order: TiendanubeOrder, now: string): SaleInput {
  return {
    origin: "tiendanube",
    externalRef: String(order.id),
    customer: order.contact_name,
    customerDocument: order.contact_identification,
    items: order.products,
    payment: toSalePayment(order, now),
  };
}
