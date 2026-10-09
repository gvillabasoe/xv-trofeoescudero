import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { altaInicialDisponible } from "@/server/auth/alta-inicial";
import { obtenerPrisma } from "@/server/db";

/**
 * Proxy de Next 16 (Node.js) para /admin.
 * - /admin/alta-inicial: 404 real si ya hay un administrador o si falta ADMIN_SETUP_SECRET.
 * - Resto del panel: sin cookie de sesión, redirección optimista a /admin/login.
 *   La autorización real (sesión en Neon, rol y TOTP) se hace en cada página y Server Action (guardas.ts).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/alta-inicial") {
    if (!(await altaInicialDisponible(obtenerPrisma(), process.env.ADMIN_SETUP_SECRET))) {
      return new NextResponse("No encontrado", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
    return NextResponse.next();
  }

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (!getSessionCookie(request)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/admin/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
