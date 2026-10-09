import type { Metadata } from "next";
import Link from "next/link";
import { PaginaPanel } from "@/components/panel/pagina";
import { formatearFechaHora } from "@/lib/estado-base";
import type { Prisma } from "@/generated/prisma/client";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";

export const metadata: Metadata = { title: "Actividad" };

const GRUPOS = {
  todo: { nombre: "Todo", acciones: null },
  seguridad: {
    nombre: "Seguridad",
    acciones: [
      "ALTA_INICIAL",
      "INICIO_SESION",
      "INICIO_SESION_FALLIDO",
      "CIERRE_SESION",
      "TOTP_ACTIVADO",
      "TOTP_RESTABLECIDO",
      "CODIGOS_RECUPERACION_REGENERADOS",
      "SESION_REVOCADA",
      "LIMITE_INTENTOS",
    ],
  },
  contenido: {
    nombre: "Contenido y publicación",
    acciones: ["CONTENIDO_GUARDADO", "PUBLICACION", "RESTAURACION", "PATROCINADOR_GUARDADO", "PATROCINADOR_ARCHIVADO", "CONFIGURACION_GUARDADA"],
  },
  imagenes: { nombre: "Imágenes", acciones: ["MEDIO_SUBIDO", "MEDIO_REVISADO", "MEDIO_RETIRADO", "MEDIO_PURGADO"] },
  propuestas: {
    nombre: "Propuestas",
    acciones: [
      "PROPUESTA_ESTADO",
      "PROPUESTA_NOTA",
      "PROPUESTA_ARCHIVADA",
      "PROPUESTA_ANONIMIZADA",
      "PROPUESTA_ELIMINADA",
      "EXPORTACION_CSV",
    ],
  },
  sistema: {
    nombre: "Sistema",
    acciones: ["BOOTSTRAP_INICIAL", "BOOTSTRAP_REGISTRADO", "BACKFILL_APLICADO", "DEMO_CREADO", "RESET_NO_PRODUCTIVO", "RETENCION_EJECUTADA"],
  },
} as const satisfies Record<string, { nombre: string; acciones: readonly Prisma.AuditLogCreateInput["action"][] | null }>;

type Grupo = keyof typeof GRUPOS;
const POR_PAGINA = 50;

export default function PaginaActividad({ searchParams }: PageProps<"/admin/actividad">) {
  return (
    <PaginaPanel
      titulo="Actividad del panel"
      descripcion="Registro de solo inserción: quién hizo qué y cuándo. Nunca guarda emails, teléfonos, mensajes, contraseñas, códigos ni direcciones IP."
    >
      <Contenido searchParams={searchParams} />
    </PaginaPanel>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/actividad">["searchParams"] }) {
  await requerirAdmin({ exigirTotp: true });
  const parametros = await searchParams;
  const grupo: Grupo = typeof parametros.grupo === "string" && parametros.grupo in GRUPOS ? (parametros.grupo as Grupo) : "todo";
  const pagina = Math.max(1, Number(typeof parametros.pagina === "string" ? parametros.pagina : 1) || 1);
  const acciones = GRUPOS[grupo].acciones;
  const where: Prisma.AuditLogWhereInput = acciones ? { action: { in: [...acciones] } } : {};
  const bd = obtenerPrisma();
  const [total, registros] = await Promise.all([
    bd.auditLog.count({ where }),
    bd.auditLog.findMany({
      where,
      orderBy: { at: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { actor: { select: { name: true } } },
    }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlace = (g: Grupo, p = 1) => `/admin/actividad?grupo=${g}${p > 1 ? `&pagina=${p}` : ""}`;

  return (
    <>
      <nav className="cms-en-linea" aria-label="Filtrar la actividad">
        {(Object.keys(GRUPOS) as Grupo[]).map((clave) => (
          <Link
            key={clave}
            href={enlace(clave)}
            className={`boton boton--mini${clave === grupo ? "" : " boton--secundario"}`}
            aria-current={clave === grupo ? "page" : undefined}
          >
            {GRUPOS[clave].nombre}
          </Link>
        ))}
      </nav>
      <div className="tabla-contenedor">
        <table className="tabla">
          <caption className="visually-hidden">Actividad · {GRUPOS[grupo].nombre}</caption>
          <thead>
            <tr>
              <th scope="col">Cuándo</th>
              <th scope="col">Quién</th>
              <th scope="col">Qué</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((registro) => (
              <tr key={registro.id}>
                <td>{formatearFechaHora(registro.at.toISOString())}</td>
                <td>{registro.actorType === "SYSTEM" ? "Sistema" : (registro.actor?.name ?? "Usuario eliminado")}</td>
                <td>{registro.summary ?? registro.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="paginacion">
        {pagina > 1 && <Link href={enlace(grupo, pagina - 1)}>← Más recientes</Link>}
        <span>
          Página {pagina} de {paginas} · {total} registros
        </span>
        {pagina < paginas && <Link href={enlace(grupo, pagina + 1)}>Más antiguos →</Link>}
      </p>
    </>
  );
}
