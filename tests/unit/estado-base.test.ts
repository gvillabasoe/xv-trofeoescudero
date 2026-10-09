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
    expect(describirEstadoBase({ disponible: false })).toEqual([
      { etiqueta: "Base de datos", valor: "Sin conexión en este build (CI o local)" },
    ]);
  });

  it("resume marcador, migraciones y tablas", () => {
    expect(
      describirEstadoBase({
        disponible: true,
        entorno: "NONPROD",
        migraciones: 1,
        ultimaMigracion: "0001_inicial",
        tablas: 38,
      }),
    ).toEqual([
      { etiqueta: "Base de datos", valor: "No productiva (NONPROD)" },
      { etiqueta: "Migraciones aplicadas", valor: "1 · última: 0001_inicial" },
      { etiqueta: "Tablas del modelo", valor: "38" },
    ]);
  });

  it("muestra «Ninguna» si todavía no hay migraciones", () => {
    const filas = describirEstadoBase({
      disponible: true,
      entorno: null,
      migraciones: 0,
      ultimaMigracion: null,
      tablas: 0,
    });
    expect(filas[1]).toEqual({ etiqueta: "Migraciones aplicadas", valor: "Ninguna" });
  });
});

describe("describirVersionPublicada", () => {
  it("indica que no hay versión publicada en CI", () => {
    expect(describirVersionPublicada(null)).toEqual([{ etiqueta: "Versión publicada", valor: "Ninguna en este build" }]);
  });

  it("muestra el número y las fechas en hora peninsular", () => {
    const [publicada, leida] = describirVersionPublicada({
      numero: 1,
      publicadaEn: "2026-10-09T16:05:00.000Z",
      leidaEn: "2026-10-09T16:06:30.000Z",
    });
    expect(publicada?.valor).toMatch(/^nº 1 · 9 de octubre de 2026/);
    expect(publicada?.valor).toContain("18:05");
    expect(leida).toMatchObject({ etiqueta: "Snapshot leído de Neon" });
    expect(leida?.valor).toContain("18:06:30");
  });
});

describe("formatearFechaHora", () => {
  it("usa la hora de Madrid también en invierno", () => {
    expect(formatearFechaHora("2027-01-15T10:00:00.000Z")).toContain("11:00");
  });
});
