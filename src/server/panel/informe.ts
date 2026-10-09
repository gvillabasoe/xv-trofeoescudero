import { ErrorPublicacion, prepararPublicacion } from "@/lib/snapshot/construir";
import type { SnapshotPublico } from "@/lib/snapshot/esquema";
import { hashContenido } from "@/lib/snapshot/hash";
import { leerBorrador } from "@/server/borrador";
import type { ConsultasBD } from "@/server/db";
import { leerVersionPublicadaDe } from "@/server/version-publicada";

const SECCIONES: ReadonlyArray<{ clave: keyof SnapshotPublico; nombre: string }> = [
  { clave: "sitio", nombre: "Datos generales y buscadores" },
  { clave: "contacto", nombre: "Canales de contacto" },
  { clave: "hero", nombre: "Hero y cifras" },
  { clave: "familia", nombre: "La familia" },
  { clave: "dia", nombre: "El día" },
  { clave: "colaborar", nombre: "Colaborar (vías, oportunidades y hoyos)" },
  { clave: "cierre", nombre: "Ediciones anteriores y cierre" },
];

export interface InformePublicacion {
  /** Lo que impide publicar. */
  errores: string[];
  /** Lo que se publica sin algún elemento (p. ej., una imagen sin consentimiento). */
  avisos: string[];
  /** Apartados que cambian respecto a la versión publicada. */
  cambios: string[];
  /** El borrador es idéntico a lo publicado. */
  identico: boolean;
  snapshot: SnapshotPublico | null;
  versionSitio: number;
  publicada: { numero: number; publicadaEn: string } | null;
}

/** Valida el borrador como lo haría la publicación y lo compara con la versión publicada. Solo lee. */
export async function informePublicacion(bd: ConsultasBD): Promise<InformePublicacion> {
  const [borrador, publicada, estado] = await Promise.all([
    leerBorrador(bd),
    leerVersionPublicadaDe(bd),
    bd.siteState.findUnique({ where: { id: 1 }, select: { version: true } }),
  ]);
  let snapshot: SnapshotPublico | null = null;
  let errores: string[] = [];
  let avisos: string[] = [];
  try {
    const resultado = prepararPublicacion(borrador);
    snapshot = resultado.snapshot;
    avisos = resultado.avisos;
  } catch (error) {
    if (!(error instanceof ErrorPublicacion)) throw error;
    errores = error.motivos;
  }

  const cambios = snapshot
    ? SECCIONES.filter(
        ({ clave }) => !publicada || hashContenido({ v: snapshot?.[clave] ?? null }) !== hashContenido({ v: publicada.snapshot[clave] ?? null }),
      ).map(({ nombre }) => nombre)
    : [];

  return {
    errores,
    avisos,
    cambios,
    identico: snapshot !== null && publicada !== null && cambios.length === 0,
    snapshot,
    versionSitio: estado?.version ?? 0,
    publicada: publicada && { numero: publicada.numero, publicadaEn: publicada.publicadaEn },
  };
}
