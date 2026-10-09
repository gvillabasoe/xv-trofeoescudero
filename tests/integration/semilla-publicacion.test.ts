import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { ErrorPublicacion } from "@/lib/snapshot/construir";
import { esquemaSnapshot } from "@/lib/snapshot/esquema";
import { buscarDatosPrivados } from "@/lib/snapshot/privacidad";
import { ConflictoDeVersion, publicar } from "@/server/publicacion";
import { aplicarBackfills } from "@/server/semilla/backfills";
import { bootstrap, CLAVE_CONTENIDO_INICIAL, ErrorBootstrap } from "@/server/semilla/bootstrap";
import { NOMBRES_ENTIDADES_V3 } from "@/server/semilla/datos";
import { DemoNoPermitida, reiniciarDemo, sembrarDemo } from "@/server/semilla/demo";
import { leerVersionPublicadaDe } from "@/server/version-publicada";

// Base 2 de CI (BOOTSTRAP_URL): base nueva, vacía y migrada. Los tests van en orden y comparten la base.
// En la aplicación se usa el adaptador de Neon; aquí, el de PostgreSQL, porque la base de CI es un contenedor.

const url = process.env.BOOTSTRAP_URL;
if (!url) {
  throw new Error("Falta BOOTSTRAP_URL: los tests del bootstrap necesitan la base 2 de CI.");
}

const crearCliente = () => new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const prisma = crearCliente();
const ENV_PREVIEW = { VERCEL_ENV: "preview", ENTORNO_DATOS: "NONPROD" };

async function recuentos() {
  return {
    bloques: await prisma.pageSection.count(),
    vias: await prisma.collaborationRoute.count(),
    textosVia: await prisma.routeItem.count(),
    hoyos: await prisma.competitionHole.count(),
    oportunidades: await prisma.opportunity.count(),
    categorias: await prisma.sponsorCategory.count(),
    entidades: await prisma.sponsor.count(),
    revisiones: await prisma.contentRevision.count(),
    propuestas: await prisma.submission.count(),
  };
}

beforeAll(async () => {
  // El marcador de entorno lo fija el build antes del bootstrap; aquí se simula ese paso.
  await prisma.policySettings.create({ data: { id: 1, environment: "NONPROD" } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("bootstrap · base nueva", () => {
  it("una base parcial sin SeedRun falla de forma segura y no cambia nada", async () => {
    await prisma.pageSection.create({ data: { key: "HERO", indexLabel: "01", sortOrder: 1 } });
    await expect(bootstrap(prisma, { entorno: "NONPROD" })).rejects.toThrow(ErrorBootstrap);
    expect(await prisma.seedRun.count()).toBe(0);
    expect(await prisma.pageSection.count()).toBe(1);
    await prisma.pageSection.deleteMany();
  });

  it("dos ejecuciones simultáneas inicializan la base una sola vez", async () => {
    const otro = crearCliente();
    try {
      const resultados = await Promise.all([
        bootstrap(prisma, { entorno: "NONPROD" }),
        bootstrap(otro, { entorno: "NONPROD" }),
      ]);
      const acciones = resultados.map((resultado) => resultado.accion).sort();
      expect(acciones).toEqual(["creado", "ya-registrado"]);
    } finally {
      await otro.$disconnect();
    }

    expect(await recuentos()).toEqual({
      bloques: 5,
      vias: 4,
      textosVia: 41,
      hoyos: 18,
      oportunidades: 33,
      categorias: 4,
      entidades: 18,
      revisiones: 1,
      propuestas: 0,
    });
    const seedRun = await prisma.seedRun.findUniqueOrThrow({ where: { key: CLAVE_CONTENIDO_INICIAL } });
    expect(seedRun).toMatchObject({ kind: "BOOTSTRAP", version: 1, environment: "NONPROD" });
    expect(await prisma.auditLog.count({ where: { action: "BOOTSTRAP_INICIAL", actorType: "SYSTEM", actorId: null } })).toBe(1);
    expect(await prisma.user.count()).toBe(0);
  });

  it("una segunda ejecución no modifica nada", async () => {
    const antes = await recuentos();
    const auditoria = await prisma.auditLog.count();
    expect(await bootstrap(prisma, { entorno: "NONPROD" })).toEqual({ accion: "ya-registrado" });
    expect(await recuentos()).toEqual(antes);
    expect(await prisma.auditLog.count()).toBe(auditoria);
  });

  it("un registro borrado después del bootstrap no reaparece", async () => {
    await prisma.opportunity.delete({ where: { key: "premios-sorteo" } });
    await bootstrap(prisma, { entorno: "NONPROD" });
    expect(await prisma.opportunity.findUnique({ where: { key: "premios-sorteo" } })).toBeNull();
  });

  it("el backfill de entidades históricas queda registrado sin cambios en una base nueva", async () => {
    const [resultado] = await aplicarBackfills(prisma, { entorno: "NONPROD" });
    expect(resultado).toMatchObject({ clave: "entidades-historicas-v1", estado: "aplicado", metadata: { cambios: [] } });
    const [repetido] = await aplicarBackfills(prisma, { entorno: "NONPROD" });
    expect(repetido).toEqual({ clave: "entidades-historicas-v1", estado: "ya-aplicado" });
  });
});

describe("entidades históricas", () => {
  it("son 18 y solo se concreta lo confirmado", async () => {
    const entidades = await prisma.sponsor.findMany({ include: { category: true } });
    expect(entidades).toHaveLength(18);
    const porSlug = new Map(entidades.map((entidad) => [entidad.slug, entidad]));

    expect(porSlug.get("castillo-de-cuzcurrita")).toMatchObject({
      relationshipType: "PATROCINADOR",
      temporalRelation: "HISTORICO",
      confirmed: true,
      source: "ORGANIZACION",
      publicVisibility: false,
      legalReview: "PENDIENTE",
      category: { name: "Bodega / vino", requiresLegalReview: true },
    });
    expect(porSlug.get("dalecandela")).toMatchObject({
      relationshipType: "COLABORACION_SOLIDARIA",
      editionsNote: "X edición",
      category: { slug: "colaboracion-solidaria" },
    });
    expect(porSlug.get("luz-de-mar")).toMatchObject({
      temporalRelation: "HISTORICO",
      currentRoleLabel: "AfterParty oficial",
      category: { slug: "afterparty-oficial" },
    });
    const restantes = entidades.filter(
      (entidad) => !["castillo-de-cuzcurrita", "dalecandela", "luz-de-mar"].includes(entidad.slug),
    );
    expect(restantes).toHaveLength(15);
    expect(restantes.every((entidad) => entidad.relationshipType === "PATROCINADOR_O_COLABORADOR")).toBe(true);
  });
});

describe("snapshot publicado", () => {
  it("es válido y no contiene datos privados, marcas ocultas ni prospección", async () => {
    const version = await leerVersionPublicadaDe(prisma);
    expect(version?.numero).toBe(1);
    const snapshot = esquemaSnapshot.parse(version?.snapshot);

    expect(buscarDatosPrivados(snapshot, { textosProhibidos: ["Castillo de Cuzcurrita", "Cuzcurrita"] })).toEqual([]);
    // Lista cerrada: solo entidades históricas de la v3. Cualquier otra marca (prospección) haría fallar el test.
    const permitidas = new Set<string>(NOMBRES_ENTIDADES_V3.map(([nombre]) => nombre));
    const marcas = snapshot.cierre?.historial.marcas.map((marca) => marca.nombre) ?? [];
    expect(marcas).toHaveLength(17);
    expect(marcas.every((marca) => permitidas.has(marca))).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain("DISPONIBLE");
  });

  it("dos lecturas devuelven la misma revisión y la misma huella", async () => {
    const [primera, segunda] = await Promise.all([leerVersionPublicadaDe(prisma), leerVersionPublicadaDe(prisma)]);
    expect(primera?.revisionId).toBe(segunda?.revisionId);
    expect(primera?.contentHash).toBe(segunda?.contentHash);
    expect(primera?.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("un cambio en el borrador no cambia la versión publicada", async () => {
    const antes = await leerVersionPublicadaDe(prisma);
    await prisma.heroContent.updateMany({ data: { lead: "Texto del borrador sin publicar", version: { increment: 1 } } });
    const despues = await leerVersionPublicadaDe(prisma);
    expect(despues?.revisionId).toBe(antes?.revisionId);
    expect(despues?.contentHash).toBe(antes?.contentHash);
    expect(despues?.snapshot.hero.entradilla).not.toBe("Texto del borrador sin publicar");
  });
});

describe("publicación", () => {
  it("publica el borrador como versión nº 2, actualiza el estado y lo audita", async () => {
    const resultado = await publicar(prisma, { actorId: null, versionEsperada: 1, comentario: "Prueba" });
    expect(resultado).toMatchObject({ publicada: true, numero: 2 });
    const estado = await prisma.siteState.findUniqueOrThrow({ where: { id: 1 } });
    expect(estado.version).toBe(2);
    expect((await leerVersionPublicadaDe(prisma))?.snapshot.hero.entradilla).toBe("Texto del borrador sin publicar");
    expect(await prisma.auditLog.count({ where: { action: "PUBLICACION" } })).toBe(2);
  });

  it("no crea una versión nueva si el contenido no ha cambiado", async () => {
    expect(await publicar(prisma, { actorId: null })).toEqual({ publicada: false, numero: 2, motivo: "identica", avisos: [] });
  });

  it("rechaza publicar sobre una versión que ya no es la vigente", async () => {
    await expect(publicar(prisma, { actorId: null, versionEsperada: 1 })).rejects.toThrow(ConflictoDeVersion);
  });

  it("no publica un borrador inválido y no deja nada a medias", async () => {
    await prisma.collaborationContent.updateMany({ data: { transparencyNote: "" } });
    await expect(publicar(prisma, { actorId: null })).rejects.toThrow(ErrorPublicacion);
    expect(await prisma.contentRevision.count()).toBe(2);
  });

  it("la revisión nº 1 sigue intacta y no se puede modificar", async () => {
    const primera = await prisma.contentRevision.findUniqueOrThrow({ where: { revisionNumber: 1 } });
    expect(primera.schemaVersion).toBe(2);
    expect(esquemaSnapshot.parse(primera.snapshot).hero.entradilla).not.toBe("Texto del borrador sin publicar");
    await expect(
      prisma.contentRevision.update({ where: { id: primera.id }, data: { publishComment: "cambio" } }),
    ).rejects.toThrow();
    const otraVez = await prisma.contentRevision.findUniqueOrThrow({ where: { id: primera.id } });
    expect(otraVez.publishComment).toBe(primera.publishComment);
  });
});

describe("datos demo", () => {
  it("fallan en el entorno Production de Vercel y sin NONPROD", async () => {
    await expect(sembrarDemo(prisma, { env: { VERCEL_ENV: "production", ENTORNO_DATOS: "NONPROD" } })).rejects.toThrow(
      DemoNoPermitida,
    );
    await expect(sembrarDemo(prisma, { env: { VERCEL_ENV: "preview", ENTORNO_DATOS: "PROD" } })).rejects.toThrow(
      DemoNoPermitida,
    );
    expect(await prisma.submission.count()).toBe(0);
  });

  it("solo se crean con una acción explícita, sintéticas y con emails example.com", async () => {
    expect(await sembrarDemo(prisma, { env: ENV_PREVIEW })).toEqual({ creadas: 4, existentes: 0 });
    const propuestas = await prisma.submission.findMany();
    expect(propuestas).toHaveLength(4);
    expect(propuestas.every((propuesta) => propuesta.isSynthetic && propuesta.email.endsWith("@example.com"))).toBe(true);
  });

  it("si se borran, no reaparecen con un nuevo despliegue (bootstrap y backfills)", async () => {
    await prisma.submission.deleteMany({ where: { isSynthetic: true } });
    await bootstrap(prisma, { entorno: "NONPROD" });
    await aplicarBackfills(prisma, { entorno: "NONPROD" });
    expect(await prisma.submission.count()).toBe(0);
  });

  it("el reset demo recrea solo los datos sintéticos y no toca el contenido editorial", async () => {
    await sembrarDemo(prisma, { env: ENV_PREVIEW });
    await prisma.user.create({ data: { id: "u-demo", name: "Administrador de prueba", email: "admin-demo@example.com", role: "admin" } });
    const antes = await recuentos();
    const revisionAntes = (await leerVersionPublicadaDe(prisma))?.revisionId;

    expect(await reiniciarDemo(prisma, { env: ENV_PREVIEW, actorId: "u-demo" })).toEqual({ borradas: 4, creadas: 4 });
    expect(await recuentos()).toEqual(antes);
    expect((await leerVersionPublicadaDe(prisma))?.revisionId).toBe(revisionAntes);
    await expect(reiniciarDemo(prisma, { env: { VERCEL_ENV: "production", ENTORNO_DATOS: "NONPROD" }, actorId: "u-demo" })).rejects.toThrow(
      DemoNoPermitida,
    );
  });
});
