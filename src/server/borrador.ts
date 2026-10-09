import type { Borrador, UsoMedio } from "@/lib/snapshot/construir";
import type { ConsultasBD } from "@/server/db";

/** Lo que se lee de cada medio asignado: el archivo, su revisión de derechos y sus variantes. */
const conMedio = {
  orderBy: { sortOrder: "asc" },
  include: { media: { include: { variants: { select: { format: true, width: true, publicPathname: true } } } } },
} as const;

type FilaUso = {
  slot: string;
  sortOrder: number;
  media: {
    id: string;
    kind: "FOTO" | "LOGO" | "ILUSTRACION";
    reviewState: "SUBIDA" | "EN_REVISION" | "AUTORIZADA" | "PUBLICADA" | "RETIRADA";
    retiredAt: Date | null;
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
  };
};

function usos(filas: FilaUso[], slot: string): UsoMedio[] {
  return filas
    .filter((fila) => fila.slot === slot)
    .map(({ sortOrder, media }) => ({
      orden: sortOrder,
      medio: {
        id: media.id,
        kind: media.kind,
        reviewState: media.reviewState,
        retirada: media.retiredAt !== null,
        altText: media.altText,
        caption: media.caption,
        focalX: media.focalX,
        focalY: media.focalY,
        width: media.width,
        height: media.height,
        hasIdentifiablePeople: media.hasIdentifiablePeople,
        includesMinors: media.includesMinors,
        consentConfirmed: media.consentConfirmed,
        guardianConsentConfirmed: media.guardianConsentConfirmed,
        variants: media.variants,
      },
    }));
}

/** Lee de las tablas relacionales todo lo que puede llegar al snapshot (fase-2 §8, paso 1). */
export async function leerBorrador(bd: ConsultasBD): Promise<Borrador> {
  // Las consultas van una tras otra: dentro de una transacción comparten conexión.
  const sitio = await bd.siteSettings.findUnique({ where: { id: 1 }, include: { mediaUsages: conMedio } });
  const contacto = await bd.contactChannel.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  const bloques = await bd.pageSection.findMany({ orderBy: { sortOrder: "asc" } });
  const hero = await bd.heroContent.findFirst({
    where: { section: { key: "HERO" } },
    include: { figures: { orderBy: { sortOrder: "asc" } }, mediaUsages: conMedio },
  });
  const familia = await bd.familyContent.findFirst({
    where: { section: { key: "FAMILIA" } },
    include: {
      members: { orderBy: { sortOrder: "asc" }, include: { mediaUsages: conMedio } },
      mediaUsages: conMedio,
    },
  });
  const dia = await bd.dayContent.findFirst({
    where: { section: { key: "EL_DIA" } },
    include: { steps: { orderBy: { sortOrder: "asc" } }, mediaUsages: conMedio },
  });
  const colaborar = await bd.collaborationContent.findFirst({ where: { section: { key: "COLABORAR" } } });
  const cierre = await bd.closingContent.findFirst({
    where: { section: { key: "CIERRE" } },
    include: { mediaUsages: conMedio },
  });
  const vias = await bd.collaborationRoute.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] },
      opportunities: { orderBy: { sortOrder: "asc" }, include: { hole: { select: { number: true } } } },
      mediaUsages: conMedio,
    },
  });
  const hoyos = await bd.competitionHole.findMany({ orderBy: { number: "asc" } });
  const patrocinadores = await bd.sponsor.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { category: { select: { name: true, requiresLegalReview: true } }, mediaUsages: conMedio },
  });

  return {
    sitio: sitio && {
      ...sitio,
      eventDate: sitio.eventDate.toISOString().slice(0, 10),
      imagenes: usos(sitio.mediaUsages, "OG_IMAGEN"),
    },
    contacto,
    bloques,
    hero: hero && { ...hero, imagenes: usos(hero.mediaUsages, "HERO_IMAGEN") },
    familia: familia && {
      ...familia,
      members: familia.members.map((miembro) => ({ ...miembro, imagenes: usos(miembro.mediaUsages, "MIEMBRO_FOTO") })),
      imagenes: usos(familia.mediaUsages, "FAMILIA_IMAGEN"),
    },
    dia: dia && { ...dia, imagenes: usos(dia.mediaUsages, "DIA_IMAGEN") },
    colaborar,
    cierre: cierre && { ...cierre, imagenes: usos(cierre.mediaUsages, "CIERRE_IMAGEN") },
    vias: vias.map((via) => ({
      ...via,
      opportunities: via.opportunities.map((oportunidad) => ({
        ...oportunidad,
        holeNumber: oportunidad.hole?.number ?? null,
      })),
      imagenes: usos(via.mediaUsages, "VIA_IMAGEN"),
    })),
    hoyos,
    patrocinadores: patrocinadores.map((patrocinador) => ({
      ...patrocinador,
      category: patrocinador.category.name,
      categoryRequiresLegalReview: patrocinador.category.requiresLegalReview,
      imagenes: usos(patrocinador.mediaUsages, "PATROCINADOR_LOGO"),
    })),
  };
}
