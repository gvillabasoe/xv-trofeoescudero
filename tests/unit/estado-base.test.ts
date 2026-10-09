import { describe, expect, it } from "vitest";
import {
  describirEstadoBase,
  describirMarcador,
  describirVersionPublicada,
  formatearFechaHora,
} from "../../src/lib/estado-base";

describe("describirMarcador", () => {
  it("traduce el marcador de entorno de la base", () => {
    expect(describirMarcador("NONPROD")).toBe("No productiva (NONPROD)");
    expect(describirMarcador("PROD")).toBe("Producción (PROD)");
    expect(describirMarcador(null)).toBe("Sin marcador de entorno");
  });
});

describe("describirEstadoBase", () => {
  it("indica que no hay base en CI", () => {
    const filas = describirEstadoBase({ disponible: false });
    expect(filas.map((fila) => fila.etiqueta)).toEqual(["Conexión", "Base de datos"]);
  });

  it("resume conexión, marcador, migraciones, tablas, ejecuciones únicas y datos sintéticos", () => {
    expect(
      describirEstadoBase({
        disponible: true,
        entorno: "NONPROD",
        migraciones: 2,
        ultimaMigracion: "0002_seedrun",
        tablas: 39,
        ejecucionesUnicas: ["initial-content-v1", "entidades-historicas-v1"],
        propuestasSinteticas: 4,
      }),
    ).toEqual([
      { etiqueta: "Conexión", valor: "Conectada durante el build" },
      { etiqueta: "Base de datos", valor: "No productiva (NONPROD)" },
      { etiqueta: "Migraciones aplicadas", valor: "2 · última: 0002_seedrun" },
      { etiqueta: "Tablas del modelo", valor: "39" },
      { etiqueta: "Ejecuciones únicas", valor: "initial-content-v1 · entidades-historicas-v1" },
      { etiqueta: "Propuestas sintéticas", valor: "4" },
    ]);
  });
});

describe("describirVersionPublicada", () => {
  it("indica que no hay versión publicada en CI", () => {
    expect(describirVersionPublicada(null)).toEqual([{ etiqueta: "Versión publicada", valor: "Ninguna en este build" }]);
  });

  it("muestra ID, número, huella y fechas en hora peninsular, sin secretos", () => {
    const filas = describirVersionPublicada({
      revisionId: "rev-123",
      numero: 1,
      contentHash: "f".repeat(64),
      publicadaEn: "2026-10-09T16:05:00.000Z",
      leidaEn: "2026-10-09T16:06:30.000Z",
      lecturaId: "abcd1234",
    });
    expect(filas.map((fila) => fila.etiqueta)).toEqual([
      "Versión publicada",
      "ID de la revisión",
      "contentHash",
      "Snapshot leído de Neon",
      "Identificador de lectura",
    ]);
    expect(filas[0]?.valor).toMatch(/^nº 1 · 9 de octubre de 2026/);
    expect(filas[0]?.valor).toContain("18:05");
    expect(filas[3]?.valor).toContain("18:06:30");
  });
});

describe("formatearFechaHora", () => {
  it("usa la hora de Madrid también en invierno", () => {
    expect(formatearFechaHora("2027-01-15T10:00:00.000Z")).toContain("11:00");
  });
});
