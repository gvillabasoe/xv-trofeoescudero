import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Reglas SQL de 0002_seedrun sobre la base 1 de CI (trofeo_ci, datos de prueba).

const url = process.env.DIRECT_URL;
if (!url) {
  throw new Error("Los tests de integración necesitan DIRECT_URL apuntando al PostgreSQL de CI.");
}

const cliente = new Client({ connectionString: url });
const HASH = "a".repeat(64);

beforeAll(async () => {
  await cliente.connect();
  await cliente.query(`INSERT INTO "PolicySettings" ("id", "environment") VALUES (1, 'NONPROD') ON CONFLICT ("id") DO NOTHING`);
  await cliente.query(
    `INSERT INTO "ContentRevision" ("id", "revisionNumber", "schemaVersion", "contentHash", "snapshot", "publishedAt")
     VALUES ('rev-0002', 900, 1, $1, '{"version": 1}', now())`,
    [HASH],
  );
});

afterAll(async () => {
  await cliente.end();
});

describe("ContentRevision", () => {
  it("una revisión publicada es inmutable", async () => {
    await expect(cliente.query(`UPDATE "ContentRevision" SET "publishComment" = 'cambio' WHERE "id" = 'rev-0002'`)).rejects.toThrow(
      /inmutable/,
    );
    await expect(cliente.query(`UPDATE "ContentRevision" SET "snapshot" = '{"version": 2}' WHERE "id" = 'rev-0002'`)).rejects.toThrow(
      /inmutable/,
    );
  });

  it("no admite otra revisión con el mismo número", async () => {
    await expect(
      cliente.query(
        `INSERT INTO "ContentRevision" ("id", "revisionNumber", "schemaVersion", "contentHash", "snapshot", "publishedAt")
         VALUES ('rev-0002-bis', 900, 1, $1, '{"version": 1}', now())`,
        [HASH],
      ),
    ).rejects.toThrow(/ContentRevision_revisionNumber_key/);
  });

  it("exige una huella SHA-256 y un snapshot que sea un objeto", async () => {
    await expect(
      cliente.query(
        `INSERT INTO "ContentRevision" ("id", "revisionNumber", "schemaVersion", "contentHash", "snapshot", "publishedAt")
         VALUES ('rev-mala', 901, 1, 'no-es-un-hash', '{"version": 1}', now())`,
      ),
    ).rejects.toThrow(/ContentRevision_integridad_check/);
    await expect(
      cliente.query(
        `INSERT INTO "ContentRevision" ("id", "revisionNumber", "schemaVersion", "contentHash", "snapshot", "publishedAt")
         VALUES ('rev-mala', 901, 1, $1, '[]', now())`,
        [HASH],
      ),
    ).rejects.toThrow(/ContentRevision_integridad_check/);
  });

  it("SiteState solo puede apuntar a una revisión que existe", async () => {
    await expect(
      cliente.query(`INSERT INTO "SiteState" ("id", "publishedRevisionId") VALUES (1, 'no-existe')`),
    ).rejects.toThrow(/SiteState_publishedRevisionId_fkey/);
  });
});

describe("SeedRun", () => {
  it("cada clave solo se registra una vez", async () => {
    const insertar = () =>
      cliente.query(
        `INSERT INTO "SeedRun" ("id", "key", "kind", "version", "checksum", "environment", "completedAt")
         VALUES (gen_random_uuid()::text, 'prueba-unica-v1', 'BACKFILL', 1, $1, 'NONPROD', now())`,
        [HASH],
      );
    await insertar();
    await expect(insertar()).rejects.toThrow(/SeedRun_key_key/);
  });

  it("exige clave legible, versión positiva y huella SHA-256", async () => {
    await expect(
      cliente.query(
        `INSERT INTO "SeedRun" ("id", "key", "kind", "version", "checksum", "environment", "completedAt")
         VALUES ('sr-mala', 'Clave Mala', 'BACKFILL', 0, 'x', 'NONPROD', now())`,
      ),
    ).rejects.toThrow(/SeedRun_integridad_check/);
  });
});

describe("AuditLog", () => {
  it("una acción del sistema nunca tiene usuario", async () => {
    await cliente.query(`INSERT INTO "User" ("id", "name", "email") VALUES ('u-0002', 'Prueba', 'prueba-0002@example.com')`);
    await expect(
      cliente.query(
        `INSERT INTO "AuditLog" ("id", "actorId", "actorType", "action", "entityType") VALUES ('al-0002', 'u-0002', 'SYSTEM', 'PUBLICACION', 'X')`,
      ),
    ).rejects.toThrow(/AuditLog_actor_check/);
  });

  it("el trigger de solo inserción también protege actorType", async () => {
    await cliente.query(
      `INSERT INTO "AuditLog" ("id", "actorId", "actorType", "action", "entityType") VALUES ('al-0002-b', 'u-0002', 'USER', 'PUBLICACION', 'X')`,
    );
    await expect(
      cliente.query(`UPDATE "AuditLog" SET "actorId" = NULL, "actorType" = 'SYSTEM' WHERE "id" = 'al-0002-b'`),
    ).rejects.toThrow(/solo inserción/);
  });

  it("acepta los valores nuevos de los enums", async () => {
    const resultado = await cliente.query(
      `INSERT INTO "AuditLog" ("id", "actorType", "action", "entityType") VALUES ('al-0002-c', 'SYSTEM', 'BOOTSTRAP_REGISTRADO', 'SeedRun')`,
    );
    expect(resultado.rowCount).toBe(1);
  });
});
