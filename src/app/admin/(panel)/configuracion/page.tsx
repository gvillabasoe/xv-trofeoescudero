import type { Metadata } from "next";
import { FormularioEntidad } from "@/components/panel/formulario-entidad";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { valoresDe } from "@/lib/panel/campos";
import { sitioIndexable, urlBaseSitio } from "@/lib/sitio";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { describirAlmacen } from "@/server/medios/almacen";
import { crearNotificador } from "@/server/notificaciones/notificador";
import { REGISTRO } from "@/server/panel/registro";
import { turnstileActivo } from "@/server/propuestas/turnstile";

export const metadata: Metadata = { title: "Configuración" };

export default function PaginaConfiguracion() {
  return (
    <PaginaPanel titulo="Configuración" descripcion="Datos generales del torneo, retención de datos y servicios conectados.">
      <Contenido />
    </PaginaPanel>
  );
}

function Estado({ activo, si, no }: { activo: boolean; si: string; no: string }) {
  return activo ? <Chip tono="ok">{si}</Chip> : <Chip tono="aviso">{no}</Chip>;
}

async function Contenido() {
  await requerirAdmin({ exigirTotp: true });
  const bd = obtenerPrisma();
  const [sitio, politica] = await Promise.all([
    bd.siteSettings.findUnique({ where: { id: 1 } }),
    bd.policySettings.findUnique({ where: { id: 1 } }),
  ]);
  const almacen = describirAlmacen();

  return (
    <>
      {sitio && (
        <Seccion titulo="Datos generales" id="sitio">
          <p className="ayuda">
            Fecha, sede y textos para buscadores se publican. Los datos del titular legal son internos: los textos legales
            se escriben en «Textos legales».
          </p>
          <FormularioEntidad
            entidad="sitio"
            id={1}
            version={sitio.version}
            campos={REGISTRO.sitio.campos}
            valores={valoresDe(sitio, REGISTRO.sitio.campos)}
          />
        </Seccion>
      )}

      {politica && (
        <Seccion titulo="Retención y privacidad" id="politica">
          <p className="ayuda">
            Una tarea diaria aplica estos plazos. Entorno de datos de esta base: <strong>{politica.environment}</strong>.
            Verificación en dos pasos obligatoria: <strong>{politica.requireTotp ? "sí" : "no"}</strong>.
          </p>
          <FormularioEntidad
            entidad="politica"
            id={1}
            version={politica.version}
            campos={REGISTRO.politica.campos}
            valores={valoresDe(politica, REGISTRO.politica.campos)}
          />
        </Seccion>
      )}

      <Seccion titulo="Servicios" id="servicios">
        <dl className="dl-datos">
          <dt>Almacén de imágenes</dt>
          <dd>
            <Estado
              activo={almacen !== null}
              si={almacen === "vercel-blob" ? "Vercel Blob (privado)" : "Disco local (pruebas)"}
              no="Sin conectar"
            />{" "}
            {almacen === null && "Conecta un almacén Blob privado al proyecto en Vercel para subir imágenes."}
          </dd>
          <dt>Avisos por email</dt>
          <dd>
            <Estado activo={crearNotificador().nombre === "resend"} si="Resend" no="Desactivados" />{" "}
            Las propuestas se guardan siempre; el aviso es opcional.
          </dd>
          <dt>Tarea diaria de retención</dt>
          <dd>
            <Estado activo={Boolean(process.env.CRON_SECRET)} si="Protegida con CRON_SECRET" no="Sin CRON_SECRET" />
          </dd>
          <dt>Antispam adicional (Turnstile)</dt>
          <dd>
            <Estado activo={turnstileActivo()} si="Activo" no="Preparado, desactivado" />
          </dd>
          <dt>Indexación en buscadores</dt>
          <dd>
            <Estado activo={sitioIndexable()} si="Activa (lanzada)" no="Desactivada hasta el lanzamiento" />
          </dd>
          <dt>Dirección del sitio</dt>
          <dd>{urlBaseSitio()}</dd>
        </dl>
      </Seccion>
    </>
  );
}
