import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Comprueba sobre un PostgreSQL real (contenedor de servicio de CI, datos de prueba) las reglas
// de 0001_inicial que Prisma no expresa en el esquema: CHECK y trigger append-only de AuditLog.

const url = process.env.DIRECT_URL;
if (!url) {
  throw new Error("Los tests de integración necesitan DIRECT_URL apuntando al PostgreSQL de CI.");
}

const cliente = new Client({ connectionString: url });

async function consulta(texto: string, valores: unknown[] = []) {
  return cliente.query(texto, valores);
}

beforeAll(async () => {
  await cliente.connect();
  await consulta(`INSERT INTO "PolicySettings" ("id", "environment") VALUES (1, 'NONPROD') ON CONFLICT ("id") DO NOTHING`);
});

afterAll(async () => {
  await cliente.end();
});

describe("estructura", () => {
  it("crea las 39 tablas del modelo (38 de 0001 y SeedRun de 0002)", async () => {
    const { rows } = await consulta(
      `SELECT count(*)::int AS "total" FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'`,
    );
    expect(rows[0].total).toBe(39);
  });
});

describe("AuditLog es de solo inserción", () => {
  it("permite insertar", async () => {
    const resultado = await consulta(
      `INSERT INTO "AuditLog" ("id", "action", "entityType", "summary") VALUES ('al-insertar', 'PUBLICACION', 'ContentRevision', 'prueba')`,
    );
    expect(resultado.rowCount).toBe(1);
  });

  it("rechaza modificar un registro", async () => {
    await consulta(`INSERT INTO "AuditLog" ("id", "action", "entityType") VALUES ('al-modificar', 'PUBLICACION', 'X')`);
    await expect(consulta(`UPDATE "AuditLog" SET "summary" = 'cambiado' WHERE "id" = 'al-modificar'`)).rejects.toThrow(
      /solo inserción/,
    );
  });

  it("rechaza borrar un registro reciente", async () => {
    await consulta(`INSERT INTO "AuditLog" ("id", "action", "entityType") VALUES ('al-reciente', 'PUBLICACION', 'X')`);
    await expect(consulta(`DELETE FROM "AuditLog" WHERE "id" = 'al-reciente'`)).rejects.toThrow(/solo inserción/);
  });

  it("rechaza TRUNCATE", async () => {
    await expect(consulta(`TRUNCATE "AuditLog"`)).rejects.toThrow(/TRUNCATE no está permitido/);
  });

  it("permite el borrado por antigüedad de la política de retención", async () => {
    await consulta(
      `INSERT INTO "AuditLog" ("id", "at", "action", "entityType") VALUES ('al-antiguo', now() - INTERVAL '25 months', 'PUBLICACION', 'X')`,
    );
    const resultado = await consulta(`DELETE FROM "AuditLog" WHERE "id" = 'al-antiguo'`);
    expect(resultado.rowCount).toBe(1);
  });

  it("deja el actor a NULL al eliminar un usuario, sin perder el registro", async () => {
    await consulta(`INSERT INTO "User" ("id", "name", "email") VALUES ('u-auditoria', 'Prueba', 'prueba@example.com')`);
    await consulta(
      `INSERT INTO "AuditLog" ("id", "actorId", "actorType", "action", "entityType", "summary") VALUES ('al-actor', 'u-auditoria', 'USER', 'USUARIO_CREADO', 'User', 'alta')`,
    );
    await consulta(`DELETE FROM "User" WHERE "id" = 'u-auditoria'`);
    const { rows } = await consulta(`SELECT "actorId", "summary" FROM "AuditLog" WHERE "id" = 'al-actor'`);
    expect(rows).toEqual([{ actorId: null, summary: "alta" }]);
  });

  it("no permite aprovechar esa excepción para cambiar otros campos", async () => {
    await consulta(`INSERT INTO "User" ("id", "name", "email") VALUES ('u-truco', 'Prueba', 'truco@example.com')`);
    await consulta(
      `INSERT INTO "AuditLog" ("id", "actorId", "actorType", "action", "entityType", "summary") VALUES ('al-truco', 'u-truco', 'USER', 'USUARIO_CREADO', 'User', 'original')`,
    );
    await expect(
      consulta(`UPDATE "AuditLog" SET "actorId" = NULL, "summary" = 'cambiado' WHERE "id" = 'al-truco'`),
    ).rejects.toThrow(/solo inserción/);
  });
});

describe("MediaUsage apunta exactamente a un destino", () => {
  beforeAll(async () => {
    await consulta(
      `INSERT INTO "MediaAsset" ("id", "kind", "privatePathname", "sourceMime", "sizeBytes", "width", "height", "megapixels", "sha256")
       VALUES ('m-prueba', 'LOGO', 'privado/m-prueba.png', 'image/png', 1000, 100, 100, 0.01, 'sha-prueba')`,
    );
    await consulta(`INSERT INTO "SponsorCategory" ("id", "name", "slug") VALUES ('c-prueba', 'Categoría de prueba', 'categoria-prueba')`);
    await consulta(
      `INSERT INTO "Sponsor" ("id", "name", "slug", "relationshipType", "temporalRelation", "source", "categoryId")
       VALUES ('s-prueba', 'Marca de prueba', 'marca-prueba', 'PATROCINADOR', 'HISTORICO', 'OTRA', 'c-prueba')`,
    );
    await consulta(
      `INSERT INTO "CollaborationRoute" ("id", "key", "number", "title", "subtitle", "cardCopy", "ctaLabel", "formType", "sortOrder")
       VALUES ('r-prueba', 'PECHO', 1, 'Título', 'Subtítulo', 'Texto', 'CTA', 'PATROCINADOR_PRINCIPAL_POLO', 1)`,
    );
  });

  it("rechaza un uso sin destino", async () => {
    await expect(
      consulta(`INSERT INTO "MediaUsage" ("id", "mediaId", "slot") VALUES ('mu-ninguno', 'm-prueba', 'PATROCINADOR_LOGO')`),
    ).rejects.toThrow(/MediaUsage_un_destino_check/);
  });

  it("rechaza un uso con dos destinos", async () => {
    await expect(
      consulta(
        `INSERT INTO "MediaUsage" ("id", "mediaId", "slot", "sponsorId", "routeId") VALUES ('mu-dos', 'm-prueba', 'PATROCINADOR_LOGO', 's-prueba', 'r-prueba')`,
      ),
    ).rejects.toThrow(/MediaUsage_un_destino_check/);
  });

  it("acepta un uso con un único destino", async () => {
    const resultado = await consulta(
      `INSERT INTO "MediaUsage" ("id", "mediaId", "slot", "sponsorId") VALUES ('mu-uno', 'm-prueba', 'PATROCINADOR_LOGO', 's-prueba')`,
    );
    expect(resultado.rowCount).toBe(1);
  });

  it("impide borrar un medio en uso", async () => {
    await expect(consulta(`DELETE FROM "MediaAsset" WHERE "id" = 'm-prueba'`)).rejects.toThrow(/MediaUsage_mediaId_fkey/);
  });

  it("limita el punto focal entre 0 y 1", async () => {
    await expect(consulta(`UPDATE "MediaAsset" SET "focalX" = 1.5 WHERE "id" = 'm-prueba'`)).rejects.toThrow(
      /MediaAsset_focal_check/,
    );
  });
});

describe("otras reglas", () => {
  it("PolicySettings es un singleton", async () => {
    await expect(
      consulta(`INSERT INTO "PolicySettings" ("id", "environment") VALUES (2, 'NONPROD')`),
    ).rejects.toThrow(/PolicySettings_singleton_check/);
  });

  it("la huella antiabuso dura 30 días como máximo en la política", async () => {
    await expect(consulta(`UPDATE "PolicySettings" SET "fingerprintMaxDays" = 31 WHERE "id" = 1`)).rejects.toThrow(
      /PolicySettings_fingerprintMaxDays_check/,
    );
  });

  it("en PROD no se puede desactivar el TOTP", async () => {
    await expect(
      consulta(`UPDATE "PolicySettings" SET "environment" = 'PROD', "requireTotp" = false WHERE "id" = 1`),
    ).rejects.toThrow(/PolicySettings_totp_en_produccion_check/);
  });

  it("HERO y COLABORAR no se pueden ocultar; los demás bloques sí", async () => {
    await expect(
      consulta(`INSERT INTO "PageSection" ("id", "key", "indexLabel", "isVisible", "sortOrder") VALUES ('ps-hero', 'HERO', '01', false, 1)`),
    ).rejects.toThrow(/PageSection_bloques_fijos_check/);
    const resultado = await consulta(
      `INSERT INTO "PageSection" ("id", "key", "indexLabel", "isVisible", "sortOrder") VALUES ('ps-familia', 'FAMILIA', '02', false, 2)`,
    );
    expect(resultado.rowCount).toBe(1);
  });

  it("los hoyos van del 1 al 18", async () => {
    await expect(consulta(`INSERT INTO "CompetitionHole" ("id", "number") VALUES ('h-19', 19)`)).rejects.toThrow(
      /CompetitionHole_number_check/,
    );
    const resultado = await consulta(`INSERT INTO "CompetitionHole" ("id", "number") VALUES ('h-18', 18)`);
    expect(resultado.rowCount).toBe(1);
  });

  it("los contadores antiabuso caducan en 30 días como máximo", async () => {
    await expect(
      consulta(
        `INSERT INTO "AbuseCounter" ("id", "fingerprint", "action", "windowStart", "expiresAt") VALUES ('ab-31', 'huella', 'FORM', now(), now() + INTERVAL '31 days')`,
      ),
    ).rejects.toThrow(/AbuseCounter_caducidad_check/);
    const resultado = await consulta(
      `INSERT INTO "AbuseCounter" ("id", "fingerprint", "action", "windowStart", "expiresAt") VALUES ('ab-1', 'huella', 'FORM', now(), now() + INTERVAL '1 day')`,
    );
    expect(resultado.rowCount).toBe(1);
  });
});
