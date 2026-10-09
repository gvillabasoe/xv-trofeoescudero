import type { SnapshotPublico } from "@/lib/snapshot/esquema";
import { esquemaSnapshotV1, type SnapshotV1 } from "@/lib/snapshot/esquema-v1";

// Solo para los tests: reconstruye el snapshot de la versión 1 (Entregas 3 y 4, sin imágenes) a partir del
// de la versión 2. Sirve para simular instalaciones antiguas y comprobar que se siguen leyendo igual.

function quitar<T extends Record<string, unknown>>(objeto: T, clave: string): Record<string, unknown> {
  const resto: Record<string, unknown> = { ...objeto };
  delete resto[clave];
  return resto;
}

export function aSnapshotV1(snapshot: SnapshotPublico): SnapshotV1 {
  return esquemaSnapshotV1.parse({
    ...snapshot,
    version: 1,
    sitio: quitar(snapshot.sitio, "imagenCompartir"),
    hero: quitar(snapshot.hero, "imagen"),
    familia: snapshot.familia && {
      ...snapshot.familia,
      segundaGeneracion: quitar(snapshot.familia.segundaGeneracion, "imagen"),
      terceraGeneracion: quitar(snapshot.familia.terceraGeneracion, "imagen"),
      miembros: snapshot.familia.miembros.map((miembro) => quitar(miembro, "foto")),
    },
    dia: snapshot.dia && {
      ...snapshot.dia,
      norte: quitar(snapshot.dia.norte, "imagen"),
      sur: quitar(snapshot.dia.sur, "imagen"),
      despues: quitar(snapshot.dia.despues, "imagen"),
    },
    colaborar: { ...snapshot.colaborar, vias: snapshot.colaborar.vias.map((via) => quitar(via, "imagen")) },
    cierre: snapshot.cierre && {
      ...quitar(snapshot.cierre, "imagen"),
      historial: {
        ...snapshot.cierre.historial,
        marcas: snapshot.cierre.historial.marcas.map((marca) => quitar(marca, "logo")),
      },
    },
  });
}
