/**
 * Estado de la base de datos leído durante el build, para la página de comprobación.
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
