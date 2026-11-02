import { NextResponse } from "next/server";
import { apiError, readJson, validationError } from "@/lib/api-response";
import { stockImportResultSchema, stockImportSchema } from "@/lib/schemas";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const json = await readJson(request);
  if (!json.ok) return apiError(400, "INVALID_JSON", "El cuerpo de la petición no es JSON válido.");

  const parsed = stockImportSchema.safeParse(json.body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const { data, error } = await createSupabaseAdmin().rpc("import_stock", { p_rows: parsed.data.rows });
    if (error) throw error;
    return NextResponse.json(stockImportResultSchema.parse(data));
  } catch (error) {
    console.error("No se pudo importar el stock", error);
    return apiError(500, "DATABASE_ERROR", "No se pudo importar el stock. No se aplicó ningún cambio.");
  }
}
