import type { z } from "zod";
import { newProductSchema } from "../schemas";
import type { Article, ChannelState, DemoState, ManagedBy } from "./state";

export const LOW_STOCK_THRESHOLD = 5;

function seedArticle(
  id: string,
  managedBy: ManagedBy,
  channel: ChannelState,
  input: z.input<typeof newProductSchema>,
): Article {
  const product = newProductSchema.parse(input);
  return {
    ...product,
    id,
    managedBy,
    channel,
    variants: product.variants.map((variant) => ({ ...variant, id: `${id}-${variant.sku}` })),
  };
}

// Estado inicial de cada carga de página. Los datos son ficticios.
export const SEED_STATE: DemoState = {
  articles: [
    seedArticle("art-1", "erp", { status: "published", externalId: 100001 }, {
      name: "Remera de algodón",
      brand: "Marca Demo",
      description: "Remera clásica de ejemplo.",
      categories: ["Indumentaria > Remeras"],
      tags: ["remera", "algodon"],
      visibility: "visible",
      attributes: ["Talle", "Color"],
      variants: [
        { sku: "REM-M-NEG", values: ["M", "Negro"], price: 18500, cost: 9200, weight: 0.25, stock: 24 },
        { sku: "REM-L-NEG", values: ["L", "Negro"], price: 18500, cost: 9200, weight: 0.25, stock: 3 },
      ],
    }),
    seedArticle("art-2", "erp", { status: "unpublished" }, {
      name: "Buzo con capucha",
      brand: "Marca Demo",
      categories: ["Indumentaria > Buzos"],
      attributes: ["Talle"],
      variants: [
        { sku: "BUZ-M", values: ["M"], price: 42000, promotionalPrice: 38000, cost: 21000, weight: 0.6, stock: 12 },
        { sku: "BUZ-L", values: ["L"], price: 44000, cost: 22000, weight: 0.65, stock: 0 },
      ],
    }),
    seedArticle("art-3", "tango", { status: "unpublished" }, {
      name: "Gorra bordada",
      variants: [{ sku: "GOR-UNI", price: 12900, stock: 40 }],
    }),
  ],
  movements: [
    {
      id: "mov-1",
      at: "2026-10-30T14:20:00.000Z",
      sku: "REM-L-NEG",
      type: "ajuste",
      delta: -2,
      resulting: 3,
      reason: "Mercadería dañada",
    },
  ],
  sales: [
    {
      id: "sale-3",
      number: "V-1003",
      createdAt: "2026-10-31T12:10:00.000Z",
      origin: "tiendanube",
      externalRef: "870001",
      customer: "Lucía Ejemplo",
      items: [{ sku: "REM-M-NEG", name: "Remera de algodón", quantity: 2, unitPrice: 18500 }],
      total: 37000,
      payment: { status: "reported", method: "Mercado Pago", reference: "MP-5512", reportedAt: "2026-10-31T12:11:00.000Z" },
      invoice: { status: "pending" },
    },
    {
      id: "sale-2",
      number: "V-1002",
      createdAt: "2026-10-30T18:40:00.000Z",
      origin: "local",
      customer: "Consumidor final",
      items: [{ sku: "BUZ-M", name: "Buzo con capucha", quantity: 1, unitPrice: 38000 }],
      total: 38000,
      payment: {
        status: "consolidated",
        method: "Efectivo",
        reportedAt: "2026-10-30T18:40:00.000Z",
        credited: 38000,
        consolidatedAt: "2026-10-30T20:00:00.000Z",
      },
      invoice: { status: "invoiced", reference: "B 0001-00004521", invoicedAt: "2026-10-30T18:45:00.000Z" },
    },
    {
      id: "sale-1",
      number: "V-1001",
      createdAt: "2026-10-29T15:05:00.000Z",
      origin: "portal",
      customer: "Comercial Norte SRL",
      customerDocument: "30-00000000-0",
      items: [{ sku: "REM-L-NEG", name: "Remera de algodón", quantity: 2, unitPrice: 14800 }],
      total: 29600,
      payment: { status: "pending" },
      invoice: { status: "pending" },
    },
  ],
};
