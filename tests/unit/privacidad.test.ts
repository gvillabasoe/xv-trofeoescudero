import { describe, expect, it } from "vitest";
import { buscarDatosPrivados } from "@/lib/snapshot/privacidad";

describe("buscarDatosPrivados (inspección recursiva)", () => {
  it("no encuentra nada en un objeto público", () => {
    expect(buscarDatosPrivados({ titulo: "Hoyo 12", lista: [{ nombre: "Marca", hoyo: 12 }] })).toEqual([]);
  });

  it("detecta nombres de propiedad prohibidos a cualquier profundidad y sin importar mayúsculas", () => {
    const hallazgos = buscarDatosPrivados({
      a: { b: [{ internalNotes: "x" }] },
      Email: "x",
      legalreview: "PENDIENTE",
      vias: [{ oportunidades: [{ availability: "RESERVADO" }] }],
    });
    expect(hallazgos.map((h) => h.ruta)).toEqual([
      "a.b.0.internalNotes",
      "Email",
      "legalreview",
      "vias.0.oportunidades.0.availability",
    ]);
  });

  it("detecta emails y teléfonos dentro de textos", () => {
    const hallazgos = buscarDatosPrivados({ texto: "Escribe a alguien@empresa.es", otro: ["Llama al 600 123 456"] });
    expect(hallazgos).toEqual([
      { ruta: "texto", motivo: "contiene un email" },
      { ruta: "otro.0", motivo: "contiene un teléfono" },
    ]);
  });

  it("admite email y teléfono solo en los canales de contacto activos", () => {
    expect(
      buscarDatosPrivados({ contacto: [{ tipo: "EMAIL", valor: "hola@trofeo.example", url: "mailto:hola@trofeo.example" }] }),
    ).toEqual([]);
    expect(buscarDatosPrivados({ contacto: [{ etiqueta: "hola@trofeo.example" }] })).toHaveLength(1);
  });

  it("detecta «[PENDIENTE]» y textos prohibidos", () => {
    const hallazgos = buscarDatosPrivados(
      { a: "Texto [PENDIENTE]", b: ["Patrocinado por Castillo de Cuzcurrita"] },
      { textosProhibidos: ["Castillo de Cuzcurrita"] },
    );
    expect(hallazgos.map((h) => h.ruta)).toEqual(["a", "b.0"]);
  });

  it("no confunde años, fechas ni cifras del torneo con teléfonos", () => {
    expect(
      buscarDatosPrivados({ a: "Nacidos entre 1999 y 2009.", fecha: "2027-08-03", b: "Hoyos 3, 6, 12 y 16", c: "~220" }),
    ).toEqual([]);
  });
});
