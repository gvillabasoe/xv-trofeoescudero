import Link from "next/link";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { describirEntorno } from "@/lib/entorno";
import { formatearFechaHora } from "@/lib/estado-base";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { leerResumenPanel } from "@/server/panel/resumen";
import { motivoDemoNoPermitida } from "@/server/semilla/demo";
import { ResetDemo } from "./reset-demo";

export default function PaginaPanelInicio() {
  return (
    <PaginaPanel titulo="Inicio">
      <ContenidoPanel />
    </PaginaPanel>
  );
}

async function ContenidoPanel() {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  const resumen = await leerResumenPanel(obtenerPrisma());
  const demoPermitida = motivoDemoNoPermitida(process.env) === null;
  const { pendientes } = resumen;
  const tareas = [
    pendientes.privacidad && { texto: "Publicar la política de privacidad (sin ella, el formulario está cerrado)", href: "/admin/legal/privacidad" },
    pendientes.avisoLegal && { texto: "Publicar el aviso legal", href: "/admin/legal/aviso-legal" },
    pendientes.titular && { texto: "Completar los datos del titular legal", href: "/admin/configuracion" },
    pendientes.contacto && { texto: "Añadir y activar al menos un canal de contacto", href: "/admin/contacto" },
    pendientes.imagenes > 0 && { texto: `Revisar ${pendientes.imagenes} imágenes pendientes`, href: "/admin/imagenes" },
    resumen.cambiosSinPublicar && { texto: "Hay cambios en el borrador sin publicar", href: "/admin/publicar" },
  ].filter((tarea): tarea is { texto: string; href: string } => Boolean(tarea));

  return (
    <>
      <p>Hola, {usuario.name}.</p>
      <div className="contadores">
        <Link className="contador" href="/admin/propuestas?estado=NUEVA">
          <strong>{resumen.propuestas.nuevas}</strong>
          <span>propuestas nuevas</span>
        </Link>
        <Link className="contador" href="/admin/propuestas?noleidas=si">
          <strong>{resumen.propuestas.sinLeer}</strong>
          <span>sin leer</span>
        </Link>
        <Link className="contador" href="/admin/versiones">
          <strong>{resumen.revision ? `nº ${resumen.revision.numero}` : "—"}</strong>
          <span>versión publicada</span>
        </Link>
        <Link className="contador" href="/admin/publicar">
          <strong>{resumen.cambiosSinPublicar ? "Sí" : "No"}</strong>
          <span>cambios sin publicar</span>
        </Link>
      </div>

      <Seccion titulo="Pendiente" id="pendiente">
        {tareas.length === 0 ? (
          <p>
            <Chip tono="ok">Todo al día</Chip>
          </p>
        ) : (
          <ul className="lista-avisos">
            {tareas.map((tarea) => (
              <li key={tarea.href + tarea.texto}>
                <Link href={tarea.href}>{tarea.texto}</Link>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion titulo="Estado técnico" id="tecnico">
        <dl className="dl-datos">
          <dt>Entorno</dt>
          <dd>{describirEntorno(process.env.VERCEL_ENV)} · base no productiva</dd>
          <dt>Verificación en dos pasos</dt>
          <dd>{usuario.twoFactorEnabled ? "Activa (TOTP)" : "Pendiente"}</dd>
          <dt>Versión publicada</dt>
          <dd>
            {resumen.revision
              ? `nº ${resumen.revision.numero} · ${formatearFechaHora(resumen.revision.publicadaEn)}`
              : "Ninguna"}
          </dd>
          {resumen.revision && (
            <>
              <dt>contentHash</dt>
              <dd>
                <code>{resumen.revision.contentHash}</code>
              </dd>
            </>
          )}
          <dt>Propuestas sintéticas</dt>
          <dd>{resumen.propuestasSinteticas}</dd>
          <dt>Ejecuciones únicas</dt>
          <dd>{resumen.ejecuciones.map((ejecucion) => ejecucion.clave).join(" · ") || "Ninguna"}</dd>
        </dl>
      </Seccion>

      <Seccion titulo="Datos demo" id="demo">
        {demoPermitida ? (
          <ResetDemo />
        ) : (
          <p className="nota">
            El reset de datos demo solo existe en los despliegues Preview de Vercel con la base no productiva.
          </p>
        )}
      </Seccion>
    </>
  );
}
