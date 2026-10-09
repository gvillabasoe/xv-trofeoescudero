import { describe, expect, it } from "vitest";
import { enlaceCanal, enlaceProponer, formatearFechaLarga, tipoDesdeParametro } from "@/lib/etiquetas";
import {
  MENSAJES_ERROR,
  SEGUNDOS_MINIMOS,
  describirOrigen,
  origenDesdeParametros,
  pareceAutomatico,
  resumenErrores,
  validarPropuesta,
} from "@/lib/proponer";
import { limpiarReferrer } from "@/server/propuestas/crear";

function formulario(campos: Record<string, string>): FormData {
  const datos = new FormData();
  for (const [nombre, valor] of Object.entries(campos)) datos.set(nombre, valor);
  return datos;
}

const VALIDA = {
  nombre: "Persona de Prueba",
  empresa: "Marca de prueba",
  cargo: "",
  email: "persona@example.com",
  telefono: "+34 600 000 000",
  tipo: "PREMIO_CONCURSO",
  mensaje: "Queremos aportar un premio para la bola más cercana.",
  privacidad: "si",
};

describe("validación de /proponer (§6)", () => {
  it("acepta una propuesta completa y normaliza los opcionales vacíos a null", () => {
    const resultado = validarPropuesta(formulario(VALIDA));
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.datos).toMatchObject({ cargo: null, telefono: "+34 600 000 000", tipo: "PREMIO_CONCURSO" });
  });

  it("devuelve los textos aprobados para cada campo", () => {
    const resultado = validarPropuesta(formulario({ ...VALIDA, nombre: " ", email: "nombre@", tipo: "", mensaje: "corto", privacidad: "" }));
    expect(resultado).toEqual({
      ok: false,
      errores: {
        nombre: MENSAJES_ERROR.nombre,
        email: MENSAJES_ERROR.email,
        tipo: MENSAJES_ERROR.tipo,
        mensaje: MENSAJES_ERROR.mensaje,
        privacidad: MENSAJES_ERROR.privacidad,
      },
    });
    expect(MENSAJES_ERROR.tipo).toBe("Elige una opción. «Otra propuesta» también vale.");
  });

  it("rechaza teléfonos con letras y tipos inventados", () => {
    const resultado = validarPropuesta(formulario({ ...VALIDA, telefono: "llámame", tipo: "PROSPECCION" }));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(Object.keys(resultado.errores).sort()).toEqual(["telefono", "tipo"]);
  });

  it("resume los errores en singular y en plural", () => {
    expect(resumenErrores(1)).toBe("Hay 1 campo por revisar.");
    expect(resumenErrores(3)).toBe("Hay 3 campos por revisar.");
  });
});

describe("antispam sin servicios externos", () => {
  it("el campo trampa relleno delata a un robot", () => {
    expect(pareceAutomatico(formulario({ sitio_web: "https://spam.example" }))).toBe(true);
  });

  it("un envío demasiado rápido es sospechoso; sin JavaScript (sin marca de tiempo) se acepta", () => {
    const ahora = 1_000_000;
    expect(pareceAutomatico(formulario({ inicio: String(ahora - 500) }), ahora)).toBe(true);
    expect(pareceAutomatico(formulario({ inicio: String(ahora - SEGUNDOS_MINIMOS * 1000 - 1) }), ahora)).toBe(false);
    expect(pareceAutomatico(formulario({}), ahora)).toBe(false);
  });
});

describe("preselección y origen", () => {
  it("traduce ?tipo=, ?via= y ?hoyo= y descarta valores no válidos", () => {
    expect(origenDesdeParametros(new URLSearchParams("tipo=premio&via=juego&hoyo=12"))).toEqual({
      tipo: "PREMIO_CONCURSO",
      via: "JUEGO",
      hoyo: 12,
    });
    expect(origenDesdeParametros(new URLSearchParams("tipo=nada&via=x&hoyo=19"))).toEqual({ tipo: null, via: null, hoyo: null });
    expect(tipoDesdeParametro("PRINCIPAL")).toBe("PATROCINADOR_PRINCIPAL_POLO");
  });

  it("genera los enlaces de las vías (§2.4) y describe el origen para la bandeja", () => {
    expect(enlaceProponer({ tipo: "PATROCINADOR_PRINCIPAL_POLO", via: "PECHO" })).toBe("/proponer?tipo=principal&via=pecho");
    expect(enlaceProponer()).toBe("/proponer");
    expect(describirOrigen({ tipo: "WELCOME_PACK", via: "BOLSA", hoyo: null })).toBe("/proponer · tipo=WELCOME_PACK · via=BOLSA");
  });

  it("el referrer se guarda solo como origen, sin ruta ni parámetros", () => {
    expect(limpiarReferrer("https://www.example.com/ruta?correo=x@example.com")).toBe("https://www.example.com");
    expect(limpiarReferrer("javascript:alert(1)")).toBeNull();
    expect(limpiarReferrer("no es una url")).toBeNull();
  });
});

describe("textos de interfaz", () => {
  it("formatea la fecha del torneo sin depender de la zona horaria", () => {
    expect(formatearFechaLarga("2027-08-03")).toBe("3 de agosto de 2027");
  });

  it("genera el enlace estándar de cada canal activo", () => {
    expect(enlaceCanal({ tipo: "EMAIL", valor: "hola@example.com", url: null })).toBe("mailto:hola@example.com");
    expect(enlaceCanal({ tipo: "TELEFONO", valor: "+34 600 00 00 00", url: null })).toBe("tel:+34600000000");
    expect(enlaceCanal({ tipo: "WHATSAPP", valor: "+34 600 00 00 00", url: null })).toBe("https://wa.me/34600000000");
    expect(enlaceCanal({ tipo: "INSTAGRAM", valor: "cuenta", url: null })).toBeNull();
  });
});
