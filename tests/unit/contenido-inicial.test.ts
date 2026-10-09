import { describe, expect, it } from "vitest";
import { prepararSnapshot } from "@/lib/snapshot/construir";
import { buscarDatosPrivados } from "@/lib/snapshot/privacidad";
import { borradorInicial } from "@/server/semilla/borrador-inicial";
import { checksumContenidoInicial } from "@/server/semilla/bootstrap";
import { ENTIDADES_HISTORICAS, NOMBRES_ENTIDADES_V3 } from "@/server/semilla/datos";

const snapshot = prepararSnapshot(borradorInicial());
const json = JSON.stringify(snapshot);

describe("contenido inicial publicado", () => {
  it("recoge los datos del torneo", () => {
    expect(snapshot.sitio).toMatchObject({ edicion: "XV Edición", numeroEdicion: 15, fecha: "2027-08-03" });
    const cifras = new Map(snapshot.hero.cifras.map((cifra) => [cifra.etiqueta, cifra.valor]));
    expect(cifras.get("Participantes")).toBe("~220");
    expect(cifras.get("3ª Generación")).toBe("80");
    expect(snapshot.colaborar.notaTransparencia).toBe(
      "Sin promesas infladas: no vendemos cifras que no podamos demostrar ni datos de participantes. Cualquier activación dentro del campo se acuerda primero con el club.",
    );
  });

  it("respeta las reglas de copy: nunca «Junior», «Senior», «fundador» ni «[PENDIENTE]»", () => {
    expect(json).not.toMatch(/junior/i);
    expect(json).not.toMatch(/senior/i);
    expect(json).not.toMatch(/fundador/i);
    expect(json).not.toMatch(/\[\s*pendiente\s*\]/i);
  });

  it("no publica la edad de Nacho ni el campo de los concursos sin confirmar", () => {
    expect(snapshot.familia?.miembros.every((miembro) => miembro.edad === null)).toBe(true);
    expect(snapshot.colaborar.concursos.hoyos.map((hoyo) => hoyo.numero)).toEqual([3, 4, 6, 12, 16]);
    expect(snapshot.colaborar.concursos.hoyos.every((hoyo) => hoyo.campo === null)).toBe(true);
  });

  it("supera la inspección recursiva de privacidad", () => {
    expect(buscarDatosPrivados(snapshot, { textosProhibidos: ["Castillo de Cuzcurrita", "Cuzcurrita"] })).toEqual([]);
  });

  it("no publica estados comerciales privados", () => {
    const estados = snapshot.colaborar.vias.flatMap((via) => via.oportunidades.map((oportunidad) => oportunidad.estado));
    expect(estados.every((estado) => estado === null)).toBe(true);
  });

  it("solo publica entidades históricas de la v3 (lista cerrada: nada de prospección)", () => {
    const permitidas = new Set<string>(NOMBRES_ENTIDADES_V3.map(([nombre]) => nombre));
    const marcas = snapshot.cierre?.historial.marcas.map((marca) => marca.nombre) ?? [];
    expect(marcas).toHaveLength(17);
    expect(marcas.every((marca) => permitidas.has(marca))).toBe(true);
    expect(marcas).not.toContain("Castillo de Cuzcurrita");
  });

  it("la clasificación de la Entrega 3 produce el mismo contenido salvo las categorías", () => {
    const anterior = prepararSnapshot(borradorInicial("entrega-3"));
    expect({ ...anterior, cierre: null }).toEqual({ ...snapshot, cierre: null });
    expect(anterior.cierre?.historial.marcas.every((marca) => marca.categoria === "Sin categoría")).toBe(true);
  });
});

describe("entidades históricas", () => {
  it("son 18: las 17 de la v3 y Castillo de Cuzcurrita, oculto y con revisión jurídica pendiente", () => {
    expect(ENTIDADES_HISTORICAS).toHaveLength(18);
    expect(ENTIDADES_HISTORICAS.find((entidad) => entidad.slug === "castillo-de-cuzcurrita")).toMatchObject({
      relationshipType: "PATROCINADOR",
      source: "ORGANIZACION",
      categorySlug: "bodega-vino",
      publicVisibility: false,
      legalReview: "PENDIENTE",
    });
  });

  it("no inventan una relación más concreta que la de la fuente", () => {
    const concretas = new Set(["castillo-de-cuzcurrita", "dalecandela"]);
    expect(
      ENTIDADES_HISTORICAS.filter((entidad) => !concretas.has(entidad.slug)).every(
        (entidad) => entidad.relationshipType === "PATROCINADOR_O_COLABORADOR",
      ),
    ).toBe(true);
  });
});

describe("checksum de initial-content-v1", () => {
  it("es un SHA-256 estable", () => {
    expect(checksumContenidoInicial()).toMatch(/^[0-9a-f]{64}$/);
    expect(checksumContenidoInicial()).toBe(checksumContenidoInicial());
  });
});
