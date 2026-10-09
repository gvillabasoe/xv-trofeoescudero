import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { hashContenido } from "@/lib/snapshot/hash";
import { leerSnapshotGuardado } from "@/lib/snapshot/leer";
import { publicar } from "@/server/publicacion";
import { aplicarBackfills } from "@/server/semilla/backfills";
import { bootstrap, CLAVE_CONTENIDO_INICIAL } from "@/server/semilla/bootstrap";
import { leerVersionPublicadaDe } from "@/server/version-publicada";

// Base 3 de CI (E3_URL): cargada como la dejó la Entrega 3 (tests/fixtures/cargar-entrega-3.ts) y después
// migrada con 0002. Es el mismo camino que seguirá la rama `preview` de Neon al desplegar la Entrega 4.

const url = process.env.E3_URL;
if (!url) {
  throw new Error("Falta E3_URL: este test necesita la base 3 de CI.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

afterAll(async () => {
  await prisma.$disconnect();
});

/** Todas las tablas que no deben cambiar al registrar SeedRun. */
async function foto() {
  return {
    siteSettings: await prisma.siteSettings.count(),
    bloques: await prisma.pageSection.count(),
    textosVia: await prisma.routeItem.count(),
    hoyos: await prisma.competitionHole.count(),
    oportunidades: await prisma.opportunity.count(),
    entidades: await prisma.sponsor.count(),
    paginasLegales: await prisma.legalPage.count(),
    propuestas: await prisma.submission.count(),
    revisiones: await prisma.contentRevision.count(),
    usuarios: await prisma.user.count(),
  };
}

describe("instalación de la Entrega 3", () => {
  it("la migración 0002 conserva los datos y marca la auditoría existente como SYSTEM", async () => {
    expect(await foto()).toEqual({
      siteSettings: 1,
      bloques: 5,
      textosVia: 41,
      hoyos: 18,
      oportunidades: 33,
      entidades: 18,
      paginasLegales: 2,
      propuestas: 4,
      revisiones: 1,
      usuarios: 0,
    });
    expect(await prisma.auditLog.count({ where: { actorType: "SYSTEM" } })).toBe(await prisma.auditLog.count());
  });

  it("el bootstrap verifica la instalación y registra solo SeedRun, sin recrear contenido", async () => {
    const antes = await foto();
    const revisionAntes = await leerVersionPublicadaDe(prisma);

    expect(await bootstrap(prisma, { entorno: "NONPROD" })).toEqual({ accion: "registrado", revisionNumero: 1 });

    expect(await foto()).toEqual(antes);
    const revisionDespues = await leerVersionPublicadaDe(prisma);
    expect(revisionDespues?.revisionId).toBe(revisionAntes?.revisionId);
    expect(revisionDespues?.contentHash).toBe(revisionAntes?.contentHash);

    const seedRun = await prisma.seedRun.findUniqueOrThrow({ where: { key: CLAVE_CONTENIDO_INICIAL } });
    expect(seedRun.metadata).toMatchObject({
      modo: "registro-instalacion-existente",
      propuestasSinteticas: 4,
      revisionPublicada: { revisionNumber: 1, schemaVersion: 1, contentHash: revisionAntes?.contentHash },
    });
    expect(await prisma.auditLog.count({ where: { action: "BOOTSTRAP_REGISTRADO" } })).toBe(1);
  });

  it("el backfill clasifica dalecandELA y Luz de Mar sin tocar visibilidad ni publicar", async () => {
    const [resultado] = await aplicarBackfills(prisma, { entorno: "NONPROD" });
    expect(resultado?.estado).toBe("aplicado");

    const dalecandela = await prisma.sponsor.findUniqueOrThrow({ where: { slug: "dalecandela" }, include: { category: true } });
    expect(dalecandela).toMatchObject({
      relationshipType: "COLABORACION_SOLIDARIA",
      editionsNote: "X edición",
      publicVisibility: true,
      category: { slug: "colaboracion-solidaria" },
    });
    const luz = await prisma.sponsor.findUniqueOrThrow({ where: { slug: "luz-de-mar" }, include: { category: true } });
    expect(luz).toMatchObject({ currentRoleLabel: "AfterParty oficial", publicVisibility: true, category: { slug: "afterparty-oficial" } });
    const castillo = await prisma.sponsor.findUniqueOrThrow({ where: { slug: "castillo-de-cuzcurrita" } });
    expect(castillo).toMatchObject({ publicVisibility: false, legalReview: "PENDIENTE" });

    // El cambio queda en el borrador: sigue publicada la revisión nº 1.
    expect(await prisma.contentRevision.count()).toBe(1);
    expect((await prisma.siteState.findUniqueOrThrow({ where: { id: 1 } })).hasUnpublishedChanges).toBe(true);
    expect(await prisma.auditLog.count({ where: { action: "BACKFILL_APLICADO" } })).toBe(1);
  });

  it("la revisión nº 1 (esquema 1) se sigue leyendo; publicar crea la nº 2 (esquema 2) sin tocar la nº 1", async () => {
    const primera = await prisma.contentRevision.findUniqueOrThrow({ where: { revisionNumber: 1 } });
    const lectura = leerSnapshotGuardado(primera.snapshot);
    expect(lectura.version).toBe(1);
    expect(hashContenido(lectura.guardado)).toBe(primera.contentHash);
    expect(lectura.snapshot.hero.imagen).toBeNull();

    const resultado = await publicar(prisma, { actorId: null, comentario: "Primera publicación con el código nuevo" });
    expect(resultado).toMatchObject({ publicada: true, numero: 2, avisos: [] });
    const segunda = await prisma.contentRevision.findUniqueOrThrow({ where: { revisionNumber: 2 } });
    expect(segunda.schemaVersion).toBe(2);
    const marcas = leerSnapshotGuardado(segunda.snapshot).snapshot.cierre?.historial.marcas ?? [];
    expect(marcas.find((marca) => marca.slug === "dalecandela")?.categoria).toBe("Colaboración solidaria");
    expect(marcas.some((marca) => marca.slug === "castillo-de-cuzcurrita")).toBe(false);

    const otraVez = await prisma.contentRevision.findUniqueOrThrow({ where: { revisionNumber: 1 } });
    expect(otraVez.contentHash).toBe(primera.contentHash);
    expect(otraVez.schemaVersion).toBe(1);
  });

  it("repetir bootstrap y backfills es un no-op, y lo borrado no reaparece", async () => {
    await prisma.submission.deleteMany({ where: { isSynthetic: true } });
    await prisma.opportunity.delete({ where: { key: "nombre-hoyo-7" } });
    const antes = await foto();

    expect(await bootstrap(prisma, { entorno: "NONPROD" })).toEqual({ accion: "ya-registrado" });
    expect(await aplicarBackfills(prisma, { entorno: "NONPROD" })).toEqual([
      { clave: "entidades-historicas-v1", estado: "ya-aplicado" },
    ]);
    expect(await foto()).toEqual(antes);
    expect(antes.propuestas).toBe(0);
  });
});
