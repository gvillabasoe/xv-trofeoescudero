// Solo CI. Deja la base E3_URL (con la migración 0001 aplicada y nada más) como la dejó el seed de la
// Entrega 3: contenido inicial, entidades en «Sin categoría», revisión publicada nº 1, SiteState, auditoría y
// 4 propuestas sintéticas. Usa SQL directo y solo columnas de 0001, porque se ejecuta ANTES de la 0002.
import { createHash, randomUUID } from "node:crypto";
import { Client } from "pg";
import { prepararSnapshot } from "@/lib/snapshot/construir";
import { hashContenido } from "@/lib/snapshot/hash";
import { borradorInicial } from "@/server/semilla/borrador-inicial";
import {
  BLOQUES,
  CIERRE,
  CIFRAS,
  COLABORAR,
  CONCURSOS,
  DIA,
  ENTIDADES_HISTORICAS,
  FAMILIA,
  HERO,
  MIEMBROS,
  PAGINAS_LEGALES,
  RECORRIDO,
  SITIO,
  VIAS,
} from "@/server/semilla/datos";
import { MENSAJE_FICTICIO, PROPUESTAS_FICTICIAS, TEXTO_CONSENTIMIENTO, VERSION_LEGAL_SINTETICA } from "@/server/semilla/demo-datos";
import { numerarElementos, numerarOportunidades } from "@/server/semilla/sembrar";

const url = process.env.E3_URL;
if (!url) {
  throw new Error("Falta E3_URL (solo CI).");
}

const cliente = new Client({ connectionString: url });

async function insertar(tabla: string, filas: Array<Record<string, unknown>>) {
  for (const fila of filas) {
    const columnas = Object.keys(fila);
    const marcadores = columnas.map((_, indice) => `$${indice + 1}`);
    await cliente.query(
      `INSERT INTO "${tabla}" (${columnas.map((c) => `"${c}"`).join(", ")}) VALUES (${marcadores.join(", ")})`,
      columnas.map((columna) => fila[columna]),
    );
  }
}

const id = () => randomUUID();

await cliente.connect();
try {
  await cliente.query("BEGIN");
  await insertar("PolicySettings", [{ id: 1, environment: "NONPROD" }]);
  await insertar("SiteSettings", [{ id: 1, ...SITIO }]);

  const secciones = new Map(BLOQUES.map((bloque) => [bloque.key, id()]));
  await insertar(
    "PageSection",
    BLOQUES.map((bloque) => ({ id: secciones.get(bloque.key), key: bloque.key, indexLabel: bloque.indexLabel, sortOrder: bloque.sortOrder })),
  );

  const heroId = id();
  await insertar("HeroContent", [{ id: heroId, sectionId: secciones.get("HERO"), ...HERO }]);
  await insertar("HeroFigure", CIFRAS.map((cifra, i) => ({ id: id(), heroId, ...cifra, sortOrder: i + 1 })));

  const familiaId = id();
  await insertar("FamilyContent", [{ id: familiaId, sectionId: secciones.get("FAMILIA"), ...FAMILIA }]);
  await insertar("FamilyMember", MIEMBROS.map((miembro, i) => ({ id: id(), familyId: familiaId, ...miembro, sortOrder: i + 1 })));

  const diaId = id();
  await insertar("DayContent", [{ id: diaId, sectionId: secciones.get("EL_DIA"), ...DIA }]);
  await insertar("DayStep", RECORRIDO.map((label, i) => ({ id: id(), dayId: diaId, label, sortOrder: i + 1 })));

  await insertar("CollaborationContent", [{ id: id(), sectionId: secciones.get("COLABORAR"), ...COLABORAR }]);
  await insertar("ClosingContent", [{ id: id(), sectionId: secciones.get("CIERRE"), ...CIERRE }]);

  const hoyos = new Map(Array.from({ length: 18 }, (_, i) => [i + 1, id()]));
  await insertar(
    "CompetitionHole",
    [...hoyos].map(([number, idHoyo]) => ({
      id: idHoyo,
      number,
      contestType: CONCURSOS[number]?.contestType ?? null,
      par: CONCURSOS[number]?.par ?? null,
    })),
  );

  const vias = new Map(VIAS.map((via) => [via.key, id()]));
  for (const via of VIAS) {
    await insertar("CollaborationRoute", [
      {
        id: vias.get(via.key),
        key: via.key,
        number: via.number,
        title: via.title,
        subtitle: via.subtitle,
        cardCopy: via.cardCopy,
        ctaLabel: via.ctaLabel,
        formType: via.formType,
        sortOrder: via.number,
      },
    ]);
    await insertar("RouteItem", numerarElementos(via.items).map((item) => ({ id: id(), routeId: vias.get(via.key), ...item })));
  }

  await insertar(
    "Opportunity",
    numerarOportunidades().map((oportunidad) => ({
      id: id(),
      key: oportunidad.key,
      routeId: vias.get(oportunidad.route),
      holeId: oportunidad.hole ? hoyos.get(oportunidad.hole) : null,
      name: oportunidad.name,
      maxSponsors: oportunidad.maxSponsors ?? null,
      sortOrder: oportunidad.sortOrder,
    })),
  );

  // La Entrega 3 solo tenía estas dos categorías.
  const categorias = { "sin-categoria": id(), "bodega-vino": id() };
  await insertar("SponsorCategory", [
    { id: categorias["sin-categoria"], name: "Sin categoría", slug: "sin-categoria", requiresLegalReview: false, sortOrder: 0 },
    { id: categorias["bodega-vino"], name: "Bodega / vino", slug: "bodega-vino", requiresLegalReview: true, sortOrder: 1 },
  ]);
  await insertar(
    "Sponsor",
    ENTIDADES_HISTORICAS.map((entidad) => ({
      id: id(),
      name: entidad.name,
      slug: entidad.slug,
      relationshipType: entidad.relationshipType,
      temporalRelation: "HISTORICO",
      confirmed: true,
      source: entidad.source,
      sourceNote: entidad.sourceNote,
      categoryId: entidad.slug === "castillo-de-cuzcurrita" ? categorias["bodega-vino"] : categorias["sin-categoria"],
      publicVisibility: entidad.publicVisibility,
      logoPermission: "PENDIENTE",
      legalReview: entidad.legalReview,
      sortOrder: entidad.sortOrder,
      lifecycle: "ACTIVO",
    })),
  );

  const paginas = new Map(PAGINAS_LEGALES.map((pagina) => [pagina.slug, id()]));
  await insertar(
    "LegalPage",
    PAGINAS_LEGALES.map((pagina) => ({ id: paginas.get(pagina.slug), ...pagina, body: "", isComplete: false })),
  );
  const versionLegalId = id();
  await insertar("LegalVersion", [
    {
      id: versionLegalId,
      legalPageId: paginas.get("privacidad"),
      ...VERSION_LEGAL_SINTETICA,
      bodyHash: createHash("sha256").update(VERSION_LEGAL_SINTETICA.body).digest("hex"),
      publishedAt: new Date().toISOString(),
    },
  ]);
  for (const { archivada, leida, nota, status, ...propuesta } of PROPUESTAS_FICTICIAS) {
    const propuestaId = id();
    await insertar("Submission", [
      {
        id: propuestaId,
        ...propuesta,
        message: MENSAJE_FICTICIO,
        consentAt: new Date().toISOString(),
        consentLegalVersionId: versionLegalId,
        consentText: TEXTO_CONSENTIMIENTO,
        status,
        readAt: leida ? new Date().toISOString() : null,
        archivedAt: archivada ? new Date().toISOString() : null,
        isSynthetic: true,
      },
    ]);
    await insertar("SubmissionStatusHistory", [{ id: id(), submissionId: propuestaId, toStatus: "NUEVA" }]);
    if (nota) await insertar("SubmissionNote", [{ id: id(), submissionId: propuestaId, body: nota }]);
  }

  // Revisión publicada nº 1 y estado, como los dejó la publicación del seed de la Entrega 3.
  const snapshot = prepararSnapshot(borradorInicial("entrega-3"));
  const revisionId = id();
  const ahora = new Date().toISOString();
  await insertar("ContentRevision", [
    {
      id: revisionId,
      revisionNumber: 1,
      schemaVersion: 1,
      contentHash: hashContenido(snapshot),
      snapshot: JSON.stringify(snapshot),
      publishedAt: ahora,
      publishComment: "Versión inicial publicada por el seed",
    },
  ]);
  await insertar("SiteState", [{ id: 1, publishedRevisionId: revisionId, lastPublishedAt: ahora }]);
  await insertar("AuditLog", [
    {
      id: id(),
      action: "PUBLICACION",
      entityType: "ContentRevision",
      entityId: revisionId,
      summary: "Versión nº 1 publicada por el seed",
    },
  ]);

  await cliente.query("COMMIT");
  console.log("✔ Base E3 cargada como la dejó la Entrega 3.");
} catch (error) {
  await cliente.query("ROLLBACK");
  throw error;
} finally {
  await cliente.end();
}
