import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

function hasValidCredentials(header: string | null, user: string, password: string): boolean {
  if (!header?.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) return false;

  const userMatches = safeEqual(decoded.slice(0, separator), user);
  const passwordMatches = safeEqual(decoded.slice(separator + 1), password);
  return userMatches && passwordMatches;
}

// Las rutas usan la service role de Supabase, por lo que todo el panel y su API
// quedan detrás de esta verificación. Sin credenciales configuradas, no se abre.
export function proxy(request: NextRequest) {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  if (!user || !password) {
    return new NextResponse("Faltan ADMIN_USER y ADMIN_PASSWORD.", { status: 503 });
  }

  if (hasValidCredentials(request.headers.get("authorization"), user, password)) {
    return NextResponse.next();
  }

  return new NextResponse("Autenticación requerida.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="ERP", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
