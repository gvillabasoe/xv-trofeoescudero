import { describe, expect, it } from "vitest";
import { describirEstadoBase, describirMarcador } from "../../src/lib/estado-base";

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
