import { describe, expect, it } from "vitest";
import { generarCsv, celdaSegura } from "@/lib/csv";
import { analizarMarkdown, enlaceSeguro } from "@/lib/markdown";
import { MENSAJES_CAMPO, aSlug, leerCampos, valorParaFormulario, valoresDe, type Campo } from "@/lib/panel/campos";
import { REGISTRO } from "@/server/panel/registro";

function formulario(campos: Record<string, string>): FormData {
  const datos = new FormData();
  for (const [nombre, valor] of Object.entries(campos)) datos.set(nombre, valor);
  return datos;
}

describe("formularios del CMS", () => {
  const campos: Campo[] = [
    { nombre: "titulo", etiqueta: "Título", tipo: "texto", max: 10 },
    { nombre: "nota", etiqueta: "Nota", tipo: "area", opcional: true },
    { nombre: "par", etiqueta: "Par", tipo: "numero", opcional: true, min: 3, max: 6 },
    { nombre: "visible", etiqueta: "Visible", tipo: "casilla" },
    { nombre: "campo", etiqueta: "Campo", tipo: "seleccion", opciones: [{ valor: "NORTE", etiqueta: "Norte" }] },
    { nombre: "fecha", etiqueta: "Fecha", tipo: "fecha" },
    { nombre: "web", etiqueta: "Web", tipo: "url", opcional: true },
    { nombre: "fijo", etiqueta: "Fijo", tipo: "texto", soloLectura: true },
  ];

  it("lee y normaliza los valores válidos", () => {
    const lectura = leerCampos(
      campos,
      formulario({ titulo: "  Hola ", nota: "", par: "3", visible: "si", campo: "NORTE", fecha: "2027-08-03", web: "", fijo: "x" }),
    );
    expect(lectura).toEqual({
      ok: true,
      datos: {
        titulo: "Hola",
        nota: null,
        par: 3,
        visible: true,
        campo: "NORTE",
        fecha: new Date("2027-08-03T00:00:00.000Z"),
        web: null,
      },
    });
  });

  it("explica cada error con un texto claro", () => {
    const lectura = leerCampos(
      campos,
      formulario({ titulo: "demasiado largo", par: "9", campo: "SUR", fecha: "2027-02-30", web: "http://inseguro.example" }),
    );
    expect(lectura).toEqual({
      ok: false,
      errores: {
        titulo: MENSAJES_CAMPO.largo(10),
        par: MENSAJES_CAMPO.maximo(6),
        campo: MENSAJES_CAMPO.opcion,
        fecha: MENSAJES_CAMPO.fecha,
        web: MENSAJES_CAMPO.url,
      },
    });
  });

  it("solo envía al navegador los campos del formulario", () => {
    const fila = { id: "x", title: "Título", internalNotes: "privado", eventDate: new Date("2027-08-03T00:00:00.000Z"), lista: [1] };
    expect(valoresDe(fila, [{ nombre: "title", etiqueta: "", tipo: "texto" }, { nombre: "eventDate", etiqueta: "", tipo: "fecha" }])).toEqual({
      title: "Título",
      eventDate: new Date("2027-08-03T00:00:00.000Z"),
    });
    expect(valorParaFormulario(new Date("2027-08-03T00:00:00.000Z"))).toBe("2027-08-03");
    expect(valorParaFormulario(null)).toBe("");
  });

  it("genera identificadores legibles", () => {
    expect(aSlug("Julius Bär")).toBe("julius-bar");
    expect(aSlug("¡HOLA!")).toBe("hola");
    expect(aSlug("Oceánico El Rompido")).toBe("oceanico-el-rompido");
  });
});

describe("registro del CMS", () => {
  it("los datos internos están marcados como privados y nunca entran en el snapshot", () => {
    const privados = (clave: keyof typeof REGISTRO) =>
      (REGISTRO[clave].campos as Campo[]).filter((campo) => campo.privado).map((campo) => campo.nombre);
    expect(privados("cifra")).toEqual(["internalSource"]);
    expect(privados("oportunidad")).toEqual(["availability", "internalNotes"]);
    expect(privados("patrocinador")).toEqual(["source", "sourceNote", "logoPermission", "legalReview"]);
  });

  it("los bloques obligatorios no se pueden ocultar", async () => {
    const validar = REGISTRO.bloque.validar;
    const contexto = { tx: {} as never };
    expect(await validar({ isVisible: false }, { ...contexto, actual: { key: "HERO" } })).toHaveProperty("isVisible");
    expect(await validar({ isVisible: false }, { ...contexto, actual: { key: "FAMILIA" } })).toEqual({});
  });

  it("los canales validan el dato según su tipo", async () => {
    const validar = REGISTRO.canal.validar;
    expect(await validar({ type: "EMAIL", value: "no-es-un-email", url: null })).toHaveProperty("value");
    expect(await validar({ type: "WHATSAPP", value: "+34 600 000 000", url: null })).toEqual({});
    expect(await validar({ type: "INSTAGRAM", value: "cuenta", url: null })).toHaveProperty("url");
  });

  it("el campo de un hoyo no se muestra sin confirmar cuál es", async () => {
    expect(await REGISTRO.hoyo.validar({ showCourse: true, course: null })).toHaveProperty("course");
    expect(await REGISTRO.hoyo.validar({ showCourse: true, course: "NORTE" })).toEqual({});
  });
});

describe("CSV", () => {
  it("neutraliza fórmulas y escapa separadores y comillas", () => {
    expect(celdaSegura("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(celdaSegura("+34 600")).toBe("'+34 600");
    expect(celdaSegura("-1")).toBe("'-1");
    expect(celdaSegura("@cuenta")).toBe("'@cuenta");
    expect(celdaSegura("a;b")).toBe('"a;b"');
    expect(celdaSegura(null)).toBe("");
  });

  it("lleva BOM, separador «;» y fin de línea CRLF", () => {
    const csv = generarCsv(["A", "B"], [["1", "dos\nlíneas"]]);
    expect(csv.startsWith("﻿A;B\r\n")).toBe(true);
    expect(csv).toContain('1;"dos\nlíneas"\r\n');
  });
});

describe("markdown de los textos legales", () => {
  it("convierte títulos, listas, negrita y enlaces seguros", () => {
    const bloques = analizarMarkdown("## Responsable\nTexto con **negrita**.\n\n- Uno\n- Dos\n\n1. Primero\n\n[web](https://example.com)");
    expect(bloques.map((bloque) => bloque.tipo)).toEqual(["h2", "p", "ul", "ol", "p"]);
    expect(bloques[1]).toEqual({
      tipo: "p",
      contenido: [
        { tipo: "texto", texto: "Texto con " },
        { tipo: "negrita", texto: "negrita" },
        { tipo: "texto", texto: "." },
      ],
    });
    expect(bloques[4]).toEqual({ tipo: "p", contenido: [{ tipo: "enlace", texto: "web", href: "https://example.com" }] });
  });

  it("nunca genera enlaces peligrosos ni HTML", () => {
    expect(enlaceSeguro("javascript:alert(1)")).toBe(false);
    expect(enlaceSeguro("mailto:hola@example.com")).toBe(true);
    const [bloque] = analizarMarkdown("[pulsa](javascript:alert(1)) <script>alert(1)</script>");
    expect(JSON.stringify(bloque)).not.toContain('"enlace"');
    expect(bloque).toMatchObject({ tipo: "p" });
  });
});
