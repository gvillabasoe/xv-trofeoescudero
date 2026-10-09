import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { leerSnapshotGuardado } from "@/lib/snapshot/leer";
import type { DatosPropuesta } from "@/lib/proponer";
import { publicarVersionLegal, ErrorLegal } from "@/server/legal";
import { obtenerAlmacen } from "@/server/medios/almacen";
import {
  ErrorMedio,
  asignarMedio,
  cambiarEstadoMedio,
  claveDestino,
  guardarMetadatos,
  listarDestinos,
  purgarRetiradas,
  retirarMedio,
  subirMedio,
} from "@/server/medios/biblioteca";
import { ImagenRechazada } from "@/server/medios/procesar";
import { MENSAJE_CONFLICTO, borrarEntidad, crearEntidad, guardarEntidad, moverEntidad } from "@/server/panel/entidades";
import { informePublicacion } from "@/server/panel/informe";
import { anadirNota, anonimizar, archivar, cambiarEstado, eliminar, listarPropuestas } from "@/server/propuestas/bandeja";
import { exportarPropuestas } from "@/server/propuestas/csv";
import { DemasiadosEnvios, FormularioCerrado, PrivacidadCambiada, registrarPropuesta } from "@/server/propuestas/crear";
import { publicar, restaurarRevision } from "@/server/publicacion";
import { bootstrap } from "@/server/semilla/bootstrap";
import { ejecutarRetencion } from "@/server/trabajos/retencion";
import { leerVersionPublicadaDe } from "@/server/version-publicada";

// Base 5 de CI (CMS_URL): nueva y migrada. CMS, imágenes, textos legales, propuestas, bandeja y retención.
// Las imágenes se guardan en una carpeta temporal (almacén de disco), nunca en Vercel Blob.

const url = process.env.CMS_URL;
if (!url) throw new Error("Falta CMS_URL: este test necesita la base 5 de CI.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const ADMIN = "u-admin-cms";
let carpeta = "";

function formulario(campos: Record<string, string>): FormData {
  const datos = new FormData();
  for (const [nombre, valor] of Object.entries(campos)) datos.set(nombre, valor);
  return datos;
}

const PROPUESTA: DatosPropuesta = {
  nombre: "Persona de Prueba",
  empresa: "Empresa de Prueba",
  cargo: null,
  email: "Persona@Example.com",
  telefono: null,
  tipo: "HOYO",
  mensaje: "Nos gustaría poner nombre a un hoyo en los materiales digitales.",
  privacidad: "si",
};

const TEXTO_LEGAL = `## Responsable\n${"Texto legal de prueba para la base desechable de CI. ".repeat(6)}`;

beforeAll(async () => {
  await prisma.policySettings.create({ data: { id: 1, environment: "NONPROD" } });
  await bootstrap(prisma, { entorno: "NONPROD" });
  await prisma.user.create({ data: { id: ADMIN, name: "Administración CMS", email: "cms@example.com", role: "admin" } });
  carpeta = await mkdtemp(path.join(os.tmpdir(), "trofeo-medios-"));
});

afterAll(async () => {
  await prisma.$disconnect();
  if (carpeta) await rm(carpeta, { recursive: true, force: true });
});

describe("CMS: edición con control de versión", () => {
  it("guarda, marca el borrador como modificado y audita", async () => {
    const hero = await prisma.heroContent.findFirstOrThrow();
    const campos = {
      eyebrow: hero.eyebrow,
      titleLine1: hero.titleLine1,
      titleLine2: hero.titleLine2 ?? "",
      lead: "Entradilla editada desde el panel.",
      primaryCtaLabel: hero.primaryCtaLabel,
      secondaryCtaLabel: hero.secondaryCtaLabel,
      brandCardTitle: hero.brandCardTitle,
      brandCardText: hero.brandCardText,
      brandCardLinkLabel: hero.brandCardLinkLabel,
    };
    const resultado = await guardarEntidad(prisma, {
      clave: "hero",
      id: hero.id,
      version: hero.version,
      formulario: formulario(campos),
      actorId: ADMIN,
    });
    expect(resultado).toEqual({ ok: true });
    const despues = await prisma.heroContent.findUniqueOrThrow({ where: { id: hero.id } });
    expect(despues).toMatchObject({ lead: "Entradilla editada desde el panel.", version: hero.version + 1, updatedById: ADMIN });
    expect((await prisma.siteState.findUniqueOrThrow({ where: { id: 1 } })).hasUnpublishedChanges).toBe(true);
    expect(await prisma.auditLog.count({ where: { action: "CONTENIDO_GUARDADO", actorId: ADMIN } })).toBe(1);

    // Con la versión antigua no se pisa nada.
    const conflicto = await guardarEntidad(prisma, {
      clave: "hero",
      id: hero.id,
      version: hero.version,
      formulario: formulario({ ...campos, lead: "Cambio perdido" }),
      actorId: ADMIN,
    });
    expect(conflicto).toEqual({ ok: false, mensaje: MENSAJE_CONFLICTO });
    expect((await prisma.heroContent.findUniqueOrThrow({ where: { id: hero.id } })).lead).toBe("Entradilla editada desde el panel.");
  });

  it("rechaza claves que no están en el registro y valida los campos", async () => {
    expect(await guardarEntidad(prisma, { clave: "user", id: ADMIN, version: 1, formulario: formulario({}), actorId: ADMIN })).toMatchObject({
      ok: false,
    });
    const bloque = await prisma.pageSection.findUniqueOrThrow({ where: { key: "HERO" } });
    expect(
      await guardarEntidad(prisma, {
        clave: "bloque",
        id: bloque.id,
        version: bloque.version,
        formulario: formulario({ indexLabel: "01 / Inicio" }),
        actorId: ADMIN,
      }),
    ).toEqual({ ok: false, errores: { isVisible: "Este bloque es obligatorio: no se puede ocultar." } });
  });

  it("crea, reordena y borra elementos de una lista", async () => {
    const hero = await prisma.heroFigure.findFirstOrThrow({ orderBy: { sortOrder: "desc" } });
    const creado = await crearEntidad(prisma, {
      clave: "cifra",
      padreId: hero.heroId,
      formulario: formulario({ label: "Prueba", value: "1", caption: "", internalSource: "", isVisible: "si" }),
      actorId: ADMIN,
    });
    expect(creado.ok).toBe(true);
    const nueva = await prisma.heroFigure.findFirstOrThrow({ where: { label: "Prueba" } });
    expect(nueva.sortOrder).toBe(hero.sortOrder + 1);

    expect(await moverEntidad(prisma, { clave: "cifra", id: nueva.id, direccion: "arriba", actorId: ADMIN })).toEqual({ ok: true });
    expect((await prisma.heroFigure.findUniqueOrThrow({ where: { id: nueva.id } })).sortOrder).toBe(hero.sortOrder);
    expect((await prisma.heroFigure.findUniqueOrThrow({ where: { id: hero.id } })).sortOrder).toBe(hero.sortOrder + 1);

    const actual = await prisma.heroFigure.findUniqueOrThrow({ where: { id: nueva.id } });
    expect(await borrarEntidad(prisma, { clave: "cifra", id: nueva.id, version: actual.version, actorId: ADMIN })).toEqual({ ok: true });
    expect(await prisma.heroFigure.count({ where: { label: "Prueba" } })).toBe(0);
  });

  it("solo se registran entidades confirmadas como visibles, y una categoría con entidades no se borra", async () => {
    const categoria = await prisma.sponsorCategory.findFirstOrThrow({ where: { slug: "sin-categoria" } });
    const base = {
      name: "Entidad Nueva",
      relationshipType: "COLABORADOR",
      temporalRelation: "ACTUAL",
      source: "ORGANIZACION",
      categoryId: categoria.id,
      logoPermission: "PENDIENTE",
      legalReview: "NO_REQUERIDA",
      publicVisibility: "si",
    };
    expect(await crearEntidad(prisma, { clave: "patrocinador", padreId: null, formulario: formulario(base), actorId: ADMIN })).toEqual({
      ok: false,
      errores: { publicVisibility: "Solo se pueden mostrar relaciones confirmadas." },
    });
    const creada = await crearEntidad(prisma, {
      clave: "patrocinador",
      padreId: null,
      formulario: formulario({ ...base, confirmed: "si" }),
      actorId: ADMIN,
    });
    expect(creada.ok).toBe(true);
    expect(await prisma.sponsor.findUniqueOrThrow({ where: { slug: "entidad-nueva" } })).toMatchObject({ lifecycle: "ACTIVO" });

    const bodega = await prisma.sponsorCategory.findFirstOrThrow({ where: { slug: "bodega-vino" } });
    expect(
      await crearEntidad(prisma, {
        clave: "patrocinador",
        padreId: null,
        formulario: formulario({ ...base, name: "Otra bodega", confirmed: "si", publicVisibility: "", categoryId: bodega.id }),
        actorId: ADMIN,
      }),
    ).toEqual({ ok: false, errores: { legalReview: "Esta categoría exige revisión jurídica: elige Pendiente, Aprobada o Rechazada." } });

    expect(await borrarEntidad(prisma, { clave: "categoria", id: categoria.id, version: categoria.version, actorId: ADMIN })).toEqual({
      ok: false,
      mensaje: "No se puede borrar: hay otros elementos que dependen de este.",
    });
  });
});

describe("textos legales", () => {
  it("sin política de privacidad publicada, el formulario está cerrado y no se guarda nada", async () => {
    await expect(
      registrarPropuesta(prisma, {
        datos: PROPUESTA,
        origen: { tipo: null, via: null, hoyo: null },
        versionLegalId: "ninguna",
        huella: "huella-cerrado",
      }),
    ).rejects.toThrow(FormularioCerrado);
    expect(await prisma.submission.count()).toBe(0);
  });

  it("solo se publica un texto completo, largo y sin «[PENDIENTE]», y no se duplica", async () => {
    const pagina = await prisma.legalPage.findUniqueOrThrow({ where: { slug: "privacidad" } });
    await expect(publicarVersionLegal(prisma, { paginaId: pagina.id, version: pagina.version, actorId: ADMIN })).rejects.toThrow(ErrorLegal);

    await prisma.legalPage.update({ where: { id: pagina.id }, data: { body: `${TEXTO_LEGAL}\n[PENDIENTE]`, isComplete: true, version: { increment: 1 } } });
    await expect(publicarVersionLegal(prisma, { paginaId: pagina.id, version: pagina.version + 1, actorId: ADMIN })).rejects.toThrow(
      /PENDIENTE/,
    );

    await prisma.legalPage.update({ where: { id: pagina.id }, data: { body: TEXTO_LEGAL, version: { increment: 1 } } });
    expect(await publicarVersionLegal(prisma, { paginaId: pagina.id, version: pagina.version + 2, actorId: ADMIN })).toEqual({
      etiqueta: "v1",
      nueva: true,
    });
    expect(await publicarVersionLegal(prisma, { paginaId: pagina.id, version: pagina.version + 2, actorId: ADMIN })).toEqual({
      etiqueta: "v1",
      nueva: false,
    });
  });
});

describe("propuestas", () => {
  it("con la privacidad publicada, se guarda con el consentimiento y su versión exacta", async () => {
    const vigente = await prisma.legalVersion.findFirstOrThrow();
    const { id } = await registrarPropuesta(prisma, {
      datos: PROPUESTA,
      origen: { tipo: "HOYO", via: "JUEGO", hoyo: 7 },
      versionLegalId: vigente.id,
      huella: "huella-1",
      contexto: { sourcePath: "/proponer", referrer: "https://buscador.example/ruta?q=1", utm: { utm_source: "prueba" } },
    });
    const guardada = await prisma.submission.findUniqueOrThrow({ where: { id }, include: { statusHistory: true } });
    expect(guardada).toMatchObject({
      email: "persona@example.com",
      collaborationType: "HOYO",
      originRouteKey: "JUEGO",
      originHoleNumber: 7,
      consentLegalVersionId: vigente.id,
      consentText: "He leído y acepto la política de privacidad.",
      referrer: "https://buscador.example",
      utmSource: "prueba",
      isSynthetic: false,
      status: "NUEVA",
    });
    expect(guardada.statusHistory).toHaveLength(1);
  });

  it("si la política cambió mientras se escribía, se pide aceptar la nueva", async () => {
    await expect(
      registrarPropuesta(prisma, { datos: PROPUESTA, origen: { tipo: null, via: null, hoyo: null }, versionLegalId: "antigua", huella: "huella-2" }),
    ).rejects.toThrow(PrivacidadCambiada);
  });

  it("limita los envíos por huella: el sexto en 15 minutos se rechaza", async () => {
    const vigente = await prisma.legalVersion.findFirstOrThrow();
    const ahora = new Date("2026-10-09T10:00:00.000Z");
    const enviar = () =>
      registrarPropuesta(prisma, {
        datos: { ...PROPUESTA, empresa: "Límite" },
        origen: { tipo: null, via: null, hoyo: null },
        versionLegalId: vigente.id,
        huella: "huella-limite",
        ahora,
      });
    for (let i = 0; i < 5; i += 1) await enviar();
    await expect(enviar()).rejects.toThrow(DemasiadosEnvios);
  });

});

describe("bandeja", () => {
  it("estado, nota, archivo, CSV auditado sin datos demo, anonimización y borrado", async () => {
    const propuesta = await prisma.submission.findFirstOrThrow({ where: { company: "Empresa de Prueba" } });
    await cambiarEstado(prisma, { id: propuesta.id, version: propuesta.version, estado: "CONTACTADA", nota: "Primer contacto", actorId: ADMIN });
    await expect(
      cambiarEstado(prisma, { id: propuesta.id, version: propuesta.version, estado: "CERRADA", nota: null, actorId: ADMIN }),
    ).rejects.toThrow(/Otra persona/);
    await anadirNota(prisma, { id: propuesta.id, texto: "Nota interna de prueba", actorId: ADMIN });
    const conEstado = await prisma.submission.findUniqueOrThrow({ where: { id: propuesta.id }, include: { statusHistory: true, notes: true } });
    expect(conEstado.status).toBe("CONTACTADA");
    expect(conEstado.statusHistory.map((cambio) => cambio.toStatus)).toEqual(["NUEVA", "CONTACTADA"]);
    expect(conEstado.notes).toHaveLength(1);

    await prisma.submission.create({
      data: {
        name: "Ficticia",
        company: "Demo",
        email: "demo@example.com",
        collaborationType: "OTRA",
        formOrigin: "demo",
        message: "Propuesta ficticia de demostración.",
        consentAt: new Date(),
        consentLegalVersionId: conEstado.consentLegalVersionId,
        consentText: "demo",
        isSynthetic: true,
      },
    });
    const { csv, total } = await exportarPropuestas(prisma, { filtro: { archivo: "todas" }, actorId: ADMIN });
    expect(csv).toContain("Empresa de Prueba");
    expect(csv).not.toContain("Demo");
    expect(total).toBe(6);
    expect(await prisma.auditLog.count({ where: { action: "EXPORTACION_CSV" } })).toBe(1);
    const auditoria = JSON.stringify(await prisma.auditLog.findMany({ select: { summary: true } }));
    expect(auditoria).not.toContain("persona@example.com");
    expect(auditoria).not.toContain("Nota interna de prueba");

    await archivar(prisma, { id: propuesta.id, version: conEstado.version, archivar: true, actorId: ADMIN });
    expect((await listarPropuestas(prisma, { archivo: "activas", texto: "Empresa de Prueba" })).total).toBe(0);
    expect((await listarPropuestas(prisma, { archivo: "archivadas", texto: "Empresa de Prueba" })).total).toBe(1);

    const archivada = await prisma.submission.findUniqueOrThrow({ where: { id: propuesta.id } });
    await anonimizar(prisma, { id: propuesta.id, version: archivada.version, actorId: ADMIN });
    const anonima = await prisma.submission.findUniqueOrThrow({ where: { id: propuesta.id }, include: { notes: true, statusHistory: true } });
    expect(anonima).toMatchObject({ name: "Propuesta anonimizada", company: "", email: "", message: "", phone: null, utmSource: null });
    expect(anonima.anonymizedAt).not.toBeNull();
    expect(anonima.notes).toHaveLength(0);
    expect(anonima.statusHistory.every((cambio) => cambio.note === null)).toBe(true);
    await expect(anadirNota(prisma, { id: propuesta.id, texto: "otra", actorId: ADMIN })).rejects.toThrow(/anonimizada/);

    await eliminar(prisma, { id: propuesta.id, version: anonima.version, actorId: ADMIN });
    expect(await prisma.submission.findUnique({ where: { id: propuesta.id } })).toBeNull();
    expect(await prisma.auditLog.count({ where: { action: "PROPUESTA_ELIMINADA", entityId: propuesta.id } })).toBe(1);
  });
});

describe("imágenes", () => {
  let medioId = "";

  it("rechaza archivos que no son imágenes y guarda variantes sin metadatos", async () => {
    const almacen = obtenerAlmacen({ ALMACEN_LOCAL_DIR: carpeta });
    if (!almacen) throw new Error("Sin almacén de disco");
    await expect(subirMedio(prisma, almacen, { datos: Buffer.from("<svg onload=alert(1)>"), tipo: "FOTO", actorId: ADMIN })).rejects.toThrow(
      ImagenRechazada,
    );
    const foto = await sharp({ create: { width: 2000, height: 1200, channels: 3, background: "#12382c" } })
      .withExif({ IFD0: { Copyright: "dato-privado" } })
      .jpeg()
      .toBuffer();
    const { id, duplicada } = await subirMedio(prisma, almacen, { datos: foto, tipo: "FOTO", actorId: ADMIN });
    expect(duplicada).toBe(false);
    medioId = id;
    const medio = await prisma.mediaAsset.findUniqueOrThrow({ where: { id }, include: { variants: true } });
    expect(medio).toMatchObject({ reviewState: "SUBIDA", width: 2000, height: 1200, sourceMime: "image/jpeg" });
    expect(medio.variants.map((variante) => `${variante.format}-${variante.width}`).sort()).toEqual([
      "JPEG-1200",
      "WEBP-1280",
      "WEBP-1920",
      "WEBP-640",
    ]);
    const archivos = await readdir(path.join(carpeta, "variantes"));
    expect(archivos.filter((archivo) => !archivo.endsWith(".tipo"))).toHaveLength(4);
    const maestro = await sharp(path.join(carpeta, medio.privatePathname)).metadata();
    expect(maestro.exif).toBeUndefined();
    expect((await subirMedio(prisma, almacen, { datos: foto, tipo: "FOTO", actorId: ADMIN })).duplicada).toBe(true);
  });

  it("no se autoriza sin texto alternativo; autorizada, asignada y publicada, queda referenciada", async () => {
    const medio = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: medioId } });
    await expect(cambiarEstadoMedio(prisma, { id: medioId, version: medio.version, cambio: "autorizar", actorId: ADMIN })).rejects.toThrow(
      ErrorMedio,
    );
    await guardarMetadatos(prisma, {
      id: medioId,
      version: medio.version,
      actorId: ADMIN,
      datos: {
        kind: "FOTO",
        altText: "Prueba en verde",
        caption: null,
        description: null,
        focalX: 0.5,
        focalY: 0.5,
        hasIdentifiablePeople: false,
        includesMinors: false,
        consentConfirmed: false,
        guardianConsentConfirmed: false,
      },
    });
    await cambiarEstadoMedio(prisma, { id: medioId, version: medio.version + 1, cambio: "autorizar", actorId: ADMIN });
    const hero = await prisma.heroContent.findFirstOrThrow();
    const destinos = await listarDestinos(prisma);
    expect(destinos.some((destino) => destino.clave === claveDestino("HERO_IMAGEN", hero.id))).toBe(true);
    await expect(asignarMedio(prisma, { mediaId: medioId, destino: claveDestino("PATROCINADOR_LOGO", "x"), actorId: ADMIN })).rejects.toThrow(
      /logo/,
    );
    await asignarMedio(prisma, { mediaId: medioId, destino: claveDestino("HERO_IMAGEN", hero.id), actorId: ADMIN });

    const informe = await informePublicacion(prisma);
    expect(informe.errores).toEqual([]);
    expect(informe.cambios).toContain("Hero y cifras");

    const resultado = await publicar(prisma, { actorId: ADMIN });
    expect(resultado.publicada).toBe(true);
    const version = await leerVersionPublicadaDe(prisma);
    expect(version?.snapshot.hero.imagen?.alt).toBe("Prueba en verde");
    expect(await prisma.revisionMediaRef.count({ where: { mediaId: medioId } })).toBe(1);
    expect((await prisma.mediaAsset.findUniqueOrThrow({ where: { id: medioId } })).reviewState).toBe("PUBLICADA");
  });

  it("restaurar una versión revisa los derechos de hoy: una imagen retirada no vuelve", async () => {
    const version = await leerVersionPublicadaDe(prisma);
    const medio = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: medioId } });
    await retirarMedio(prisma, { id: medioId, version: medio.version, motivo: "CONSENTIMIENTO_RETIRADO", actorId: ADMIN });
    expect(await prisma.mediaUsage.count({ where: { mediaId: medioId } })).toBe(0);

    const restaurada = await restaurarRevision(prisma, { numero: version?.numero ?? 0, actorId: ADMIN });
    expect(restaurada.retirado).toEqual(["Imagen de la portada: está retirada."]);
    const ahora = await leerVersionPublicadaDe(prisma);
    expect(ahora?.snapshot.hero.imagen).toBeNull();
    expect(ahora?.snapshot.hero.entradilla).toBe(version?.snapshot.hero.entradilla);
    const fila = await prisma.contentRevision.findUniqueOrThrow({ where: { id: restaurada.revisionId } });
    expect(fila.sourceRevisionId).toBe(version?.revisionId);
    expect(leerSnapshotGuardado(fila.snapshot).version).toBe(2);
    expect((await prisma.siteState.findUniqueOrThrow({ where: { id: 1 } })).hasUnpublishedChanges).toBe(true);
  });

  it("la purga borra los archivos de las retiradas y conserva el registro que usan versiones publicadas", async () => {
    const almacen = obtenerAlmacen({ ALMACEN_LOCAL_DIR: carpeta });
    expect(await purgarRetiradas(prisma, almacen, { dias: 30 })).toBe(0);
    const dentroDeUnMes = new Date(Date.now() + 31 * 86_400_000);
    expect(await purgarRetiradas(prisma, almacen, { dias: 30, ahora: dentroDeUnMes })).toBe(1);
    expect(await prisma.mediaVariant.count({ where: { mediaId: medioId } })).toBe(0);
    expect(await prisma.mediaAsset.findUnique({ where: { id: medioId } })).not.toBeNull();
    const restantes = (await readdir(path.join(carpeta, "variantes"))).filter((archivo) => archivo.startsWith(medioId));
    expect(restantes).toEqual([]);
  });
});

describe("tarea de retención", () => {
  it("anonimiza lo caducado, borra contadores y sesiones vencidas y recorta la auditoría antigua", async () => {
    const vigente = await prisma.legalVersion.findFirstOrThrow();
    const antigua = await prisma.submission.create({
      data: {
        name: "Antigua",
        company: "Antigua S. L.",
        email: "antigua@example.com",
        collaborationType: "OTRA",
        formOrigin: "/proponer",
        message: "Propuesta de hace tres años.",
        consentAt: new Date("2023-01-01T00:00:00.000Z"),
        consentLegalVersionId: vigente.id,
        consentText: "He leído y acepto la política de privacidad.",
        lastActivityAt: new Date("2023-01-01T00:00:00.000Z"),
      },
    });
    await prisma.abuseCounter.create({
      data: { fingerprint: "vieja", action: "FORM", windowStart: new Date("2026-01-01T00:00:00.000Z"), expiresAt: new Date("2026-01-01T00:16:00.000Z") },
    });
    await prisma.auditLog.create({
      data: { action: "CONTENIDO_GUARDADO", entityType: "prueba", summary: "Registro muy antiguo", at: new Date("2020-01-01T00:00:00.000Z") },
    });

    const resumen = await ejecutarRetencion(prisma, { almacen: null });
    expect(resumen.propuestasAnonimizadas).toBe(1);
    expect(resumen.contadoresBorrados).toBeGreaterThanOrEqual(1);
    expect(resumen.auditoriaBorrada).toBe(1);
    expect((await prisma.submission.findUniqueOrThrow({ where: { id: antigua.id } })).name).toBe("Propuesta anonimizada");
    expect(await prisma.auditLog.count({ where: { summary: "Registro muy antiguo" } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: "RETENCION_EJECUTADA" } })).toBe(1);

    // Idempotente: una segunda ejecución no encuentra nada nuevo.
    expect((await ejecutarRetencion(prisma, { almacen: null })).propuestasAnonimizadas).toBe(0);
  });
});
