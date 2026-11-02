import { NextResponse } from "next/server";
import { apiError, readJson, validationError } from "@/lib/api-response";
import { getEnv } from "@/lib/env";
import { createdProductSchema, newProductSchema } from "@/lib/schemas";
import { createSupabaseAdmin } from "@/lib/supabase";
import { createTiendanubeProduct, TiendanubeError, type TiendanubeCreatedProduct } from "@/lib/tiendanube";
import { buildTiendanubeProductPayload } from "@/lib/tiendanube-payload";

export const maxDuration = 60;

const POSTGRES_UNIQUE_VIOLATION = "23505";

type CreatedLocally = ReturnType<typeof createdProductSchema.parse>;

function buildMappingRows(storeId: number, local: CreatedLocally, remote: TiendanubeCreatedProduct) {
  const remoteIdBySku = new Map(remote.variants.map((variant) => [variant.sku, variant.id]));
  const rows: Record<string, unknown>[] = [
    { store_id: storeId, entity_type: "product", product_id: local.product_id, external_id: remote.id },
  ];
  const unmatchedSkus: string[] = [];

  for (const variant of local.variants) {
    const externalId = remoteIdBySku.get(variant.sku);
    if (externalId === undefined) {
      unmatchedSkus.push(variant.sku);
    } else {
      rows.push({ store_id: storeId, entity_type: "variant", variant_id: variant.id, external_id: externalId });
    }
  }
  return { rows, unmatchedSkus };
}

// Orden: guardar en el ERP, crear en Tiendanube y guardar el mapeo. Primero va el
// ERP porque su SKU único bloquea un reenvío que podría duplicar el producto.
export async function POST(request: Request) {
  const json = await readJson(request);
  if (!json.ok) return apiError(400, "INVALID_JSON", "El cuerpo de la petición no es JSON válido.");

  const parsed = newProductSchema.safeParse(json.body);
  if (!parsed.success) return validationError(parsed.error);
  const product = parsed.data;

  let local: CreatedLocally;
  let supabase: ReturnType<typeof createSupabaseAdmin>;
  let env: ReturnType<typeof getEnv>;
  try {
    env = getEnv();
    supabase = createSupabaseAdmin();
    const { data, error } = await supabase.rpc("create_product", { p_product: product });
    if (error?.code === POSTGRES_UNIQUE_VIOLATION) {
      return apiError(409, "SKU_CONFLICT", "Alguno de los SKU ya existe en el ERP.");
    }
    if (error) throw error;
    local = createdProductSchema.parse(data);
  } catch (error) {
    console.error("No se pudo guardar el producto en el ERP", error);
    return apiError(500, "DATABASE_ERROR", "No se pudo guardar el producto en el ERP.");
  }

  let remote: TiendanubeCreatedProduct;
  try {
    remote = await createTiendanubeProduct(
      buildTiendanubeProductPayload(product, env.TIENDANUBE_LOCATION_ID),
      {
        storeId: env.TIENDANUBE_STORE_ID,
        accessToken: env.TIENDANUBE_ACCESS_TOKEN,
        userAgent: env.TIENDANUBE_USER_AGENT,
      },
    );
  } catch (error) {
    if (!(error instanceof TiendanubeError)) throw error;
    console.error("Error al crear el producto en Tiendanube", error.message, error.status, error.details);

    if (error.outcome === "unknown") {
      return apiError(
        502,
        "TIENDANUBE_OUTCOME_UNKNOWN",
        `${error.message} El producto quedó en el ERP sin vincular. Revisá en Tiendanube si se creó antes de volver a cargarlo.`,
        { productId: local.product_id },
      );
    }

    // Rechazo seguro: se revierte para poder corregir los datos y reenviar.
    const { error: rollbackError } = await supabase.from("products").delete().eq("id", local.product_id);
    if (rollbackError) {
      console.error("No se pudo revertir el producto local", local.product_id, rollbackError);
    }
    const message = rollbackError
      ? `${error.message} Además, el producto no pudo eliminarse del ERP: borralo antes de reintentar.`
      : error.message;
    if (error.status === 422) {
      return apiError(422, "TIENDANUBE_VALIDATION_ERROR", message, error.details);
    }
    if (error.status === 429) {
      return apiError(503, "TIENDANUBE_RATE_LIMITED", `${message} Probá de nuevo en unos segundos.`);
    }
    return apiError(502, "TIENDANUBE_REJECTED", message);
  }

  const { rows, unmatchedSkus } = buildMappingRows(env.TIENDANUBE_STORE_ID, local, remote);
  const { error: mappingError } = await supabase.from("tiendanube_mappings").insert(rows);
  if (mappingError || unmatchedSkus.length > 0) {
    console.error("Mapeo incompleto", { productId: local.product_id, remoteId: remote.id, unmatchedSkus, mappingError });
    return apiError(
      500,
      "MAPPING_FAILED",
      `El producto se creó en Tiendanube (ID ${remote.id}), pero su mapeo quedó incompleto. No lo vuelvas a cargar.`,
      { productId: local.product_id, tiendanubeProductId: remote.id, unmatchedSkus },
    );
  }

  return NextResponse.json(
    { productId: local.product_id, tiendanubeProductId: remote.id },
    { status: 201 },
  );
}
