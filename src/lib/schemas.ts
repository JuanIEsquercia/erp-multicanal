import { z } from "zod";

export const MAX_INT = 2_147_483_647;
export const MAX_STOCK_ROWS = 20_000;
// Tiendanube recomienda no enviar más de 9 imágenes al crear el producto.
export const MAX_IMAGES_ON_CREATE = 9;

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const money = z.number().nonnegative().max(9_999_999_999.99);
const stock = z.number().int().nonnegative().max(MAX_INT);
const sku = z.string().trim().min(1, "El SKU es obligatorio").max(64);

const variantSchema = z.object({
  sku,
  values: z.array(z.string().trim().min(1, "Completá el valor del atributo")).max(3).default([]),
  price: money,
  promotionalPrice: money.optional(),
  cost: money.optional(),
  weight: z.number().nonnegative().max(99_999.999).optional(),
  height: z.number().int().nonnegative().optional(),
  width: z.number().int().nonnegative().optional(),
  depth: z.number().int().nonnegative().optional(),
  barcode: optionalText,
  stock,
});

export const newProductSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(255),
    description: optionalText,
    brand: optionalText,
    categories: z.array(z.string().trim().min(1)).default([]),
    tags: z.array(z.string().trim().min(1)).default([]),
    seoTitle: optionalText,
    seoDescription: optionalText,
    freeShipping: z.boolean().default(false),
    requiresShipping: z.boolean().default(true),
    visibility: z.enum(["visible", "unlisted", "hidden"]).default("hidden"),
    attributes: z.array(z.string().trim().min(1)).max(3).default([]),
    images: z.array(z.url()).max(MAX_IMAGES_ON_CREATE).default([]),
    variants: z.array(variantSchema).min(1, "Agregá al menos una variante").max(1000),
  })
  .superRefine((product, ctx) => {
    const fail = (path: PropertyKey[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });

    if (new Set(product.attributes).size !== product.attributes.length) {
      fail(["attributes"], "Los atributos no pueden repetirse");
    }
    if (product.attributes.length === 0 && product.variants.length > 1) {
      fail(["variants"], "Para tener varias variantes hay que definir atributos");
    }

    const seenSkus = new Set<string>();
    const seenCombinations = new Set<string>();
    product.variants.forEach((variant, index) => {
      if (variant.values.length !== product.attributes.length) {
        fail(["variants", index, "values"], "Debe haber un valor por cada atributo");
      }
      if (seenSkus.has(variant.sku)) {
        fail(["variants", index, "sku"], `SKU repetido: ${variant.sku}`);
      }
      const combination = JSON.stringify(variant.values);
      if (seenCombinations.has(combination)) {
        fail(["variants", index, "values"], "Combinación de valores repetida");
      }
      seenSkus.add(variant.sku);
      seenCombinations.add(combination);
    });
  });

export type NewProduct = z.infer<typeof newProductSchema>;

export const stockImportSchema = z.object({
  rows: z
    .array(z.object({ sku, quantity: stock }))
    .min(1)
    .max(MAX_STOCK_ROWS)
    .superRefine((rows, ctx) => {
      const seen = new Set<string>();
      rows.forEach((row, index) => {
        if (seen.has(row.sku)) {
          ctx.addIssue({ code: "custom", path: [index, "sku"], message: `SKU repetido: ${row.sku}` });
        }
        seen.add(row.sku);
      });
    }),
});

export type StockRow = z.infer<typeof stockImportSchema>["rows"][number];

export const stockImportResultSchema = z.object({
  updated: z.number(),
  unknown_skus: z.array(z.string()),
});

export type StockImportResult = z.infer<typeof stockImportResultSchema>;

export const createdProductSchema = z.object({
  product_id: z.uuid(),
  variants: z.array(z.object({ id: z.uuid(), sku: z.string() })),
});

export const productOverviewSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  brand: z.string().nullable(),
  visibility: z.enum(["visible", "unlisted", "hidden"]),
  created_at: z.string(),
  tiendanube_product_id: z.string().nullable(),
  total_stock: z.number(),
  variants: z.array(
    z.object({
      id: z.uuid(),
      sku: z.string(),
      option_values: z.array(z.string()),
      price: z.number(),
      quantity: z.number(),
    }),
  ),
});

export type ProductOverview = z.infer<typeof productOverviewSchema>;
