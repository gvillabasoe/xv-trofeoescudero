import { generarCsv } from "@/lib/csv";
import { NOMBRE_ESTADO_PROPUESTA, NOMBRE_TIPO_COLABORACION } from "@/lib/etiquetas";
import { auditar } from "@/server/auditoria";
import type { ClienteBD } from "@/server/db";
import { condicionesBandeja, type FiltroBandeja } from "./bandeja";

export const CABECERAS_CSV = [
  "Referencia",
  "Recibida",
  "Estado",
  "Tipo",
  "Nombre",
  "Empresa",
  "Cargo",
  "Email",
  "Teléfono",
  "Propuesta",
  "Origen",
  "Archivada",
  "Anonimizada",
] as const;

const fecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Madrid" });

/**
 * Exporta a CSV las propuestas del filtro actual. Queda auditado (quién y cuántas, sin datos personales).
 * Las propuestas sintéticas (datos demo) nunca se exportan.
 */
export async function exportarPropuestas(bd: ClienteBD, opciones: { filtro: FiltroBandeja; actorId: string }) {
  const propuestas = await bd.submission.findMany({
    where: { AND: [condicionesBandeja(opciones.filtro), { isSynthetic: false }] },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  const csv = generarCsv(
    CABECERAS_CSV,
    propuestas.map((propuesta) => [
      propuesta.id,
      fecha.format(propuesta.createdAt),
      NOMBRE_ESTADO_PROPUESTA[propuesta.status],
      NOMBRE_TIPO_COLABORACION[propuesta.collaborationType],
      propuesta.name,
      propuesta.company,
      propuesta.jobTitle,
      propuesta.email,
      propuesta.phone,
      propuesta.message,
      propuesta.formOrigin,
      propuesta.archivedAt ? "Sí" : "No",
      propuesta.anonymizedAt ? "Sí" : "No",
    ]),
  );
  await auditar(bd, {
    actorId: opciones.actorId,
    accion: "EXPORTACION_CSV",
    entidad: "Submission",
    resumen: `Exportación CSV de ${propuestas.length} propuestas`,
  });
  return { csv, total: propuestas.length };
}
