import { beforeEach, describe, expect, it, vi } from "vitest";
import { TiendanubeError } from "@/lib/tiendanube";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  eq: vi.fn(),
  insert: vi.fn(),
  createTiendanubeProduct: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    TIENDANUBE_STORE_ID: 123,
    TIENDANUBE_ACCESS_TOKEN: "token",
    TIENDANUBE_USER_AGENT: "ERP",
  }),
}));
vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    rpc: mocks.rpc,
    from: () => ({ delete: () => ({ eq: mocks.eq }), insert: mocks.insert }),
  }),
}));
vi.mock("@/lib/tiendanube", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tiendanube")>()),
  createTiendanubeProduct: mocks.createTiendanubeProduct,
}));

const PRODUCT_ID = "7b0c2f1e-1f40-4c55-9d7e-0a4a8c1c2d11";
const VARIANT_ID = "1e6f4a6b-3c7d-4a0e-8e7c-5b2d9f0a7c22";

const request = (body: unknown = { name: "Taza", variants: [{ sku: "T", price: 10, stock: 1 }] }) =>
  new Request("http://localhost/api/products", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.rpc.mockResolvedValue({
    data: { product_id: PRODUCT_ID, variants: [{ id: VARIANT_ID, sku: "T" }] },
    error: null,
  });
  mocks.eq.mockResolvedValue({ error: null });
  mocks.insert.mockResolvedValue({ error: null });
});

describe("POST /api/products", () => {
  it("guarda el mapeo de producto y variantes", async () => {
    mocks.createTiendanubeProduct.mockResolvedValue({ id: 9, variants: [{ id: 5, sku: "T" }] });

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith([
      { store_id: 123, entity_type: "product", product_id: PRODUCT_ID, external_id: 9 },
      { store_id: 123, entity_type: "variant", variant_id: VARIANT_ID, external_id: 5 },
    ]);
  });

  it("no llama a Tiendanube si los datos son inválidos", async () => {
    const response = await POST(request({ name: "" }));

    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.createTiendanubeProduct).not.toHaveBeenCalled();
  });

  it("responde 409 si el SKU ya existe, sin llamar a Tiendanube", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "23505" } });

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(mocks.createTiendanubeProduct).not.toHaveBeenCalled();
  });

  it("revierte el producto local ante un rechazo", async () => {
    mocks.createTiendanubeProduct.mockRejectedValue(
      new TiendanubeError("Rechazado", "rejected", 422, { name: ["inválido"] }),
    );

    const response = await POST(request());

    expect(response.status).toBe(422);
    expect(mocks.eq).toHaveBeenCalledWith("id", PRODUCT_ID);
    expect((await response.json()).error.details).toEqual({ name: ["inválido"] });
  });

  it("conserva el producto local si el resultado es desconocido", async () => {
    mocks.createTiendanubeProduct.mockRejectedValue(new TiendanubeError("Sin respuesta", "unknown"));

    const response = await POST(request());

    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("TIENDANUBE_OUTCOME_UNKNOWN");
    expect(mocks.eq).not.toHaveBeenCalled();
  });

  it("avisa si Tiendanube no devuelve una variante", async () => {
    mocks.createTiendanubeProduct.mockResolvedValue({ id: 9, variants: [] });

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect((await response.json()).error).toMatchObject({
      code: "MAPPING_FAILED",
      details: { tiendanubeProductId: 9, unmatchedSkus: ["T"] },
    });
  });
});
