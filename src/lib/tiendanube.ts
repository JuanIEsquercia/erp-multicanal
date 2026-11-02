import "server-only";
import { z } from "zod";
import type { TiendanubeProductPayload } from "./tiendanube-payload";

const API_VERSION = "2025-03";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const MAX_RATE_LIMIT_WAIT_MS = 3_000;

export type TiendanubeConfig = {
  storeId: number;
  accessToken: string;
  userAgent: string;
};

const createdProductSchema = z.object({
  id: z.number(),
  variants: z.array(z.object({ id: z.number(), sku: z.string().nullable().optional() })),
});

export type TiendanubeCreatedProduct = z.infer<typeof createdProductSchema>;

export class TiendanubeError extends Error {
  constructor(
    message: string,
    // rejected: seguro que no se creó. unknown: pudo haberse creado.
    readonly outcome: "rejected" | "unknown",
    readonly status?: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "TiendanubeError";
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 500);
  }
}

function rateLimitDelay(response: Response, attempt: number): number {
  const reset = Number(response.headers.get("x-rate-limit-reset"));
  const delay = Number.isFinite(reset) && reset > 0 ? reset : 1_000 * attempt;
  return Math.min(delay, MAX_RATE_LIMIT_WAIT_MS);
}

// El POST no es idempotente: solo se reintenta ante un 429, donde Tiendanube
// garantiza el rechazo. Reintentar un timeout o un 5xx podría duplicar el producto.
export async function createTiendanubeProduct(
  payload: TiendanubeProductPayload,
  config: TiendanubeConfig,
): Promise<TiendanubeCreatedProduct> {
  const url = `https://api.tiendanube.com/${API_VERSION}/${config.storeId}/products`;

  for (let attempt = 1; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
          "User-Agent": config.userAgent,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (cause) {
      const timedOut = cause instanceof Error && cause.name === "TimeoutError";
      throw new TiendanubeError(
        timedOut ? "Tiendanube no respondió a tiempo." : "No se pudo conectar con Tiendanube.",
        "unknown",
      );
    }

    if (response.status === 429 && attempt < MAX_ATTEMPTS) {
      await wait(rateLimitDelay(response, attempt));
      continue;
    }

    if (response.ok) {
      const parsed = createdProductSchema.safeParse(await readBody(response));
      if (!parsed.success) {
        throw new TiendanubeError(
          "Tiendanube devolvió una respuesta inesperada.",
          "unknown",
          response.status,
        );
      }
      return parsed.data;
    }

    const details = await readBody(response);
    if (response.status >= 500) {
      throw new TiendanubeError(
        `Tiendanube respondió con un error ${response.status}.`,
        "unknown",
        response.status,
        details,
      );
    }
    throw new TiendanubeError(
      `Tiendanube rechazó el producto (${response.status}).`,
      "rejected",
      response.status,
      details,
    );
  }
}
