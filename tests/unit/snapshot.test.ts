import { describe, expect, it } from "vitest";
import {
  ErrorPublicacion,
  esPatrocinadorPublicable,
  prepararSnapshot,
  type Borrador,
} from "@/lib/snapshot/construir";
import { hashContenido, jsonCanonico } from "@/lib/snapshot/hash";

type Patrocinador = Borrador["patrocinadores"][number];

function patrocinador(cambios: Partial<Patrocinador> = {}): Patrocinador {
  return {
    name: "Marca Visible",
    slug: "marca-visible",
    confirmed: true,
    publicVisibility: true,
    lifecycle: "ACTIVO",
    legalReview: "NO_REQUERIDA",
    url: null,
    shortDescription: null,
    category: "Sin categoría",
    ...cambios,
  };
}

/** Borrador mínimo con, a propósito, datos privados que nunca deben llegar al snapshot. */
function borrador(): Borrador {
  return {
    sitio: {
      siteName: "Trofeo Escudero",
      editionLabel: "XV Edición",
      editionNumber: 15,
      eventDate: "2027-08-03",
      venueName: "Golf El Rompido",
      location: "El Rompido",
      afterPartyName: "Luz de Mar El Rompido",
      seoTitle: "Título SEO",
      seoDescription: "Descripción SEO",
    },
    contacto: [
      { type: "EMAIL", label: "Email", value: "activo@example.com", url: null, isActive: true, showInClosing: true, showInFooter: false },
      { type: "TELEFONO", label: "Teléfono", value: "000 000 000", url: null, isActive: false, showInClosing: true, showInFooter: true },
    ],
    bloques: [
      { key: "HERO", indexLabel: "01", isVisible: true },
      { key: "FAMILIA", indexLabel: "02", isVisible: true },
      { key: "EL_DIA", indexLabel: "03", isVisible: false },
      { key: "COLABORAR", indexLabel: "04", isVisible: true },
      { key: "CIERRE", indexLabel: "05", isVisible: true },
    ],
    hero: {
      eyebrow: "Antetítulo",
      titleLine1: "Línea 1",
      titleLine2: null,
      lead: "Entradilla",
      primaryCtaLabel: "Ver",
      secondaryCtaLabel: "Proponer",
      brandCardTitle: "Tarjeta",
      brandCardText: "Texto de la tarjeta",
      brandCardLinkLabel: "Enlace",
      figures: [
        { label: "Años", value: "15", caption: null, isVisible: true, internalSource: "FUENTE-PRIVADA" },
        { label: "Oculta", value: "0", caption: null, isVisible: false, internalSource: null },
      ],
    },
    familia: {
      title: "La familia",
      secondGenerationLabel: "Segunda",
      secondGenerationText: "Texto segunda",
      thirdGenerationLabel: "Tercera",
      thirdGenerationText: "Texto tercera",
      thirdGenerationCaption: null,
      members: [
        { name: "Visible", generation: "PRIMERA", text: "Texto", caption: null, ageManual: null, isVisible: true },
        { name: "Oculto", generation: "PRIMERA", text: "Texto", caption: null, ageManual: 50, isVisible: false },
      ],
    },
    dia: {
      title: "El día",
      lead: "Entradilla",
      northLabel: "Norte",
      northTitle: "Norte",
      northText: "Norte",
      northHighlight: null,
      northBridge: null,
      southLabel: "Sur",
      southTitle: "Sur",
      southText: "Sur",
      afterLabel: "Después",
      afterTitle: "Después",
      afterText: "Después",
      steps: [],
    },
    colaborar: {
      titleLine1: "Colaborar",
      titleLine2: null,
      lead: "Entradilla",
      closingLine: null,
      holesLabel: "Concursos",
      holesTitle: "Hoyos",
      holesLead: "Entradilla",
      holesModelsText: null,
      holesNamingText: null,
      holesCtaLabel: "Proponer un premio",
      allHolesTitle: "18 hoyos",
      allHolesText: "Texto",
      transparencyNote: "Nota de transparencia",
    },
    cierre: {
      historyTitle: "Historial",
      historyText: "Texto",
      wallLabel: "Muro",
      charityTitle: "Solidaria",
      charityText: "Texto",
      charityVisible: false,
      closingTitleLine1: "Cierre",
      closingTitleLine2: null,
      closingText: "Texto",
      closingMicrocopy: null,
      closingCtaLabel: "Proponer",
    },
    vias: [
      {
        key: "JUEGO",
        number: 3,
        title: "En juego",
        subtitle: "Concursos y premios",
        cardCopy: "Texto",
        ctaLabel: "Poner algo en juego",
        formType: "PREMIO_CONCURSO",
        isVisible: true,
        items: [{ kind: "NECESITAMOS", text: "Un premio" }],
        opportunities: [
          {
            key: "estado-privado",
            name: "Estado privado",
            publicDescription: null,
            availability: "RESERVADO",
            showStatusPublicly: false,
            internalNotes: "NOTA-INTERNA",
            isVisible: true,
            holeNumber: 4,
          },
          {
            key: "estado-publico",
            name: "Estado público",
            publicDescription: null,
            availability: "CERRADO",
            showStatusPublicly: true,
            internalNotes: null,
            isVisible: true,
            holeNumber: null,
          },
          {
            key: "oculta",
            name: "Oculta",
            publicDescription: null,
            availability: "DISPONIBLE",
            showStatusPublicly: true,
            internalNotes: null,
            isVisible: false,
            holeNumber: null,
          },
        ],
      },
      {
        key: "DESPUES",
        number: 4,
        title: "Oculta",
        subtitle: "Oculta",
        cardCopy: "Oculta",
        ctaLabel: "Oculta",
        formType: "SORTEO_EXPERIENCIA",
        isVisible: false,
        items: [],
        opportunities: [],
      },
    ],
    hoyos: [
      { number: 1, contestType: null, par: null, course: null, showCourse: false, isContestVisible: true },
      { number: 3, contestType: "BOLA_MAS_CERCANA", par: 3, course: "NORTE", showCourse: false, isContestVisible: true },
      { number: 4, contestType: "DRIVE_MAS_LARGO", par: null, course: "SUR", showCourse: true, isContestVisible: true },
      { number: 6, contestType: "BOLA_MAS_CERCANA", par: 3, course: null, showCourse: false, isContestVisible: false },
    ],
    patrocinadores: [
      patrocinador(),
      patrocinador({ name: "Aprobada", slug: "aprobada", legalReview: "APROBADA" }),
      patrocinador({ name: "Revisión pendiente", slug: "pendiente", legalReview: "PENDIENTE", publicVisibility: false }),
      patrocinador({ name: "Rechazada", slug: "rechazada", legalReview: "RECHAZADA" }),
      patrocinador({ name: "No confirmada", slug: "no-confirmada", confirmed: false }),
      patrocinador({ name: "Archivada", slug: "archivada", lifecycle: "ARCHIVADO" }),
      patrocinador({ name: "Oculta", slug: "oculta", publicVisibility: false }),
    ],
  };
}

describe("esPatrocinadorPublicable", () => {
  it("exige confirmado, visible, activo y revisión jurídica no requerida o aprobada", () => {
    expect(esPatrocinadorPublicable(patrocinador())).toBe(true);
    expect(esPatrocinadorPublicable(patrocinador({ legalReview: "APROBADA" }))).toBe(true);
    expect(esPatrocinadorPublicable(patrocinador({ legalReview: "PENDIENTE" }))).toBe(false);
    expect(esPatrocinadorPublicable(patrocinador({ legalReview: "RECHAZADA" }))).toBe(false);
    expect(esPatrocinadorPublicable(patrocinador({ confirmed: false }))).toBe(false);
    expect(esPatrocinadorPublicable(patrocinador({ publicVisibility: false }))).toBe(false);
    expect(esPatrocinadorPublicable(patrocinador({ lifecycle: "ARCHIVADO" }))).toBe(false);
  });
});

describe("prepararSnapshot", () => {
  const snapshot = prepararSnapshot(borrador());
  const json = JSON.stringify(snapshot);

  it("solo publica las marcas que cumplen la regla", () => {
    expect(snapshot.cierre?.historial.marcas.map((marca) => marca.slug)).toEqual(["marca-visible", "aprobada"]);
  });

  it("nunca incluye datos privados", () => {
    expect(json).not.toContain("FUENTE-PRIVADA");
    expect(json).not.toContain("NOTA-INTERNA");
    expect(json).not.toContain("RESERVADO");
    expect(json).not.toContain("000 000 000");
  });

  it("publica el estado comercial solo con su interruptor", () => {
    const oportunidades = snapshot.colaborar.vias[0]?.oportunidades ?? [];
    expect(oportunidades).toEqual([
      { clave: "estado-privado", nombre: "Estado privado", descripcion: null, estado: null, hoyo: 4 },
      { clave: "estado-publico", nombre: "Estado público", descripcion: null, estado: "CERRADO", hoyo: null },
    ]);
  });

  it("publica el campo del hoyo solo con su interruptor y omite los concursos ocultos", () => {
    expect(snapshot.colaborar.concursos.hoyos).toEqual([
      { numero: 3, concurso: "BOLA_MAS_CERCANA", par: 3, campo: null },
      { numero: 4, concurso: "DRIVE_MAS_LARGO", par: null, campo: "SUR" },
    ]);
  });

  it("omite lo oculto: bloques, cifras, miembros, vías, canales y la colaboración solidaria", () => {
    expect(snapshot.dia).toBeNull();
    expect(snapshot.hero.cifras).toHaveLength(1);
    expect(snapshot.familia?.miembros.map((miembro) => miembro.nombre)).toEqual(["Visible"]);
    expect(snapshot.colaborar.vias.map((via) => via.clave)).toEqual(["JUEGO"]);
    expect(snapshot.contacto.map((canal) => canal.tipo)).toEqual(["EMAIL"]);
    expect(snapshot.cierre?.solidaria).toBeNull();
  });

  it("falla con motivos claros si falta un bloque imprescindible", () => {
    const sinHero = { ...borrador(), hero: null };
    expect(() => prepararSnapshot(sinHero)).toThrow(ErrorPublicacion);
    expect(() => prepararSnapshot(sinHero)).toThrow(/falta el bloque Hero/);
  });

  it("falla si un texto obligatorio está vacío", () => {
    const base = borrador();
    const sinNota = { ...base, colaborar: base.colaborar && { ...base.colaborar, transparencyNote: "   " } };
    expect(() => prepararSnapshot(sinNota)).toThrow(/colaborar\.notaTransparencia/);
  });
});

describe("hash del contenido", () => {
  it("no depende del orden de las claves", () => {
    expect(jsonCanonico({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
    expect(hashContenido({ b: 1, a: 2 })).toBe(hashContenido({ a: 2, b: 1 }));
  });

  it("cambia si cambia el contenido o el orden de una lista", () => {
    expect(hashContenido({ a: [1, 2] })).not.toBe(hashContenido({ a: [2, 1] }));
    expect(hashContenido({ a: "x" })).not.toBe(hashContenido({ a: "y" }));
  });

  it("es estable entre publicaciones del mismo borrador", () => {
    expect(hashContenido(prepararSnapshot(borrador()))).toBe(hashContenido(prepararSnapshot(borrador())));
  });
});
