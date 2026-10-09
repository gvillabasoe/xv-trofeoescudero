/**
 * Estado de la base de datos y de la versión publicada, para la página de estado técnico.
 * Funciones puras: reciben los valores como argumento para poder probarse.
 * Nunca muestran secretos ni valores de variables: solo identificadores, recuentos y fechas.
 */

export type EstadoBase =
  | { disponible: false }
  | {
      disponible: true;
      entorno: string | null;
      migraciones: number;
      ultimaMigracion: string | null;
      tablas: number;
      /** Claves de SeedRun (bootstrap y backfills ya aplicados). */
      ejecucionesUnicas: string[];
      propuestasSinteticas: number;
    };

export interface FilaEstado {
  etiqueta: string;
  valor: string;
}

export function describirMarcador(entorno: string | null): string {
  switch (entorno) {
    case "NONPROD":
      return "No productiva (NONPROD)";
    case "PROD":
      return "Producción (PROD)";
    default:
      return "Sin marcador de entorno";
  }
}

export function describirEstadoBase(estado: EstadoBase): FilaEstado[] {
  if (!estado.disponible) {
    return [
      { etiqueta: "Conexión", valor: "Sin base de datos en este build (CI o local)" },
      { etiqueta: "Base de datos", valor: "Sin conexión en este build (CI o local)" },
    ];
  }

  return [
    { etiqueta: "Conexión", valor: "Conectada durante el build" },
    { etiqueta: "Base de datos", valor: describirMarcador(estado.entorno) },
    {
      etiqueta: "Migraciones aplicadas",
      valor:
        estado.migraciones === 0
          ? "Ninguna"
          : `${estado.migraciones} · última: ${estado.ultimaMigracion ?? "—"}`,
    },
    { etiqueta: "Tablas del modelo", valor: String(estado.tablas) },
    {
      etiqueta: "Ejecuciones únicas",
      valor: estado.ejecucionesUnicas.length > 0 ? estado.ejecucionesUnicas.join(" · ") : "Ninguna",
    },
    { etiqueta: "Propuestas sintéticas", valor: String(estado.propuestasSinteticas) },
  ];
}

/** Fecha y hora en español, hora peninsular. */
export function formatearFechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
    timeStyle: "medium",
    timeZone: "Europe/Madrid",
  }).format(new Date(iso));
}

export function describirVersionPublicada(
  version: {
    revisionId: string;
    numero: number;
    contentHash: string;
    publicadaEn: string;
    leidaEn: string;
    lecturaId: string;
  } | null,
): FilaEstado[] {
  if (!version) {
    return [{ etiqueta: "Versión publicada", valor: "Ninguna en este build" }];
  }
  return [
    { etiqueta: "Versión publicada", valor: `nº ${version.numero} · ${formatearFechaHora(version.publicadaEn)}` },
    { etiqueta: "ID de la revisión", valor: version.revisionId },
    { etiqueta: "contentHash", valor: version.contentHash },
    { etiqueta: "Snapshot leído de Neon", valor: formatearFechaHora(version.leidaEn) },
    { etiqueta: "Identificador de lectura", valor: version.lecturaId },
  ];
}
