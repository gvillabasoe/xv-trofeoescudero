import type { Borrador } from "@/lib/snapshot/construir";
import type { ConsultasBD } from "@/server/db";

/** Lee de las tablas relacionales todo lo que puede llegar al snapshot (fase-2 §8, paso 1). */
export async function leerBorrador(bd: ConsultasBD): Promise<Borrador> {
  // Las consultas van una tras otra: dentro de una transacción comparten conexión.
  const sitio = await bd.siteSettings.findUnique({ where: { id: 1 } });
  const contacto = await bd.contactChannel.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  const bloques = await bd.pageSection.findMany({ orderBy: { sortOrder: "asc" } });
  const hero = await bd.heroContent.findFirst({
    where: { section: { key: "HERO" } },
    include: { figures: { orderBy: { sortOrder: "asc" } } },
  });
  const familia = await bd.familyContent.findFirst({
    where: { section: { key: "FAMILIA" } },
    include: { members: { orderBy: { sortOrder: "asc" } } },
  });
  const dia = await bd.dayContent.findFirst({
    where: { section: { key: "EL_DIA" } },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
  const colaborar = await bd.collaborationContent.findFirst({ where: { section: { key: "COLABORAR" } } });
  const cierre = await bd.closingContent.findFirst({ where: { section: { key: "CIERRE" } } });
  const vias = await bd.collaborationRoute.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] },
      opportunities: { orderBy: { sortOrder: "asc" }, include: { hole: { select: { number: true } } } },
    },
  });
  const hoyos = await bd.competitionHole.findMany({ orderBy: { number: "asc" } });
  const patrocinadores = await bd.sponsor.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { category: { select: { name: true } } },
  });

  return {
    sitio: sitio && { ...sitio, eventDate: sitio.eventDate.toISOString().slice(0, 10) },
    contacto,
    bloques,
    hero,
    familia,
    dia,
    colaborar,
    cierre,
    vias: vias.map((via) => ({
      ...via,
      opportunities: via.opportunities.map((oportunidad) => ({
        ...oportunidad,
        holeNumber: oportunidad.hole?.number ?? null,
      })),
    })),
    hoyos,
    patrocinadores: patrocinadores.map((patrocinador) => ({
      ...patrocinador,
      category: patrocinador.category.name,
    })),
  };
}
