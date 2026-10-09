import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { ErrorPublicacion } from "@/lib/snapshot/construir";
import { esquemaSnapshot } from "@/lib/snapshot/esquema";
import { ConflictoDeVersion, publicar } from "@/server/publicacion";
import { sembrar } from "@/server/semilla/sembrar";

// Seed y publicación sobre una base vacía y migrada (SEMILLA_URL), distinta de la de los tests de 0001.
// En la aplicación se usa el adaptador de Neon; aquí, el de PostgreSQL, porque la base de CI es un contenedor.

const url = process.env.SEMILLA_URL;
if (!url) {
  throw new Error("Los tests del seed necesitan SEMILLA_URL apuntando a una base de CI vacía y migrada.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function snapshotPublicado() {
  const estado = await prisma.siteState.findUniqueOrThrow({
    where: { id: 1 },
    include: { publishedRevision: true },
  });
  return esquemaSnapshot.parse(estado.publishedRevision?.snapshot);
}

beforeAll(async () => {
  // El marcador de entorno lo fija el build antes del seed; aquí se simula ese paso.
  await prisma.policySettings.create({ data: { id: 1, environment: "NONPROD" } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("seed", () => {
  it("crea el contenido de partida y publica la versión nº 1", async () => {
    const resumen = await sembrar(prisma, { entorno: "NONPROD" });

    expect(resumen.publicada).toBe(1);
    expect(await prisma.pageSection.count()).toBe(5);
    expect(await prisma.heroFigure.count()).toBe(5);
    expect(await prisma.collaborationRoute.count()).toBe(4);
    expect(await prisma.competitionHole.count()).toBe(18);
    expect(await prisma.opportunity.count()).toBe(33);
    expect(await prisma.sponsor.count()).toBe(18);
    expect(await prisma.contentRevision.count()).toBe(1);
  });

  it("no crea administradores ni propuestas reales; las ficticias están marcadas", async () => {
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.submission.count({ where: { isSynthetic: false } })).toBe(0);
    expect(await prisma.submission.count({ where: { isSynthetic: true } })).toBe(4);
    const emails = await prisma.submission.findMany({ select: { email: true } });
    expect(emails.every(({ email }) => email.endsWith("@example.com"))).toBe(true);
  });

  it("registra Castillo de Cuzcurrita como histórico confirmado, oculto y con revisión jurídica pendiente", async () => {
    const castillo = await prisma.sponsor.findUniqueOrThrow({
      where: { slug: "castillo-de-cuzcurrita" },
      include: { category: true },
    });
    expect(castillo).toMatchObject({
      relationshipType: "PATROCINADOR",
      temporalRelation: "HISTORICO",
      confirmed: true,
      source: "ORGANIZACION",
      publicVisibility: false,
      logoPermission: "PENDIENTE",
      legalReview: "PENDIENTE",
      lifecycle: "ACTIVO",
    });
    expect(castillo.category).toMatchObject({ name: "Bodega / vino", requiresLegalReview: true });
  });

  it("deja ocultos y vacíos los datos que no se conocen", async () => {
    expect(await prisma.contactChannel.count()).toBe(0);
    expect(await prisma.competitionHole.count({ where: { OR: [{ showCourse: true }, { NOT: { course: null } }] } })).toBe(0);
    expect(await prisma.opportunity.count({ where: { showStatusPublicly: true } })).toBe(0);
    expect(await prisma.familyMember.count({ where: { NOT: { ageManual: null } } })).toBe(0);
    expect(await prisma.dayStep.count({ where: { NOT: { time: null } } })).toBe(0);
    const ajustes = await prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
    expect(ajustes).toMatchObject({ legalOwnerName: null, legalOwnerTaxId: null, legalOwnerAddress: null });
  });

  it("publica un snapshot válido sin datos privados", async () => {
    const snapshot = await snapshotPublicado();
    const json = JSON.stringify(snapshot);

    expect(snapshot.cierre?.historial.marcas).toHaveLength(17);
    expect(json).not.toContain("Castillo de Cuzcurrita");
    expect(json).not.toContain("example.com");
    expect(json).not.toContain("Información v3");
    expect(json).not.toContain("DISPONIBLE");
    expect(json).not.toMatch(/Junior|Senior/);
    expect(snapshot.colaborar.notaTransparencia).toBe(
      "Sin promesas infladas: no vendemos cifras que no podamos demostrar ni datos de participantes. Cualquier activación dentro del campo se acuerda primero con el club.",
    );
    expect(snapshot.colaborar.concursos.hoyos.map((hoyo) => hoyo.numero)).toEqual([3, 4, 6, 12, 16]);
    expect(snapshot.colaborar.concursos.hoyos.every((hoyo) => hoyo.campo === null)).toBe(true);
    expect(snapshot.familia?.titulo).toBe("La familia se reúne. La rivalidad viene sola.");
    expect(snapshot.familia?.miembros.every((miembro) => miembro.edad === null)).toBe(true);
  });

  it("es idempotente: una segunda ejecución no crea nada ni publica otra versión", async () => {
    const resumen = await sembrar(prisma, { entorno: "NONPROD" });
    expect(resumen).toEqual({ creados: {}, publicada: null });
    expect(await prisma.contentRevision.count()).toBe(1);
  });
});

describe("publicación", () => {
  it("no crea una versión nueva si el contenido no ha cambiado", async () => {
    const resultado = await publicar(prisma, { actorId: null });
    expect(resultado).toEqual({ publicada: false, numero: 1, motivo: "identica" });
    expect(await prisma.contentRevision.count()).toBe(1);
  });

  it("el seed nunca sobrescribe lo editado", async () => {
    await prisma.heroContent.updateMany({ data: { lead: "Texto editado en el panel", version: { increment: 1 } } });
    await sembrar(prisma, { entorno: "NONPROD" });
    const hero = await prisma.heroContent.findFirstOrThrow();
    expect(hero.lead).toBe("Texto editado en el panel");
  });

  it("publica el cambio como versión nº 2, actualiza el estado y lo audita", async () => {
    const resultado = await publicar(prisma, { actorId: null, versionEsperada: 1, comentario: "Prueba" });
    expect(resultado).toEqual({ publicada: true, numero: 2 });

    const estado = await prisma.siteState.findUniqueOrThrow({ where: { id: 1 }, include: { publishedRevision: true } });
    expect(estado.version).toBe(2);
    expect(estado.publishedRevision?.revisionNumber).toBe(2);
    expect((await snapshotPublicado()).hero.entradilla).toBe("Texto editado en el panel");
    expect(await prisma.auditLog.count({ where: { action: "PUBLICACION" } })).toBe(2);
    // La revisión anterior sigue intacta.
    const primera = await prisma.contentRevision.findUniqueOrThrow({ where: { revisionNumber: 1 } });
    expect(esquemaSnapshot.parse(primera.snapshot).hero.entradilla).not.toBe("Texto editado en el panel");
  });

  it("rechaza publicar sobre una versión que ya no es la vigente", async () => {
    await expect(publicar(prisma, { actorId: null, versionEsperada: 1 })).rejects.toThrow(ConflictoDeVersion);
  });

  it("no publica un borrador inválido y no deja nada a medias", async () => {
    await prisma.collaborationContent.updateMany({ data: { transparencyNote: "" } });
    await expect(publicar(prisma, { actorId: null })).rejects.toThrow(ErrorPublicacion);
    expect(await prisma.contentRevision.count()).toBe(2);
  });
});
