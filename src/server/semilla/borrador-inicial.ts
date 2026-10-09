import type { Borrador } from "@/lib/snapshot/construir";
import { numerarElementos, numerarOportunidades } from "./sembrar";
import {
  BLOQUES,
  CATEGORIAS,
  CIERRE,
  CIFRAS,
  COLABORAR,
  CONCURSOS,
  DIA,
  ENTIDADES_HISTORICAS,
  FAMILIA,
  HERO,
  MIEMBROS,
  RECORRIDO,
  SITIO,
  VIAS,
} from "./datos";

const ORDEN_ELEMENTOS = ["NECESITAMOS", "PUEDES_APORTAR", "RECIBES", "CONDICION", "EJEMPLO"];

/**
 * El borrador tal y como lo deja el bootstrap, sin base de datos (función pura).
 * Sirve para probar el snapshot del contenido inicial y para simular en CI una instalación de la Entrega 3.
 * @param clasificacion «entrega-3»: las entidades históricas como las dejó la Entrega 3 (todas en «Sin categoría»).
 */
export function borradorInicial(clasificacion: "actual" | "entrega-3" = "actual"): Borrador {
  const nombreCategoria = (slug: string) => CATEGORIAS.find((categoria) => categoria.slug === slug)?.name ?? slug;
  const oportunidades = numerarOportunidades();

  return {
    sitio: { ...SITIO },
    contacto: [],
    bloques: BLOQUES.map((bloque) => ({ key: bloque.key, indexLabel: bloque.indexLabel, isVisible: true })),
    hero: { ...HERO, figures: CIFRAS.map((cifra) => ({ ...cifra, isVisible: true })) },
    familia: {
      ...FAMILIA,
      members: MIEMBROS.map((miembro) => ({ ...miembro, ageManual: null, isVisible: true })),
    },
    dia: { ...DIA, steps: RECORRIDO.map((label) => ({ label, time: null, isVisible: true })) },
    colaborar: { ...COLABORAR },
    cierre: { ...CIERRE },
    vias: VIAS.map((via) => ({
      key: via.key,
      number: via.number,
      title: via.title,
      subtitle: via.subtitle,
      cardCopy: via.cardCopy,
      ctaLabel: via.ctaLabel,
      formType: via.formType,
      isVisible: true,
      // Mismo orden que la lectura de la base: por tipo y, dentro de cada tipo, por posición.
      items: numerarElementos(via.items)
        .sort((a, b) => ORDEN_ELEMENTOS.indexOf(a.kind) - ORDEN_ELEMENTOS.indexOf(b.kind) || a.sortOrder - b.sortOrder)
        .map(({ kind, text }) => ({ kind, text })),
      opportunities: oportunidades
        .filter((oportunidad) => oportunidad.route === via.key)
        .map((oportunidad) => ({
          key: oportunidad.key,
          name: oportunidad.name,
          publicDescription: null,
          availability: "DISPONIBLE" as const,
          showStatusPublicly: false,
          internalNotes: null,
          isVisible: true,
          holeNumber: oportunidad.hole ?? null,
        })),
    })),
    hoyos: Array.from({ length: 18 }, (_, indice) => {
      const number = indice + 1;
      const concurso = CONCURSOS[number];
      return {
        number,
        contestType: concurso?.contestType ?? null,
        par: concurso?.par ?? null,
        course: null,
        showCourse: false,
        isContestVisible: true,
      };
    }),
    patrocinadores: ENTIDADES_HISTORICAS.map((entidad) => ({
      name: entidad.name,
      slug: entidad.slug,
      confirmed: true,
      publicVisibility: entidad.publicVisibility,
      lifecycle: "ACTIVO" as const,
      legalReview: entidad.legalReview,
      url: null,
      shortDescription: null,
      category:
        clasificacion === "entrega-3" && entidad.slug !== "castillo-de-cuzcurrita"
          ? "Sin categoría"
          : nombreCategoria(entidad.categorySlug),
      categoryRequiresLegalReview: CATEGORIAS.find((categoria) => categoria.slug === entidad.categorySlug)?.requiresLegalReview ?? false,
    })),
  };
}
