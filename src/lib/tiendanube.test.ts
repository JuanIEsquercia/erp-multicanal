import { afterEach, describe, expect, it, vi } from "vitest";
import { newProductSchema } from "./schemas";
import { createTiendanubeProduct, TiendanubeError } from "./tiendanube";
import { buildTiendanubeProductPayload } from "./tiendanube-payload";

vi.mock("server-only", () => ({}));

const config = { storeId: 123, accessToken: "token", userAgent: "ERP (a@b.com)" };
const payload = { name: { es: "Remera" }, handle: { es: "remera" }, visibility: "hidden" as const, variants: [] };

afterEach(() => {
  vi.unstubAllGlobals();
});

const json = (status: number, body: unknown, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), { status, headers });

describe("buildTiendanubeProductPayload", () => {
  it("construye el payload completo", () => {
    const product = newProductSchema.parse({
      name: " Remera ",
      description: "Algodón",
      brand: "Marca",
      visibility: "visible",
      attributes: ["Talle", "Color"],
      images: ["https://example.com/a.jpg"],
      variants: [{ sku: "R-M", values: ["M", "Rojo"], price: 1500, cost: 700.5, weight: 0.25, stock: 4 }],
    });

    expect(buildTiendanubeProductPayload(product, "LOC1")).toEqual({
      name: { es: "Remera" },
      handle: { es: "remera" },
      description: { es: "Algodón" },
      brand: "Marca",
      visibility: "visible",
      attributes: [{ es: "Talle" }, { es: "Color" }],
      images: [{ src: "https://example.com/a.jpg" }],
      variants: [
        {
          sku: "R-M",
          price: "1500.00",
          cost: "700.50",
          weight: "0.250",
          values: [{ es: "M" }, { es: "Rojo" }],
          inventory_levels: [{ location_id: "LOC1", stock: 4 }],
        },
      ],
    });
  });

  it("incluye los campos de la planilla de carga masiva", () => {
    const product = newProductSchema.parse({
      name: "Pantalón Básico Ñandú",
      tags: ["oferta", "invierno"],
      seoTitle: "Pantalón",
      freeShipping: true,
      requiresShipping: false,
      variants: [{ sku: "P", price: 10, promotionalPrice: 8, height: 2, width: 30, depth: 40, barcode: "779", stock: 1 }],
    });

    expect(buildTiendanubeProductPayload(product)).toMatchObject({
      handle: { es: "pantalon-basico-nandu" },
      tags: "oferta, invierno",
      seo_title: "Pantalón",
      free_shipping: true,
      requires_shipping: false,
      variants: [{ promotional_price: "8.00", height: "2.00", width: "30.00", depth: "40.00", barcode: "779" }],
    });
  });

  it("omite lo opcional en un producto simple", () => {
    const product = newProductSchema.parse({
      name: "Taza",
      variants: [{ sku: "T", price: 10, stock: 0 }],
    });

    expect(buildTiendanubeProductPayload(product)).toEqual({
      name: { es: "Taza" },
      handle: { es: "taza" },
      visibility: "hidden",
      variants: [{ sku: "T", price: "10.00", inventory_levels: [{ stock: 0 }] }],
    });
  });
});

describe("newProductSchema", () => {
  const variant = { sku: "A", values: ["M"], price: 1, stock: 1 };

  it.each([
    ["valores distintos a los atributos", { attributes: ["Talle", "Color"], variants: [variant] }],
    ["SKU repetido", { attributes: ["Talle"], variants: [variant, { ...variant, values: ["L"] }] }],
    ["combinación repetida", { attributes: ["Talle"], variants: [variant, { ...variant, sku: "B" }] }],
    ["atributos repetidos", { attributes: ["Talle", "Talle"], variants: [{ ...variant, values: ["M", "L"] }] }],
  ])("rechaza %s", (_label, input) => {
    expect(newProductSchema.safeParse({ name: "X", ...input }).success).toBe(false);
  });
});

describe("createTiendanubeProduct", () => {
  it("envía la petición esperada y devuelve los IDs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(201, { id: 9, variants: [{ id: 5, sku: "A" }] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createTiendanubeProduct(payload, config)).resolves.toEqual({
      id: 9,
      variants: [{ id: 5, sku: "A" }],
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.tiendanube.com/2025-03/123/products");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer token",
      "Content-Type": "application/json",
      "User-Agent": "ERP (a@b.com)",
    });
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it("reintenta un 429 y luego tiene éxito", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(429, {}, { "x-rate-limit-reset": "1" }))
      .mockResolvedValueOnce(json(201, { id: 9, variants: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createTiendanubeProduct(payload, config)).resolves.toMatchObject({ id: 9 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("informa rechazo si el 429 persiste", async () => {
    const fetchMock = vi.fn(async () => json(429, {}, { "x-rate-limit-reset": "1" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createTiendanubeProduct(payload, config)).rejects.toMatchObject({
      outcome: "rejected",
      status: 429,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("devuelve el detalle de un 422 como rechazo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(422, { name: ["inválido"] })));

    await expect(createTiendanubeProduct(payload, config)).rejects.toMatchObject({
      outcome: "rejected",
      status: 422,
      details: { name: ["inválido"] },
    });
  });

  it.each([
    ["un 500", () => Promise.resolve(json(500, {}))],
    ["un error de red", () => Promise.reject(new TypeError("fetch failed"))],
    ["un timeout", () => Promise.reject(new DOMException("timeout", "TimeoutError"))],
    ["un 201 inesperado", () => Promise.resolve(json(201, { unexpected: true }))],
  ])("no reintenta %s y lo deja como resultado desconocido", async (_label, respond) => {
    const fetchMock = vi.fn(respond);
    vi.stubGlobal("fetch", fetchMock);

    const error = await createTiendanubeProduct(payload, config).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TiendanubeError);
    expect((error as TiendanubeError).outcome).toBe("unknown");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
