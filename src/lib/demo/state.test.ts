import { describe, expect, it } from "vitest";
import { newProductSchema } from "../schemas";
import { SEED_STATE } from "./seed";
import {
  addArticle,
  adjustStock,
  allVariants,
  applyStockImport,
  findExistingSkus,
  previewStockImport,
  type DemoState,
} from "./state";

let counter = 0;
const context = { now: "2026-11-01T00:00:00.000Z", newId: () => `id-${++counter}` };
const stockOf = (state: DemoState, sku: string) => allVariants(state).find((v) => v.sku === sku)?.stock;

describe("addArticle", () => {
  const product = newProductSchema.parse({
    name: "Taza",
    variants: [{ sku: "TAZA", price: 10, stock: 6 }],
  });

  it("lo crea sin publicar y registra el stock inicial", () => {
    const next = addArticle(SEED_STATE, product, context);

    expect(next.articles[0]).toMatchObject({ name: "Taza", channel: { status: "unpublished" } });
    expect(next.movements[0]).toMatchObject({ sku: "TAZA", type: "alta", delta: 6, resulting: 6 });
  });

  it("detecta los SKU existentes", () => {
    const duplicate = newProductSchema.parse({
      name: "Otra",
      variants: [{ sku: "GOR-UNI", price: 1, stock: 0 }],
    });
    expect(findExistingSkus(SEED_STATE, duplicate)).toEqual(["GOR-UNI"]);
    expect(findExistingSkus(SEED_STATE, product)).toEqual([]);
  });
});

describe("importación de stock", () => {
  it("separa cambios, filas iguales y SKU desconocidos", () => {
    const preview = previewStockImport(SEED_STATE, [
      { sku: "BUZ-M", quantity: 20 },
      { sku: "GOR-UNI", quantity: 40 },
      { sku: "NOPE", quantity: 1 },
    ]);

    expect(preview).toEqual({
      changes: [{ sku: "BUZ-M", current: 12, next: 20 }],
      unchanged: 1,
      unknownSkus: ["NOPE"],
    });
  });

  it("reemplaza el stock y registra la diferencia", () => {
    const next = applyStockImport(SEED_STATE, [{ sku: "BUZ-M", current: 12, next: 5 }], context);

    expect(stockOf(next, "BUZ-M")).toBe(5);
    expect(next.movements[0]).toMatchObject({ sku: "BUZ-M", type: "csv", delta: -7, resulting: 5 });
  });
});

describe("adjustStock", () => {
  it("suma o resta y registra el motivo", () => {
    const next = adjustStock(SEED_STATE, { sku: "BUZ-L", delta: 4, reason: "Recuento" }, context);

    expect(stockOf(next, "BUZ-L")).toBe(4);
    expect(next.movements[0]).toMatchObject({ type: "ajuste", reason: "Recuento", resulting: 4 });
  });

  it("no permite stock negativo ni SKU inexistentes", () => {
    expect(() => adjustStock(SEED_STATE, { sku: "BUZ-L", delta: -1, reason: "x" }, context)).toThrow(/negativo/);
    expect(() => adjustStock(SEED_STATE, { sku: "NOPE", delta: 1, reason: "x" }, context)).toThrow(/No existe/);
  });
});
