import type { NewProduct, StockRow } from "../schemas";
import type { Sale } from "./sales";

export type ChannelState =
  | { status: "unpublished" }
  | { status: "publishing" }
  | { status: "published"; externalId: number }
  | { status: "error"; message: string };

// Durante la convivencia, cada artículo tiene un solo sistema a cargo de su stock y precio.
export type ManagedBy = "erp" | "tango";

export type Variant = NewProduct["variants"][number] & { id: string };
export type Article = Omit<NewProduct, "variants"> & {
  id: string;
  variants: Variant[];
  channel: ChannelState;
  managedBy: ManagedBy;
};

export type Movement = {
  id: string;
  at: string;
  sku: string;
  type: "alta" | "csv" | "ajuste" | "venta";
  delta: number;
  resulting: number;
  reason: string;
};

export type DemoState = { articles: Article[]; movements: Movement[]; sales: Sale[] };

export type Context = { now: string; newId: () => string };

export type StockImportPreview = {
  changes: { sku: string; current: number; next: number }[];
  unchanged: number;
  unknownSkus: string[];
};

export function allVariants(state: DemoState): Variant[] {
  return state.articles.flatMap((article) => article.variants);
}

export function replaceVariantStock(state: DemoState, stockBySku: Map<string, number>): Article[] {
  return state.articles.map((article) => ({
    ...article,
    variants: article.variants.map((variant) => {
      const stock = stockBySku.get(variant.sku);
      return stock === undefined ? variant : { ...variant, stock };
    }),
  }));
}

export function findExistingSkus(state: DemoState, product: NewProduct): string[] {
  const existing = new Set(allVariants(state).map((variant) => variant.sku));
  return product.variants.map((variant) => variant.sku).filter((sku) => existing.has(sku));
}

export function addArticle(state: DemoState, product: NewProduct, context: Context): DemoState {
  const variants = product.variants.map((variant) => ({ ...variant, id: context.newId() }));
  const movements: Movement[] = variants
    .filter((variant) => variant.stock > 0)
    .map((variant) => ({
      id: context.newId(),
      at: context.now,
      sku: variant.sku,
      type: "alta",
      delta: variant.stock,
      resulting: variant.stock,
      reason: "Stock inicial",
    }));

  return {
    ...state,
    articles: [
      { ...product, id: context.newId(), variants, channel: { status: "unpublished" }, managedBy: "erp" },
      ...state.articles,
    ],
    movements: [...movements, ...state.movements],
  };
}

export function setManagedBy(state: DemoState, articleId: string, managedBy: ManagedBy): DemoState {
  return {
    ...state,
    articles: state.articles.map((article) =>
      article.id === articleId ? { ...article, managedBy } : article,
    ),
  };
}

export function previewStockImport(state: DemoState, rows: StockRow[]): StockImportPreview {
  const currentBySku = new Map(allVariants(state).map((variant) => [variant.sku, variant.stock]));
  const preview: StockImportPreview = { changes: [], unchanged: 0, unknownSkus: [] };

  for (const { sku, quantity } of rows) {
    const current = currentBySku.get(sku);
    if (current === undefined) preview.unknownSkus.push(sku);
    else if (current === quantity) preview.unchanged += 1;
    else preview.changes.push({ sku, current, next: quantity });
  }
  return preview;
}

export function applyStockImport(
  state: DemoState,
  changes: StockImportPreview["changes"],
  context: Context,
): DemoState {
  const movements: Movement[] = changes.map(({ sku, current, next }) => ({
    id: context.newId(),
    at: context.now,
    sku,
    type: "csv",
    delta: next - current,
    resulting: next,
    reason: "Carga de stock por CSV",
  }));

  return {
    ...state,
    articles: replaceVariantStock(state, new Map(changes.map(({ sku, next }) => [sku, next]))),
    movements: [...movements, ...state.movements],
  };
}

export function adjustStock(
  state: DemoState,
  adjustment: { sku: string; delta: number; reason: string },
  context: Context,
): DemoState {
  const variant = allVariants(state).find(({ sku }) => sku === adjustment.sku);
  if (!variant) throw new Error(`No existe el SKU ${adjustment.sku}.`);

  const resulting = variant.stock + adjustment.delta;
  if (resulting < 0) throw new Error(`El stock de ${adjustment.sku} no puede quedar negativo.`);

  return {
    ...state,
    articles: replaceVariantStock(state, new Map([[adjustment.sku, resulting]])),
    movements: [
      { id: context.newId(), at: context.now, type: "ajuste", resulting, ...adjustment },
      ...state.movements,
    ],
  };
}

export function setChannelState(state: DemoState, articleId: string, channel: ChannelState): DemoState {
  return {
    ...state,
    articles: state.articles.map((article) =>
      article.id === articleId ? { ...article, channel } : article,
    ),
  };
}
