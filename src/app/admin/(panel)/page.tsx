import { Suspense } from "react";
import { describirEntorno } from "@/lib/entorno";
import { formatearFechaHora } from "@/lib/estado-base";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { leerResumenPanel } from "@/server/panel/resumen";
import { motivoDemoNoPermitida } from "@/server/semilla/demo";
import { ResetDemo } from "./reset-demo";

// Dashboard técnico provisional (Entrega 4B). El CMS completo llega en la Fase 5.
export default function PaginaPanel() {
  return (
    <main id="main" tabIndex={-1} className="contenedor comprobacion">
      <Suspense fallback={<p>Cargando el panel…</p>}>
        <ContenidoPanel />
      </Suspense>
    </main>
  );
}

async function ContenidoPanel() {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  const resumen = await leerResumenPanel(obtenerPrisma());
  const demoPermitida = motivoDemoNoPermitida(process.env) === null;

  return (
    <>
      <p className="etiqueta">Panel · dashboard técnico provisional</p>
      <h1 className="titular">
        Hola, <em>{usuario.name}.</em>
      </h1>

      <dl className="tarjeta">
        <div className="tarjeta__fila">
          <dt>Usuario</dt>
          <dd>{usuario.email}</dd>
        </div>
        <div className="tarjeta__fila">
          <dt>Verificación en dos pasos</dt>
          <dd>{usuario.twoFactorEnabled ? "Activa (TOTP)" : "Pendiente"}</dd>
        </div>
        <div className="tarjeta__fila">
          <dt>Entorno</dt>
          <dd>{describirEntorno(process.env.VERCEL_ENV)} · base no productiva</dd>
        </div>
        <div className="tarjeta__fila">
          <dt>Conexión</dt>
          <dd>Conectada a Neon</dd>
        </div>
        <div className="tarjeta__fila">
          <dt>Versión publicada</dt>
          <dd>
            {resumen.revision
              ? `nº ${resumen.revision.numero} · ${formatearFechaHora(resumen.revision.publicadaEn)}`
              : "Ninguna"}
          </dd>
        </div>
        {resumen.revision && (
          <div className="tarjeta__fila">
            <dt>contentHash</dt>
            <dd>
              <code>{resumen.revision.contentHash}</code>
            </dd>
          </div>
        )}
        <div className="tarjeta__fila">
          <dt>Borrador</dt>
          <dd>{resumen.cambiosSinPublicar ? "Hay cambios sin publicar" : "Sin cambios pendientes"}</dd>
        </div>
        <div className="tarjeta__fila">
          <dt>Propuestas sintéticas</dt>
          <dd>{resumen.propuestasSinteticas}</dd>
        </div>
        <div className="tarjeta__fila">
          <dt>Ejecuciones únicas</dt>
          <dd>{resumen.ejecuciones.map((ejecucion) => ejecucion.clave).join(" · ") || "Ninguna"}</dd>
        </div>
      </dl>

      <section aria-labelledby="titulo-demo" className="panel__bloque">
        <h2 id="titulo-demo">Datos demo</h2>
        {demoPermitida ? (
          <ResetDemo />
        ) : (
          <p className="nota">
            El reset de datos demo solo existe en los despliegues Preview de Vercel con la base no productiva.
          </p>
        )}
      </section>
    </>
  );
}
