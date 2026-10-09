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
  type ImagenPublica,
  type SnapshotPublico,
} from "./esquema";
import { buscarDatosPrivados } from "./privacidad";

/**
 * Del borrador editable (tablas relacionales) al snapshot público (fase-2 §8).
 * Funciones puras: aquí se aplican las reglas de publicación y privacidad.
 */

type Uno<T extends readonly string[]> = T[number];
type ClaveBloque = "HERO" | "FAMILIA" | "EL_DIA" | "COLABORAR" | "CIERRE";

export type PermisoLogo = "PENDIENTE" | "AUTORIZADO" | "DENEGADO" | "NO_APLICA";

/** Un archivo de la biblioteca, con lo necesario para decidir si se puede publicar. */
export interface MedioBorrador {
  id: string;
  kind: "FOTO" | "LOGO" | "ILUSTRACION";
  reviewState: "SUBIDA" | "EN_REVISION" | "AUTORIZADA" | "PUBLICADA" | "RETIRADA";
  retirada: boolean;
  altText: string | null;
  caption: string | null;
  focalX: number;
  focalY: number;
  width: number;
  height: number;
  hasIdentifiablePeople: boolean;
  includesMinors: boolean;
  consentConfirmed: boolean;
  guardianConsentConfirmed: boolean;
  variants: Array<{ format: "WEBP" | "AVIF" | "PNG" | "JPEG"; width: number; publicPathname: string }>;
}

/** Un medio asignado a un hueco. `orden` distingue huecos del mismo contenido (p. ej., Norte, Sur, Hoyo 19). */
export interface UsoMedio {
  orden: number;
  medio: MedioBorrador;
}

/** Orden de los huecos que comparten contenido. */
export const HUECOS = {
  familia: { segunda: 1, tercera: 2 },
  dia: { norte: 1, sur: 2, despues: 3 },
} as const;

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
    imagenes?: UsoMedio[];
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
    imagenes?: UsoMedio[];
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
      imagenes?: UsoMedio[];
    }>;
    imagenes?: UsoMedio[];
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
    imagenes?: UsoMedio[];
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
    imagenes?: UsoMedio[];
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
    imagenes?: UsoMedio[];
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
    /** La categoría exige revisión jurídica (p. ej., bodega / vino): solo se publica con la revisión APROBADA. */
    categoryRequiresLegalReview?: boolean;
    logoPermission?: PermisoLogo;
    imagenes?: UsoMedio[];
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

/**
 * Regla de publicación de patrocinadores (fase-2 §6): confirmado, visible, activo y sin bloqueo jurídico.
 * Si su categoría exige revisión jurídica, la revisión tiene que estar APROBADA.
 */
export function esPatrocinadorPublicable(patrocinador: Borrador["patrocinadores"][number]): boolean {
  const revisionValida = patrocinador.categoryRequiresLegalReview
    ? patrocinador.legalReview === "APROBADA"
    : patrocinador.legalReview === "NO_REQUERIDA" || patrocinador.legalReview === "APROBADA";
  return patrocinador.confirmed && patrocinador.publicVisibility && patrocinador.lifecycle === "ACTIVO" && revisionValida;
}

/** Por qué un medio no se puede publicar; null si se puede. */
export function motivoMedioNoPublicable(
  medio: MedioBorrador,
  opciones: { esLogo?: boolean; permisoLogo?: PermisoLogo; formato?: "WEBP" | "JPEG" } = {},
): string | null {
  if (medio.retirada || medio.reviewState === "RETIRADA") return "está retirada";
  if (medio.reviewState !== "AUTORIZADA" && medio.reviewState !== "PUBLICADA") return "todavía no está autorizada";
  if (!medio.altText?.trim()) return "le falta el texto alternativo";
  if (medio.hasIdentifiablePeople && !medio.consentConfirmed) return "aparecen personas y falta confirmar su consentimiento";
  if (medio.includesMinors && !medio.guardianConsentConfirmed) {
    return "aparecen menores y falta confirmar la autorización de sus tutores";
  }
  if (opciones.esLogo && opciones.permisoLogo !== "AUTORIZADO") return "la marca no ha autorizado el uso de su logo";
  const formato = opciones.formato ?? "WEBP";
  if (!medio.variants.some((variante) => variante.format === formato)) return "no tiene versiones web generadas";
  return null;
}

/** Ancho por defecto de la imagen (el resto va en `variantes`). */
const ANCHO_PREFERIDO = 1280;

/** WebP para la web; JPEG solo para la imagen de compartir en redes. */
export function aImagenPublica(medio: MedioBorrador, formato: "WEBP" | "JPEG" = "WEBP"): ImagenPublica {
  const variantes = medio.variants
    .filter((variante) => variante.format === formato)
    .sort((a, b) => a.width - b.width)
    .map((variante) => ({ url: `/medios/${variante.publicPathname}`, ancho: variante.width }));
  const principal = [...variantes].reverse().find((variante) => variante.ancho <= ANCHO_PREFERIDO) ?? variantes[0];
  return {
    url: principal?.url ?? "",
    alt: medio.altText?.trim() ?? "",
    ancho: medio.width,
    alto: medio.height,
    focoX: medio.focalX,
    focoY: medio.focalY,
    pie: medio.caption?.trim() || null,
    variantes,
  };
}

function bloque(borrador: Borrador, clave: ClaveBloque) {
  return borrador.bloques.find((seccion) => seccion.key === clave) ?? null;
}

export interface ResultadoConstruccion {
  snapshot: SnapshotPublico;
  /** Lo que no se publica y conviene saber (no impide publicar). */
  avisos: string[];
  /** Ids de los medios incluidos en el snapshot (RevisionMediaRef). */
  medios: string[];
}

/** Construye el objeto público, sin validar, con los avisos de lo que se ha dejado fuera. */
export function construirSnapshotDetallado(borrador: Borrador): ResultadoConstruccion {
  const motivos: string[] = [];
  const avisos: string[] = [];
  const medios = new Set<string>();
  const { sitio, hero, colaborar } = borrador;
  const bloqueHero = bloque(borrador, "HERO");
  const bloqueColaborar = bloque(borrador, "COLABORAR");

  if (!sitio) motivos.push("falta la configuración general del sitio");
  if (!bloqueHero || !hero) motivos.push("falta el bloque Hero");
  if (!bloqueColaborar || !colaborar) motivos.push("falta el bloque Colaborar");
  if (!sitio || !bloqueHero || !hero || !bloqueColaborar || !colaborar) {
    throw new ErrorPublicacion(motivos);
  }

  /** Elige la imagen de un hueco; si no se puede publicar, la deja fuera con un aviso. */
  const imagen = (
    usos: UsoMedio[] | undefined,
    hueco: string,
    opciones: { orden?: number; esLogo?: boolean; permisoLogo?: PermisoLogo; formato?: "WEBP" | "JPEG" } = {},
  ): ImagenPublica | null => {
    const uso = (usos ?? [])
      .filter((candidato) => opciones.orden === undefined || candidato.orden === opciones.orden)
      .sort((a, b) => a.orden - b.orden)[0];
    if (!uso) return null;
    const motivo = motivoMedioNoPublicable(uso.medio, opciones);
    if (motivo) {
      avisos.push(`La imagen de ${hueco} no se publica: ${motivo}.`);
      return null;
    }
    medios.add(uso.medio.id);
    return aImagenPublica(uso.medio, opciones.formato);
  };

  const bloqueFamilia = bloque(borrador, "FAMILIA");
  const bloqueDia = bloque(borrador, "EL_DIA");
  const bloqueCierre = bloque(borrador, "CIERRE");
  const { familia, dia, cierre } = borrador;

  const snapshot: SnapshotPublico = {
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
      imagenCompartir: imagen(sitio.imagenes, "compartir en redes", { formato: "JPEG" }),
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
      imagen: imagen(hero.imagenes, "la portada"),
    },
    familia:
      bloqueFamilia?.isVisible && familia
        ? {
            indice: bloqueFamilia.indexLabel,
            titulo: familia.title,
            segundaGeneracion: {
              etiqueta: familia.secondGenerationLabel,
              texto: familia.secondGenerationText,
              imagen: imagen(familia.imagenes, "la segunda generación", { orden: HUECOS.familia.segunda }),
            },
            terceraGeneracion: {
              etiqueta: familia.thirdGenerationLabel,
              texto: familia.thirdGenerationText,
              pie: familia.thirdGenerationCaption,
              imagen: imagen(familia.imagenes, "la 3ª Generación", { orden: HUECOS.familia.tercera }),
            },
            miembros: familia.members
              .filter((miembro) => miembro.isVisible)
              .map((miembro) => ({
                nombre: miembro.name,
                generacion: miembro.generation,
                texto: miembro.text,
                pie: miembro.caption,
                edad: miembro.ageManual,
                foto: imagen(miembro.imagenes, miembro.name),
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
              imagen: imagen(dia.imagenes, "el Campo Norte", { orden: HUECOS.dia.norte }),
            },
            sur: {
              etiqueta: dia.southLabel,
              titulo: dia.southTitle,
              texto: dia.southText,
              imagen: imagen(dia.imagenes, "el Campo Sur", { orden: HUECOS.dia.sur }),
            },
            despues: {
              etiqueta: dia.afterLabel,
              titulo: dia.afterTitle,
              texto: dia.afterText,
              imagen: imagen(dia.imagenes, "después del 18", { orden: HUECOS.dia.despues }),
            },
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
          imagen: imagen(via.imagenes, `la vía «${via.title}»`),
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
                logo: imagen(patrocinador.imagenes, `el logo de ${patrocinador.name}`, {
                  esLogo: true,
                  permisoLogo: patrocinador.logoPermission ?? "PENDIENTE",
                }),
              })),
            },
            solidaria: cierre.charityVisible ? { titulo: cierre.charityTitle, texto: cierre.charityText } : null,
            tituloLinea1: cierre.closingTitleLine1,
            tituloLinea2: cierre.closingTitleLine2,
            texto: cierre.closingText,
            microcopy: cierre.closingMicrocopy,
            cta: cierre.closingCtaLabel,
            imagen: imagen(cierre.imagenes, "el cierre"),
          }
        : null,
  };

  return { snapshot, avisos, medios: [...medios] };
}

/** Construye el objeto público, sin validar. Lanza ErrorPublicacion si falta algo imprescindible. */
export function construirSnapshot(borrador: Borrador): SnapshotPublico {
  return construirSnapshotDetallado(borrador).snapshot;
}

/**
 * Construye (lista blanca), valida con Zod (objetos estrictos) e inspecciona el resultado en busca de datos
 * privados. Es lo que usa la publicación: si cualquiera de las tres barreras falla, no se publica nada.
 */
export function prepararPublicacion(borrador: Borrador): ResultadoConstruccion {
  const resultado = construirSnapshotDetallado(borrador);
  const lectura = esquemaSnapshot.safeParse(resultado.snapshot);
  if (!lectura.success) {
    throw new ErrorPublicacion(
      lectura.error.issues.map((problema) => {
        const ruta = problema.path.map(String).join(" › ") || "snapshot";
        const motivo =
          problema.code === "too_small"
            ? "está vacío"
            : problema.code === "invalid_type"
              ? "falta o no es válido"
              : problema.code === "unrecognized_keys"
                ? "tiene campos no previstos"
                : problema.message;
        return `${ruta}: ${motivo}`;
      }),
    );
  }
  const hallazgos = buscarDatosPrivados(lectura.data);
  if (hallazgos.length > 0) {
    throw new ErrorPublicacion(hallazgos.map((hallazgo) => `${hallazgo.ruta}: ${hallazgo.motivo}`));
  }
  return { ...resultado, snapshot: lectura.data };
}

export function prepararSnapshot(borrador: Borrador): SnapshotPublico {
  return prepararPublicacion(borrador).snapshot;
}
