import type { Metadata } from "next";
import { Suspense } from "react";
import { formatearFechaHora } from "@/lib/estado-base";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { accionRevocarOtras, accionRevocarSesion } from "./acciones";
import { ActivarTotp, RegenerarCodigos } from "./formularios";

export const metadata: Metadata = {
  title: "Seguridad · Trofeo Escudero",
};

export default function PaginaSeguridad() {
  return (
    <main id="main" tabIndex={-1} className="contenedor comprobacion">
      <p className="etiqueta">Panel · Seguridad</p>
      <h1 className="titular">
        Seguridad <em>de tu cuenta.</em>
      </h1>
      <Suspense fallback={<p>Cargando…</p>}>
        <ContenidoSeguridad />
      </Suspense>
    </main>
  );
}

/** Resumen legible del navegador, sin guardar ni mostrar la IP. */
function dispositivo(userAgent: string | null): string {
  if (!userAgent) return "Navegador desconocido";
  const navegador = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Navegador";
  const sistema = /Windows/.test(userAgent)
    ? "Windows"
    : /Mac OS X/.test(userAgent)
      ? "macOS"
      : /Android/.test(userAgent)
        ? "Android"
        : /iPhone|iPad/.test(userAgent)
          ? "iOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "otro sistema";
  return `${navegador} en ${sistema}`;
}

async function ContenidoSeguridad() {
  const { usuario, sesionId } = await requerirAdmin({ exigirTotp: false });
  const sesiones = await obtenerPrisma().session.findMany({
    where: { userId: usuario.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, expiresAt: true, userAgent: true },
  });

  return (
    <>
      <section aria-labelledby="titulo-totp" className="panel__bloque">
        <h2 id="titulo-totp">Verificación en dos pasos (TOTP)</h2>
        {usuario.twoFactorEnabled ? (
          <>
            <p>
              <strong>Activa.</strong> Cada acceso pide la contraseña y un código de tu app.
            </p>
            <RegenerarCodigos />
          </>
        ) : (
          <ActivarTotp />
        )}
      </section>

      <section aria-labelledby="titulo-sesiones" className="panel__bloque">
        <h2 id="titulo-sesiones">Sesiones abiertas</h2>
        <ul className="sesiones">
          {sesiones.map((sesion) => (
            <li key={sesion.id}>
              <span>
                {dispositivo(sesion.userAgent)} · desde {formatearFechaHora(sesion.createdAt.toISOString())}
                {sesion.id === sesionId && <strong> · esta sesión</strong>}
              </span>
              <form action={accionRevocarSesion}>
                <input type="hidden" name="sesion" value={sesion.id} />
                <button type="submit" className="boton boton--secundario">
                  {sesion.id === sesionId ? "Cerrar esta sesión" : "Cerrar"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        {sesiones.length > 1 && (
          <form action={accionRevocarOtras}>
            <button type="submit" className="boton boton--secundario">
              Cerrar todas las demás sesiones
            </button>
          </form>
        )}
      </section>
    </>
  );
}
