import type { Metadata } from "next";
import Link from "next/link";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { SubirImagen } from "@/components/panel/subir-imagen";
import { NOMBRE_ESTADO_MEDIO, NOMBRE_TIPO_MEDIO } from "@/lib/panel/opciones";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { describirAlmacen } from "@/server/medios/almacen";
import { listarDestinos } from "@/server/medios/biblioteca";
import { accionSubirImagen } from "./acciones";

export const metadata: Metadata = { title: "Imágenes" };

const FILTROS = {
  activas: { nombre: "En uso o pendientes", where: { reviewState: { not: "RETIRADA" as const } } },
  retiradas: { nombre: "Retiradas", where: { reviewState: "RETIRADA" as const } },
} as const;

export default function PaginaImagenes({ searchParams }: PageProps<"/admin/imagenes">) {
  return (
    <PaginaPanel
      titulo="Imágenes"
      descripcion="Fotos y logos. Ninguna imagen se publica sin texto alternativo, sin el consentimiento de las personas que aparecen (y de sus tutores, si hay menores) y, en los logos, sin el permiso de la marca."
    >
      <Contenido searchParams={searchParams} />
    </PaginaPanel>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/imagenes">["searchParams"] }) {
  await requerirAdmin({ exigirTotp: true });
  const filtro = (await searchParams).ver === "retiradas" ? "retiradas" : "activas";
  const bd = obtenerPrisma();
  const [medios, destinos] = await Promise.all([
    bd.mediaAsset.findMany({
      where: FILTROS[filtro].where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { _count: { select: { usages: true } } },
    }),
    listarDestinos(bd),
  ]);
  const usados = await bd.mediaUsage.findMany({ select: { slot: true, sortOrder: true, heroContentId: true, familyMemberId: true, familyContentId: true, dayContentId: true, routeId: true, sponsorId: true, closingContentId: true, siteSettingsId: true } });
  const ocupados = new Set(
    usados.map(
      (uso) =>
        `${uso.slot}:${uso.heroContentId ?? uso.familyMemberId ?? uso.familyContentId ?? uso.dayContentId ?? uso.routeId ?? uso.sponsorId ?? uso.closingContentId ?? uso.siteSettingsId}:${uso.sortOrder}`,
    ),
  );
  const huecosLibres = destinos.filter((destino) => !ocupados.has(destino.clave) && destino.hueco !== "PATROCINADOR_LOGO");
  const almacen = describirAlmacen();

  return (
    <>
      <Seccion titulo="Subir una imagen" id="subir">
        {almacen ? (
          <SubirImagen accion={accionSubirImagen} />
        ) : (
          <p className="nota">
            No hay ningún almacén de imágenes conectado. En Vercel: Storage › Create › Blob, con acceso «Private», y
            conéctalo a este proyecto. Después, vuelve a desplegar.
          </p>
        )}
      </Seccion>

      {huecosLibres.length > 0 && (
        <Seccion titulo="Fotos que faltan" id="faltan">
          <p className="ayuda">Huecos de la web sin foto: mientras tanto se muestra una ilustración.</p>
          <ul className="lista-avisos">
            {huecosLibres.map((destino) => (
              <li key={destino.clave}>{destino.nombre}</li>
            ))}
          </ul>
        </Seccion>
      )}

      <nav className="cms-en-linea" aria-label="Filtrar imágenes">
        {(Object.keys(FILTROS) as Array<keyof typeof FILTROS>).map((clave) => (
          <Link
            key={clave}
            href={clave === "activas" ? "/admin/imagenes" : "/admin/imagenes?ver=retiradas"}
            className={`boton boton--mini${clave === filtro ? "" : " boton--secundario"}`}
            aria-current={clave === filtro ? "page" : undefined}
          >
            {FILTROS[clave].nombre}
          </Link>
        ))}
      </nav>

      {medios.length === 0 ? (
        <p className="ayuda">No hay imágenes.</p>
      ) : (
        <ul className="miniaturas">
          {medios.map((medio) => (
            <li key={medio.id}>
              <Link className="miniatura" href={`/admin/imagenes/${medio.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura privada servida por el panel */}
                <img src={`/admin/imagenes/${medio.id}/vista`} alt={medio.altText ?? ""} loading="lazy" />
                <span className="cms-en-linea">
                  <Chip tono={medio.reviewState === "PUBLICADA" || medio.reviewState === "AUTORIZADA" ? "ok" : medio.reviewState === "RETIRADA" ? "error" : "aviso"}>
                    {NOMBRE_ESTADO_MEDIO[medio.reviewState]}
                  </Chip>
                  <Chip>{NOMBRE_TIPO_MEDIO[medio.kind]}</Chip>
                </span>
                <span className="ayuda">
                  {medio.width}×{medio.height} · {medio._count.usages} usos{!medio.altText && " · sin texto alternativo"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
