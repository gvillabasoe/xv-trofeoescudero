import type { Metadata } from "next";
import Link from "next/link";
import { Chip, PaginaPanel } from "@/components/panel/pagina";
import { NOMBRE_ESTADO_PROPUESTA, NOMBRE_TIPO_COLABORACION, ORDEN_TIPOS_COLABORACION } from "@/lib/etiquetas";
import { formatearFechaHora } from "@/lib/estado-base";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { ESTADOS_PROPUESTA, contarPorEstado, listarPropuestas } from "@/server/propuestas/bandeja";
import { filtroDesdeParametros, parametrosDeFiltro } from "./filtro";

export const metadata: Metadata = { title: "Propuestas" };

export default function PaginaPropuestas({ searchParams }: PageProps<"/admin/propuestas">) {
  return (
    <PaginaPanel
      titulo="Propuestas"
      descripcion="Lo que llega desde /proponer. Datos personales: solo para responder a cada propuesta. Nunca se publican."
    >
      <Contenido searchParams={searchParams} />
    </PaginaPanel>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/propuestas">["searchParams"] }) {
  await requerirAdmin({ exigirTotp: true });
  const filtro = filtroDesdeParametros(await searchParams);
  const bd = obtenerPrisma();
  const [{ total, propuestas, paginas }, recuento] = await Promise.all([
    listarPropuestas(bd, filtro, filtro.pagina),
    contarPorEstado(bd),
  ]);

  return (
    <>
      <p className="cms-en-linea">
        <Chip tono="nuevo">{recuento.noLeidas} sin leer</Chip>
        {ESTADOS_PROPUESTA.map((estado) => (
          <Chip key={estado}>
            {NOMBRE_ESTADO_PROPUESTA[estado]}: {recuento.porEstado[estado] ?? 0}
          </Chip>
        ))}
      </p>

      <form className="filtros" method="get" action="/admin/propuestas" role="search" aria-label="Filtrar propuestas">
        <div className="campo">
          <label htmlFor="filtro-q">Buscar</label>
          <input id="filtro-q" name="q" defaultValue={filtro.texto ?? ""} placeholder="Nombre, empresa o email" />
        </div>
        <div className="campo">
          <label htmlFor="filtro-estado">Estado</label>
          <select id="filtro-estado" name="estado" defaultValue={filtro.estado ?? ""}>
            <option value="">Todos</option>
            {ESTADOS_PROPUESTA.map((estado) => (
              <option key={estado} value={estado}>
                {NOMBRE_ESTADO_PROPUESTA[estado]}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="filtro-tipo">Tipo</label>
          <select id="filtro-tipo" name="tipo" defaultValue={filtro.tipo ?? ""}>
            <option value="">Todos</option>
            {ORDEN_TIPOS_COLABORACION.map((tipo) => (
              <option key={tipo} value={tipo}>
                {NOMBRE_TIPO_COLABORACION[tipo]}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="filtro-archivo">Archivo</label>
          <select id="filtro-archivo" name="archivo" defaultValue={filtro.archivo}>
            <option value="activas">Sin archivar</option>
            <option value="archivadas">Archivadas</option>
            <option value="todas">Todas</option>
          </select>
        </div>
        <label className="campo--casilla">
          <input type="checkbox" name="noleidas" value="si" defaultChecked={filtro.soloNoLeidas} /> Solo sin leer
        </label>
        <button type="submit" className="boton">
          Filtrar
        </button>
        <a className="boton boton--secundario" href={`/admin/propuestas/exportar${parametrosDeFiltro(filtro)}`}>
          Exportar CSV
        </a>
      </form>

      <div className="tabla-contenedor">
        <table className="tabla">
          <caption className="visually-hidden">Propuestas ({total})</caption>
          <thead>
            <tr>
              <th scope="col">Recibida</th>
              <th scope="col">Empresa</th>
              <th scope="col">Nombre</th>
              <th scope="col">Tipo</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {propuestas.length === 0 && (
              <tr>
                <td colSpan={5}>No hay propuestas con este filtro.</td>
              </tr>
            )}
            {propuestas.map((propuesta) => (
              <tr key={propuesta.id} className={propuesta.readAt ? undefined : "no-leida"}>
                <td>{formatearFechaHora(propuesta.createdAt.toISOString())}</td>
                <td>
                  <Link href={`/admin/propuestas/${propuesta.id}`}>{propuesta.company || "—"}</Link>
                  {!propuesta.readAt && <span className="visually-hidden"> (sin leer)</span>}
                </td>
                <td>{propuesta.name}</td>
                <td>{NOMBRE_TIPO_COLABORACION[propuesta.collaborationType]}</td>
                <td className="cms-en-linea">
                  <Chip tono={propuesta.status === "NUEVA" ? "nuevo" : "neutro"}>{NOMBRE_ESTADO_PROPUESTA[propuesta.status]}</Chip>
                  {propuesta.archivedAt && <Chip>Archivada</Chip>}
                  {propuesta.anonymizedAt && <Chip tono="aviso">Anonimizada</Chip>}
                  {propuesta.isSynthetic && <Chip tono="aviso">Demo</Chip>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="paginacion">
        {filtro.pagina > 1 && <Link href={`/admin/propuestas${parametrosDeFiltro(filtro, filtro.pagina - 1)}`}>← Anteriores</Link>}
        <span>
          Página {filtro.pagina} de {paginas} · {total} propuestas
        </span>
        {filtro.pagina < paginas && (
          <Link href={`/admin/propuestas${parametrosDeFiltro(filtro, filtro.pagina + 1)}`}>Siguientes →</Link>
        )}
      </p>
    </>
  );
}
