import { createHash } from "node:crypto";
import type { ClienteBD } from "@/server/db";
import { publicar } from "@/server/publicacion";
import {
  BLOQUES,
  CATEGORIAS,
  CIERRE,
  CIFRAS,
  COLABORAR,
  CONCURSOS,
  DIA,
  FAMILIA,
  HERO,
  MENSAJE_FICTICIO,
  MIEMBROS,
  OPORTUNIDADES,
  PAGINAS_LEGALES,
  PATROCINADORES,
  PROPUESTAS_FICTICIAS,
  RECORRIDO,
  SITIO,
  TEXTO_CONSENTIMIENTO,
  VERSION_LEGAL_SINTETICA,
  VIAS,
} from "./datos";

export interface ResumenSemilla {
  /** Registros creados en esta ejecución, por tipo (solo los que no son cero). */
  creados: Record<string, number>;
  /** Número de la versión publicada por el seed, o null si ya existía una versión publicada. */
  publicada: number | null;
}

/**
 * Seed idempotente (fase-2 §6.4).
 * - Solo crea lo que no existe; nunca modifica un registro existente, así que nunca sobrescribe lo editado.
 * - No crea administradores ni propuestas reales, no activa contenidos ocultos y no publica Castillo de Cuzcurrita.
 * - Las propuestas ficticias y la versión legal sintética solo existen en NONPROD.
 * - Si no hay ninguna versión publicada, publica la nº 1.
 */
export async function sembrar(bd: ClienteBD, opciones: { entorno: "NONPROD" | "PROD" }): Promise<ResumenSemilla> {
  const creados: Record<string, number> = {};
  const anotar = (tipo: string, cantidad = 1) => {
    if (cantidad > 0) creados[tipo] = (creados[tipo] ?? 0) + cantidad;
  };

  // Configuración general (singleton).
  if (!(await bd.siteSettings.findUnique({ where: { id: 1 } }))) {
    await bd.siteSettings.create({ data: { id: 1, ...SITIO } });
    anotar("configuración");
  }

  // Se comprueba lo que ya existe con una consulta por tipo: el seed se ejecuta en cada despliegue.
  const existentes = {
    secciones: new Map(
      (
        await bd.pageSection.findMany({
          select: {
            key: true,
            id: true,
            hero: { select: { id: true } },
            family: { select: { id: true } },
            day: { select: { id: true } },
            collaboration: { select: { id: true } },
            closing: { select: { id: true } },
          },
        })
      ).map((seccion) => [seccion.key, seccion] as const),
    ),
    vias: await claves(bd.collaborationRoute.findMany({ select: { key: true } })),
    oportunidades: await claves(bd.opportunity.findMany({ select: { key: true } })),
    categorias: await slugs(bd.sponsorCategory.findMany({ select: { slug: true } })),
    patrocinadores: await slugs(bd.sponsor.findMany({ select: { slug: true } })),
    paginasLegales: await slugs(bd.legalPage.findMany({ select: { slug: true } })),
  };

  // Los 5 bloques y su contenido.
  for (const datos of BLOQUES) {
    const existente = existentes.secciones.get(datos.key);
    let sectionId = existente?.id;
    if (!sectionId) {
      sectionId = (await bd.pageSection.create({ data: datos })).id;
      anotar("bloques");
    }

    if (datos.key === "HERO" && !existente?.hero) {
      await bd.heroContent.create({
        data: {
          sectionId,
          ...HERO,
          figures: { create: CIFRAS.map((cifra, indice) => ({ ...cifra, sortOrder: indice + 1 })) },
        },
      });
      anotar("contenidos de bloque");
    }
    if (datos.key === "FAMILIA" && !existente?.family) {
      await bd.familyContent.create({
        data: {
          sectionId,
          ...FAMILIA,
          members: { create: MIEMBROS.map((miembro, indice) => ({ ...miembro, sortOrder: indice + 1 })) },
        },
      });
      anotar("contenidos de bloque");
    }
    if (datos.key === "EL_DIA" && !existente?.day) {
      await bd.dayContent.create({
        data: {
          sectionId,
          ...DIA,
          steps: { create: RECORRIDO.map((label, indice) => ({ label, sortOrder: indice + 1 })) },
        },
      });
      anotar("contenidos de bloque");
    }
    if (datos.key === "COLABORAR" && !existente?.collaboration) {
      await bd.collaborationContent.create({ data: { sectionId, ...COLABORAR } });
      anotar("contenidos de bloque");
    }
    if (datos.key === "CIERRE" && !existente?.closing) {
      await bd.closingContent.create({ data: { sectionId, ...CIERRE } });
      anotar("contenidos de bloque");
    }
  }

  // Los 18 hoyos. ON CONFLICT DO NOTHING: nunca toca un hoyo existente.
  const hoyos = await bd.competitionHole.createMany({
    data: Array.from({ length: 18 }, (_, indice) => {
      const number = indice + 1;
      const concurso = CONCURSOS[number];
      return { number, contestType: concurso?.contestType ?? null, par: concurso?.par ?? null };
    }),
    skipDuplicates: true,
  });
  anotar("hoyos", hoyos.count);

  // Las 4 vías con sus textos.
  for (const via of VIAS) {
    if (existentes.vias.has(via.key)) continue;
    const { items, ...datosVia } = via;
    // Orden de cada texto dentro de su tipo, como en el copy aprobado.
    const contadores = new Map<string, number>();
    await bd.collaborationRoute.create({
      data: {
        ...datosVia,
        sortOrder: via.number,
        items: {
          create: items.map(([kind, text]) => {
            const sortOrder = (contadores.get(kind) ?? 0) + 1;
            contadores.set(kind, sortOrder);
            return { kind, text, sortOrder };
          }),
        },
      },
    });
    anotar("vías");
  }

  // Inventario comercial: estado privado (DISPONIBLE por defecto) y sin publicar.
  const orden = new Map<string, number>();
  for (const oportunidad of OPORTUNIDADES) {
    const sortOrder = (orden.get(oportunidad.route) ?? 0) + 1;
    orden.set(oportunidad.route, sortOrder);
    if (existentes.oportunidades.has(oportunidad.key)) continue;
    await bd.opportunity.create({
      data: {
        key: oportunidad.key,
        name: oportunidad.name,
        maxSponsors: oportunidad.maxSponsors ?? null,
        sortOrder,
        route: { connect: { key: oportunidad.route } },
        ...(oportunidad.hole ? { hole: { connect: { number: oportunidad.hole } } } : {}),
      },
    });
    anotar("oportunidades");
  }

  // Categorías y patrocinadores históricos.
  for (const categoria of CATEGORIAS) {
    if (existentes.categorias.has(categoria.slug)) continue;
    await bd.sponsorCategory.create({ data: categoria });
    anotar("categorías");
  }
  for (const { categorySlug, ...patrocinador } of PATROCINADORES) {
    if (existentes.patrocinadores.has(patrocinador.slug)) continue;
    await bd.sponsor.create({
      data: {
        ...patrocinador,
        temporalRelation: "HISTORICO",
        confirmed: true,
        logoPermission: "PENDIENTE",
        lifecycle: "ACTIVO",
        category: { connect: { slug: categorySlug } },
      },
    });
    anotar("patrocinadores");
  }

  // Páginas legales vacías e incompletas: sus textos dependen de P2.
  for (const pagina of PAGINAS_LEGALES) {
    if (existentes.paginasLegales.has(pagina.slug)) continue;
    await bd.legalPage.create({ data: { ...pagina, body: "", isComplete: false } });
    anotar("páginas legales");
  }

  if (opciones.entorno === "NONPROD") {
    await sembrarDatosFicticios(bd, anotar);
  }

  // Versión publicada nº 1, solo si todavía no hay ninguna.
  const estado = await bd.siteState.findUnique({ where: { id: 1 } });
  let publicada: number | null = null;
  if (!estado?.publishedRevisionId) {
    const resultado = await publicar(bd, {
      actorId: null,
      comentario: "Versión inicial publicada por el seed",
    });
    publicada = resultado.numero;
  }

  return { creados, publicada };
}

async function claves(consulta: Promise<Array<{ key: string }>>): Promise<Set<string>> {
  return new Set((await consulta).map(({ key }) => key));
}

async function slugs(consulta: Promise<Array<{ slug: string }>>): Promise<Set<string>> {
  return new Set((await consulta).map(({ slug }) => slug));
}

/** Solo NONPROD. Se recrean si se borran todas las propuestas ficticias. */
async function sembrarDatosFicticios(bd: ClienteBD, anotar: (tipo: string, cantidad?: number) => void) {
  const privacidad = await bd.legalPage.findUniqueOrThrow({ where: { slug: "privacidad" } });
  let versionLegal = await bd.legalVersion.findUnique({
    where: {
      legalPageId_versionLabel: { legalPageId: privacidad.id, versionLabel: VERSION_LEGAL_SINTETICA.versionLabel },
    },
  });
  if (!versionLegal) {
    versionLegal = await bd.legalVersion.create({
      data: {
        legalPageId: privacidad.id,
        ...VERSION_LEGAL_SINTETICA,
        bodyHash: createHash("sha256").update(VERSION_LEGAL_SINTETICA.body).digest("hex"),
        publishedAt: new Date(),
      },
    });
    anotar("versiones legales sintéticas");
  }

  if ((await bd.submission.count({ where: { isSynthetic: true } })) > 0) return;

  const ahora = new Date();
  for (const { archivada, leida, nota, status, ...propuesta } of PROPUESTAS_FICTICIAS) {
    await bd.submission.create({
      data: {
        ...propuesta,
        message: MENSAJE_FICTICIO,
        consentAt: ahora,
        consentLegalVersionId: versionLegal.id,
        consentText: TEXTO_CONSENTIMIENTO,
        status,
        readAt: leida ? ahora : null,
        archivedAt: archivada ? ahora : null,
        isSynthetic: true,
        statusHistory: {
          create:
            status === "NUEVA"
              ? [{ fromStatus: null, toStatus: "NUEVA" as const }]
              : [
                  { fromStatus: null, toStatus: "NUEVA" as const },
                  { fromStatus: "NUEVA" as const, toStatus: status, note: "Cambio de estado ficticio" },
                ],
        },
        ...(nota ? { notes: { create: [{ body: nota }] } } : {}),
      },
    });
    anotar("propuestas ficticias");
  }
}
