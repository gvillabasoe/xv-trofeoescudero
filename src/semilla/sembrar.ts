import type { ConsultasBD } from "@/server/db";
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
  OPORTUNIDADES,
  PAGINAS_LEGALES,
  RECORRIDO,
  SITIO,
  VIAS,
} from "./datos";

/** Orden de cada texto de una vía dentro de su tipo, como en el copy aprobado. */
export function numerarElementos<K extends string>(items: ReadonlyArray<readonly [K, string]>) {
  const contadores = new Map<K, number>();
  return items.map(([kind, text]) => {
    const sortOrder = (contadores.get(kind) ?? 0) + 1;
    contadores.set(kind, sortOrder);
    return { kind, text, sortOrder };
  });
}

/** Orden de cada oportunidad dentro de su vía. */
export function numerarOportunidades() {
  const contadores = new Map<string, number>();
  return OPORTUNIDADES.map((oportunidad) => {
    const sortOrder = (contadores.get(oportunidad.route) ?? 0) + 1;
    contadores.set(oportunidad.route, sortOrder);
    return { ...oportunidad, sortOrder };
  });
}

function buscar<T extends { id: string }>(lista: T[], encontrar: (elemento: T) => boolean, descripcion: string): string {
  const elemento = lista.find(encontrar);
  if (!elemento) throw new Error(`Bootstrap: no se ha creado ${descripcion}.`);
  return elemento.id;
}

/**
 * Crea todo el contenido inicial dentro de la transacción del bootstrap (bootstrap.ts).
 * Solo se llama con las tablas funcionales vacías. Usa inserciones en bloque: pocas consultas.
 * @returns Recuento de lo creado, por tipo.
 */
export async function crearContenidoInicial(tx: ConsultasBD): Promise<Record<string, number>> {
  await tx.siteSettings.create({
    data: { id: 1, ...SITIO, eventDate: new Date(`${SITIO.eventDate}T00:00:00.000Z`) },
  });

  const secciones = await tx.pageSection.createManyAndReturn({
    data: BLOQUES.map((bloque) => ({ ...bloque })),
    select: { id: true, key: true },
  });
  const seccion = (clave: string) => buscar(secciones, (s) => s.key === clave, `el bloque ${clave}`);

  await tx.heroContent.create({
    data: {
      sectionId: seccion("HERO"),
      ...HERO,
      figures: { createMany: { data: CIFRAS.map((cifra, indice) => ({ ...cifra, sortOrder: indice + 1 })) } },
    },
  });
  await tx.familyContent.create({
    data: {
      sectionId: seccion("FAMILIA"),
      ...FAMILIA,
      members: { createMany: { data: MIEMBROS.map((miembro, indice) => ({ ...miembro, sortOrder: indice + 1 })) } },
    },
  });
  await tx.dayContent.create({
    data: {
      sectionId: seccion("EL_DIA"),
      ...DIA,
      steps: { createMany: { data: RECORRIDO.map((label, indice) => ({ label, sortOrder: indice + 1 })) } },
    },
  });
  await tx.collaborationContent.create({ data: { sectionId: seccion("COLABORAR"), ...COLABORAR } });
  await tx.closingContent.create({ data: { sectionId: seccion("CIERRE"), ...CIERRE } });

  const hoyos = await tx.competitionHole.createManyAndReturn({
    data: Array.from({ length: 18 }, (_, indice) => {
      const number = indice + 1;
      const concurso = CONCURSOS[number];
      return { number, contestType: concurso?.contestType ?? null, par: concurso?.par ?? null };
    }),
    select: { id: true, number: true },
  });

  const vias = await tx.collaborationRoute.createManyAndReturn({
    data: VIAS.map((datos) => ({
      key: datos.key,
      number: datos.number,
      title: datos.title,
      subtitle: datos.subtitle,
      cardCopy: datos.cardCopy,
      ctaLabel: datos.ctaLabel,
      formType: datos.formType,
      sortOrder: datos.number,
    })),
    select: { id: true, key: true },
  });
  const via = (clave: string) => buscar(vias, (v) => v.key === clave, `la vía ${clave}`);

  const elementos = await tx.routeItem.createMany({
    data: VIAS.flatMap((datos) =>
      numerarElementos(datos.items).map((elemento) => ({ ...elemento, routeId: via(datos.key) })),
    ),
  });

  const oportunidades = await tx.opportunity.createMany({
    data: numerarOportunidades().map((oportunidad) => ({
      key: oportunidad.key,
      name: oportunidad.name,
      maxSponsors: oportunidad.maxSponsors ?? null,
      sortOrder: oportunidad.sortOrder,
      routeId: via(oportunidad.route),
      holeId: oportunidad.hole ? buscar(hoyos, (h) => h.number === oportunidad.hole, `el hoyo ${oportunidad.hole}`) : null,
    })),
  });

  const categorias = await tx.sponsorCategory.createManyAndReturn({
    data: CATEGORIAS.map((categoria) => ({ ...categoria })),
    select: { id: true, slug: true },
  });

  const entidades = await tx.sponsor.createMany({
    data: ENTIDADES_HISTORICAS.map(({ categorySlug, ...entidad }) => ({
      ...entidad,
      temporalRelation: "HISTORICO" as const,
      confirmed: true,
      logoPermission: "PENDIENTE" as const,
      lifecycle: "ACTIVO" as const,
      categoryId: buscar(categorias, (c) => c.slug === categorySlug, `la categoría ${categorySlug}`),
    })),
  });

  const paginas = await tx.legalPage.createMany({
    data: PAGINAS_LEGALES.map((pagina) => ({ ...pagina, body: "", isComplete: false })),
  });

  return {
    configuración: 1,
    bloques: secciones.length,
    "contenidos de bloque": 5,
    hoyos: hoyos.length,
    vías: vias.length,
    "textos de vía": elementos.count,
    oportunidades: oportunidades.count,
    categorías: categorias.length,
    "entidades históricas": entidades.count,
    "páginas legales": paginas.count,
  };
}
