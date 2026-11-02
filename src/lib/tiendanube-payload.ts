import type { NewProduct } from "./schemas";

const LANGUAGE = "es";

type Localized = { [LANGUAGE]: string };

export type TiendanubeInventoryLevel = {
  location_id?: string;
  stock: number;
};

export type TiendanubeVariantPayload = {
  sku: string;
  price: string;
  promotional_price?: string;
  cost?: string;
  weight?: string;
  height?: string;
  width?: string;
  depth?: string;
  barcode?: string;
  values?: Localized[];
  inventory_levels: [TiendanubeInventoryLevel];
};

export type TiendanubeProductPayload = {
  name: Localized;
  handle: Localized;
  description?: Localized;
  brand?: string;
  tags?: string;
  seo_title?: string;
  seo_description?: string;
  free_shipping?: true;
  requires_shipping?: false;
  visibility: NewProduct["visibility"];
  attributes?: Localized[];
  images?: { src: string }[];
  variants: TiendanubeVariantPayload[];
};

const localized = (value: string): Localized => ({ [LANGUAGE]: value });

// Mismas reglas que el "Identificador de URL": sin tildes, ñ, mayúsculas ni espacios.
export function toHandle(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// `published` y `visibility` no pueden enviarse juntos; `variant.stock` está
// deprecado y `stock_management` lo define Tiendanube, así que no se envían.
// Las categorías se omiten porque la API pide IDs y el ERP guarda nombres.
export function buildTiendanubeProductPayload(
  product: NewProduct,
  locationId?: string,
): TiendanubeProductPayload {
  return {
    name: localized(product.name),
    handle: localized(toHandle(product.name)),
    ...(product.description && { description: localized(product.description) }),
    ...(product.brand && { brand: product.brand }),
    ...(product.tags.length > 0 && { tags: product.tags.join(", ") }),
    ...(product.seoTitle && { seo_title: product.seoTitle }),
    ...(product.seoDescription && { seo_description: product.seoDescription }),
    ...(product.freeShipping && { free_shipping: true as const }),
    ...(!product.requiresShipping && { requires_shipping: false as const }),
    visibility: product.visibility,
    ...(product.attributes.length > 0 && { attributes: product.attributes.map(localized) }),
    ...(product.images.length > 0 && { images: product.images.map((src) => ({ src })) }),
    variants: product.variants.map((variant) => ({
      sku: variant.sku,
      price: variant.price.toFixed(2),
      ...(variant.promotionalPrice !== undefined && { promotional_price: variant.promotionalPrice.toFixed(2) }),
      ...(variant.cost !== undefined && { cost: variant.cost.toFixed(2) }),
      ...(variant.weight !== undefined && { weight: variant.weight.toFixed(3) }),
      ...(variant.height !== undefined && { height: variant.height.toFixed(2) }),
      ...(variant.width !== undefined && { width: variant.width.toFixed(2) }),
      ...(variant.depth !== undefined && { depth: variant.depth.toFixed(2) }),
      ...(variant.barcode && { barcode: variant.barcode }),
      ...(variant.values.length > 0 && { values: variant.values.map(localized) }),
      inventory_levels: [
        { ...(locationId && { location_id: locationId }), stock: variant.stock },
      ],
    })),
  };
}
