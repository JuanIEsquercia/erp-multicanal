import "server-only";
import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  TIENDANUBE_STORE_ID: z.coerce.number().int().positive(),
  TIENDANUBE_ACCESS_TOKEN: z.string().min(1),
  TIENDANUBE_USER_AGENT: z.string().min(1),
  TIENDANUBE_LOCATION_ID: z
    .string()
    .optional()
    .transform((value) => value || undefined),
});

export type Env = z.infer<typeof envSchema>;

// Se valida al usarla, no al importar, para que el build no dependa de los secretos.
export function getEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Variables de entorno inválidas: ${names}`);
  }
  return result.data;
}
