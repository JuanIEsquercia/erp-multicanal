import { NextResponse } from "next/server";
import type { z } from "zod";

export function apiError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined && { details }) } },
    { status },
  );
}

export function validationError(error: z.ZodError) {
  return apiError(
    400,
    "VALIDATION_ERROR",
    "Hay datos inválidos.",
    error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  );
}

export async function readJson(request: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false };
  }
}
