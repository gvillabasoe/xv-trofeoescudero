import {
  CAMPOS,
  CLAVES_VIA,
  DISPONIBILIDADES,
  GENERACIONES,
  TIPOS_COLABORACION,
  TIPOS_CONCURSO,
  TIPOS_CONTACTO,
  TIPOS_ELEMENTO_VIA,
  VERSION_ESQUEMA_SNAPSHOT,
  esquemaSnapshot,
  type SnapshotPublico,
} from "./esquema";

/**
 * Del borrador editable (tablas relacionales) al snapshot público (fase-2 §8).
 * Funciones puras: aquí se aplican las reglas de publicación y privacidad.
 */

type Uno<T extends readonly string[]> = T[number];
type ClaveBloque = "HERO" | "FAMILIA" | "EL_DIA" | "COLABORAR" | "CIERRE";

/** Lo que se lee de la base para publicar. Los campos privados se incluyen a propósito para poder excluirlos. */
export interface Borrador {
  sitio: {
    siteName: string;
    editionLabel: string;
    editionNumber: number;
    eventDate: string;
    venueName: string;
    location: string;
    afterPartyName: string | null;
    seoTitle: string;
    seoDescription: string;
  } | null;
  contacto: Array<{
    type: Uno<typeof TIPOS_CONTACTO>;
    label: string;
    value: string;
    url: string | null;
    isActive: boolean;
    showInClosing: boolean;
    showInFooter: boolean;
  }>;
  bloques: Array<{ key: ClaveBloque; indexLabel: string; isVisible: boolean }>;
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string | null;
    lead: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
    brandCardTitle: string;
    brandCardText: string;
    brandCardLinkLabel: string;
    figures: Array<{
      label: string;
      value: string;
      caption: string | null;
      isVisible: boolean;
      internalSource: string | null;
    }>;
  } | null;
  familia: {
    title: string;
    secondGenerationLabel: string;
    secondGenerationText: string;
    thirdGenerationLabel: string;
    thirdGenerationText: string;
    thirdGenerationCaption: string | null;
    members: Array<{
      name: string;
      generation: Uno<typeof GENERACIONES>;
      text: string;
      caption: string | null;
      ageManual: number | null;
      isVisible: boolean;
    }>;
  } | null;
  dia: {
    title: string;
    lead: string;
    northLabel: string;
    northTitle: string;
    northText: string;
    northHighlight: string | null;
    northBridge: string | null;
    southLabel: string;
    southTitle: string;
    southText: string;
    afterLabel: string;
    afterTitle: string;
    afterText: string;
    steps: Array<{ label: string; time: string | null; isVisible: boolean }>;
  } | null;
  colaborar: {
    titleLine1: string;
    titleLine2: string | null;
    lead: string;
    closingLine: string | null;
    holesLabel: string;
    holesTitle: string;
    holesLead: string;
    holesModelsText: string | null;
    holesNamingText: string | null;
    holesCtaLabel: string;
    allHolesTitle: string;
    allHolesText: string;
    transparencyNote: string;
  } | null;
  cierre: {
    historyTitle: string;
    historyText: string;
    wallLabel: string;
    charityTitle: string;
    charityText: string;
    charityVisible: boolean;
    closingTitleLine1: string;
    closingTitleLine2: string | null;
    closingText: string;
    closingMicrocopy: string | null;
    closingCtaLabel: string;
  } | null;
  vias: Array<{
    key: Uno<typeof CLAVES_VIA>;
    number: number;
    title: string;
    subtitle: string;
    cardCopy: string;
    ctaLabel: string;
    formType: Uno<typeof TIPOS_COLABORACION>;
    isVisible: boolean;
    items: Array<{ kind: Uno<typeof TIPOS_ELEMENTO_VIA>; text: string }>;
    opportunities: Array<{
      key: string;
      name: string;
      publicDescription: string | null;
      availability: Uno<typeof DISPONIBILIDADES>;
      showStatusPublicly: boolean;
      internalNotes: string | null;
      isVisible: boolean;
      holeNumber: number | null;
    }>;
  }>;
  hoyos: Array<{
    number: number;
    contestType: Uno<typeof TIPOS_CONCURSO> | null;
    par: number | null;
    course: Uno<typeof CAMPOS> | null;
    showCourse: boolean;
    isContestVisible: boolean;
  }>;
  patrocinadores: Array<{
    name: string;
    slug: string;
    confirmed: boolean;
    publicVisibility: boolean;
    lifecycle: "ACTIVO" | "ARCHIVADO";
    legalReview: "NO_REQUERIDA" | "PENDIENTE" | "APROBADA" | "RECHAZADA";
    url: string | null;
    shortDescription: string | null;
    category: string;
  }>;
}

/** El borrador no se puede publicar; `motivos` explica por qué, en lenguaje claro. */
export class ErrorPublicacion extends Error {
  readonly motivos: string[];

  constructor(motivos: string[]) {
    super(`No se puede publicar: ${motivos.join(" · ")}`);
    this.name = "ErrorPublicacion";
    this.motivos = motivos;
  }
}

/** Regla de publicación de patrocinadores (fase-2 §6): confirmado, visible, activo y sin bloqueo jurídico. */
export function esPatrocinadorPublicable(patrocinador: Borrador["patrocinadores"][number]): boolean {
  return (
    patrocinador.confirmed &&
    patrocinador.publicVisibility &&
    patrocinador.lifecycle === "ACTIVO" &&
    (patrocinador.legalReview === "NO_REQUERIDA" || patrocinador.legalReview === "APROBADA")
  );
}

function bloque(borrador: Borrador, clave: ClaveBloque) {
  return borrador.bloques.find((seccion) => seccion.key === clave) ?? null;
}

/** Construye el objeto público, sin validar. Lanza ErrorPublicacion si falta algo imprescindible. */
export function construirSnapshot(borrador: Borrador): SnapshotPublico {
  const motivos: string[] = [];
  const { sitio, hero, colaborar } = borrador;
  const bloqueHero = bloque(borrador, "HERO");
  const bloqueColaborar = bloque(borrador, "COLABORAR");

  if (!sitio) motivos.push("falta la configuración general del sitio");
  if (!bloqueHero || !hero) motivos.push("falta el bloque Hero");
  if (!bloqueColaborar || !colaborar) motivos.push("falta el bloque Colaborar");
  if (!sitio || !bloqueHero || !hero || !bloqueColaborar || !colaborar) {
    throw new ErrorPublicacion(motivos);
  }

  const bloqueFamilia = bloque(borrador, "FAMILIA");
  const bloqueDia = bloque(borrador, "EL_DIA");
  const bloqueCierre = bloque(borrador, "CIERRE");
  const { familia, dia, cierre } = borrador;

  return {
    version: VERSION_ESQUEMA_SNAPSHOT,
    sitio: {
      nombre: sitio.siteName,
      edicion: sitio.editionLabel,
      numeroEdicion: sitio.editionNumber,
      fecha: sitio.eventDate,
      sede: sitio.venueName,
      localidad: sitio.location,
      afterParty: sitio.afterPartyName,
      seo: { titulo: sitio.seoTitle, descripcion: sitio.seoDescription },
    },
    contacto: borrador.contacto
      .filter((canal) => canal.isActive)
      .map((canal) => ({
        tipo: canal.type,
        etiqueta: canal.label,
        valor: canal.value,
        url: canal.url,
        enCierre: canal.showInClosing,
        enPie: canal.showInFooter,
      })),
    hero: {
      indice: bloqueHero.indexLabel,
      antetitulo: hero.eyebrow,
      tituloLinea1: hero.titleLine1,
      tituloLinea2: hero.titleLine2,
      entradilla: hero.lead,
      ctaPrincipal: hero.primaryCtaLabel,
      ctaSecundario: hero.secondaryCtaLabel,
      tarjetaMarcas: {
        titulo: hero.brandCardTitle,
        texto: hero.brandCardText,
        enlace: hero.brandCardLinkLabel,
      },
      // internalSource es privado: nunca se publica.
      cifras: hero.figures
        .filter((cifra) => cifra.isVisible)
        .map((cifra) => ({ etiqueta: cifra.label, valor: cifra.value, pie: cifra.caption })),
    },
    familia:
      bloqueFamilia?.isVisible && familia
        ? {
            indice: bloqueFamilia.indexLabel,
            titulo: familia.title,
            segundaGeneracion: { etiqueta: familia.secondGenerationLabel, texto: familia.secondGenerationText },
            terceraGeneracion: {
              etiqueta: familia.thirdGenerationLabel,
              texto: familia.thirdGenerationText,
              pie: familia.thirdGenerationCaption,
            },
            miembros: familia.members
              .filter((miembro) => miembro.isVisible)
              .map((miembro) => ({
                nombre: miembro.name,
                generacion: miembro.generation,
                texto: miembro.text,
                pie: miembro.caption,
                edad: miembro.ageManual,
              })),
          }
        : null,
    dia:
      bloqueDia?.isVisible && dia
        ? {
            indice: bloqueDia.indexLabel,
            titulo: dia.title,
            entradilla: dia.lead,
            norte: {
              etiqueta: dia.northLabel,
              titulo: dia.northTitle,
              texto: dia.northText,
              destacado: dia.northHighlight,
              puente: dia.northBridge,
            },
            sur: { etiqueta: dia.southLabel, titulo: dia.southTitle, texto: dia.southText },
            despues: { etiqueta: dia.afterLabel, titulo: dia.afterTitle, texto: dia.afterText },
            recorrido: dia.steps
              .filter((paso) => paso.isVisible)
              .map((paso) => ({ etiqueta: paso.label, hora: paso.time })),
          }
        : null,
    colaborar: {
      indice: bloqueColaborar.indexLabel,
      tituloLinea1: colaborar.titleLine1,
      tituloLinea2: colaborar.titleLine2,
      entradilla: colaborar.lead,
      remate: colaborar.closingLine,
      vias: borrador.vias
        .filter((via) => via.isVisible)
        .map((via) => ({
          clave: via.key,
          numero: via.number,
          titulo: via.title,
          subtitulo: via.subtitle,
          texto: via.cardCopy,
          cta: via.ctaLabel,
          tipoFormulario: via.formType,
          elementos: via.items.map((elemento) => ({ tipo: elemento.kind, texto: elemento.text })),
          // availability e internalNotes son privados: el estado solo sale con su interruptor.
          oportunidades: via.opportunities
            .filter((oportunidad) => oportunidad.isVisible)
            .map((oportunidad) => ({
              clave: oportunidad.key,
              nombre: oportunidad.name,
              descripcion: oportunidad.publicDescription,
              estado: oportunidad.showStatusPublicly ? oportunidad.availability : null,
              hoyo: oportunidad.holeNumber,
            })),
        })),
      concursos: {
        etiqueta: colaborar.holesLabel,
        titulo: colaborar.holesTitle,
        entradilla: colaborar.holesLead,
        modelos: colaborar.holesModelsText,
        denominacion: colaborar.holesNamingText,
        cta: colaborar.holesCtaLabel,
        hoyos: borrador.hoyos.flatMap((hoyo) =>
          hoyo.contestType && hoyo.isContestVisible
            ? [
                {
                  numero: hoyo.number,
                  concurso: hoyo.contestType,
                  par: hoyo.par,
                  // El campo (Norte, Sur o ambos) solo se publica con su interruptor (P8).
                  campo: hoyo.showCourse ? hoyo.course : null,
                },
              ]
            : [],
        ),
      },
      dieciochoHoyos: { titulo: colaborar.allHolesTitle, texto: colaborar.allHolesText },
      notaTransparencia: colaborar.transparencyNote,
    },
    cierre:
      bloqueCierre?.isVisible && cierre
        ? {
            indice: bloqueCierre.indexLabel,
            historial: {
              titulo: cierre.historyTitle,
              texto: cierre.historyText,
              etiquetaMuro: cierre.wallLabel,
              marcas: borrador.patrocinadores.filter(esPatrocinadorPublicable).map((patrocinador) => ({
                nombre: patrocinador.name,
                slug: patrocinador.slug,
                categoria: patrocinador.category,
                url: patrocinador.url,
                descripcion: patrocinador.shortDescription,
              })),
            },
            solidaria: cierre.charityVisible ? { titulo: cierre.charityTitle, texto: cierre.charityText } : null,
            tituloLinea1: cierre.closingTitleLine1,
            tituloLinea2: cierre.closingTitleLine2,
            texto: cierre.closingText,
            microcopy: cierre.closingMicrocopy,
            cta: cierre.closingCtaLabel,
          }
        : null,
  };
}

/** Construye y valida con Zod. Es lo que usa la publicación. */
export function prepararSnapshot(borrador: Borrador): SnapshotPublico {
  const resultado = esquemaSnapshot.safeParse(construirSnapshot(borrador));
  if (!resultado.success) {
    throw new ErrorPublicacion(
      resultado.error.issues.map(
        (problema) => `${problema.path.map(String).join(".") || "snapshot"}: ${problema.message}`,
      ),
    );
  }
  return resultado.data;
}
