/**
 * Estado de la base de datos y de la versión publicada, para la página de estado técnico.
 * Funciones puras: reciben los valores como argumento para poder probarse.
 */

export type EstadoBase =
  | { disponible: false }
  | {
      disponible: true;
      entorno: string | null;
      migraciones: number;
      ultimaMigracion: string | null;
      tablas: number;
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
    return [{ etiqueta: "Base de datos", valor: "Sin conexión en este build (CI o local)" }];
  }

  return [
    { etiqueta: "Base de datos", valor: describirMarcador(estado.entorno) },
    {
      etiqueta: "Migraciones aplicadas",
      valor:
        estado.migraciones === 0
          ? "Ninguna"
          : `${estado.migraciones} · última: ${estado.ultimaMigracion ?? "—"}`,
    },
    { etiqueta: "Tablas del modelo", valor: String(estado.tablas) },
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
  version: { numero: number; publicadaEn: string; leidaEn: string } | null,
): FilaEstado[] {
  if (!version) {
    return [{ etiqueta: "Versión publicada", valor: "Ninguna en este build" }];
  }
  return [
    { etiqueta: "Versión publicada", valor: `nº ${version.numero} · ${formatearFechaHora(version.publicadaEn)}` },
    { etiqueta: "Snapshot leído de Neon", valor: formatearFechaHora(version.leidaEn) },
  ];
}
