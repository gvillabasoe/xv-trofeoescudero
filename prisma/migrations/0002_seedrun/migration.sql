-- Trofeo Escudero · 0002_seedrun (Entrega 4A)
-- Solo añade: compatible con el código de la Entrega 3 mientras siga desplegado.
-- - SeedRun: registro de ejecuciones únicas (bootstrap y backfills).
-- - AuditLog.actorType: las filas existentes (todas del seed, sin usuario) quedan como SYSTEM.
-- - Sponsor.currentRoleLabel y Sponsor.editionsNote: clasificación de las entidades históricas.
-- - Valores nuevos de enums, añadidos al final.
-- - Reglas de integridad: revisiones publicadas inmutables y con huella válida.
-- No borra, no renombra y no cambia tipos. No modifica ninguna fila existente.

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SeedRunKind" AS ENUM ('BOOTSTRAP', 'BACKFILL');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'BOOTSTRAP_INICIAL';
ALTER TYPE "AuditAction" ADD VALUE 'BOOTSTRAP_REGISTRADO';
ALTER TYPE "AuditAction" ADD VALUE 'BACKFILL_APLICADO';
ALTER TYPE "AuditAction" ADD VALUE 'DEMO_CREADO';
ALTER TYPE "AuditAction" ADD VALUE 'LIMITE_INTENTOS';

-- AlterEnum
ALTER TYPE "AbuseAction" ADD VALUE 'LOGIN';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "actorType" "AuditActorType" NOT NULL DEFAULT 'SYSTEM';

-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN "currentRoleLabel" TEXT,
ADD COLUMN "editionsNote" TEXT;

-- CreateTable
CREATE TABLE "SeedRun" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "SeedRunKind" NOT NULL,
    "version" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "environment" "DataEnvironment" NOT NULL,
    "completedAt" TIMESTAMPTZ(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeedRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeedRun_key_key" ON "SeedRun"("key");

-- ═════════════════════════════════════════════════════════════════════════════
-- Reglas escritas a mano (Prisma no las expresa en el esquema)
-- ═════════════════════════════════════════════════════════════════════════════

-- SeedRun: clave legible, versión positiva y huella SHA-256.
ALTER TABLE "SeedRun" ADD CONSTRAINT "SeedRun_integridad_check" CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND "version" >= 1 AND "checksum" ~ '^[0-9a-f]{64}$');

-- AuditLog: una acción del sistema nunca tiene usuario.
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_check" CHECK ("actorType" = 'USER' OR "actorId" IS NULL);

-- AuditLog: el trigger de solo inserción incluye ahora actorType en la comparación.
CREATE OR REPLACE FUNCTION "auditlog_solo_insercion"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  meses integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD."actorId" IS NOT NULL AND NEW."actorId" IS NULL
       AND (NEW."id", NEW."at", NEW."actorType", NEW."action", NEW."entityType", NEW."entityId", NEW."requestId", NEW."summary")
           IS NOT DISTINCT FROM
           (OLD."id", OLD."at", OLD."actorType", OLD."action", OLD."entityType", OLD."entityId", OLD."requestId", OLD."summary") THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'AuditLog es de solo inserción: no se puede modificar el registro %', OLD."id"
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT "auditRetentionMonths" INTO meses FROM "PolicySettings" WHERE "id" = 1;
  IF meses IS NOT NULL AND OLD."at" < now() - make_interval(months => meses) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'AuditLog es de solo inserción: solo se borran registros con más de % meses', COALESCE(meses, 0)
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

-- ContentRevision: número y versión de esquema positivos, huella SHA-256 y snapshot como objeto JSON.
-- La revisión nº 1 existente cumple estas reglas; si no las cumpliera, la migración fallaría sin cambiar nada.
ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_integridad_check" CHECK ("revisionNumber" >= 1 AND "schemaVersion" >= 1 AND "contentHash" ~ '^[0-9a-f]{64}$' AND jsonb_typeof("snapshot") = 'object');

-- ContentRevision: una revisión publicada es inmutable.
-- Única excepción: las FK con ON DELETE SET NULL (autor o revisión de origen eliminados), que solo ponen la FK a NULL.
CREATE FUNCTION "contentrevision_inmutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW."id", NEW."revisionNumber", NEW."schemaVersion", NEW."contentHash", NEW."snapshot", NEW."createdAt", NEW."publishedAt", NEW."publishComment")
     IS NOT DISTINCT FROM
     (OLD."id", OLD."revisionNumber", OLD."schemaVersion", OLD."contentHash", OLD."snapshot", OLD."createdAt", OLD."publishedAt", OLD."publishComment")
     AND (NEW."createdById" IS NOT DISTINCT FROM OLD."createdById" OR NEW."createdById" IS NULL)
     AND (NEW."sourceRevisionId" IS NOT DISTINCT FROM OLD."sourceRevisionId" OR NEW."sourceRevisionId" IS NULL) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'ContentRevision es inmutable: no se puede modificar la revisión nº %', OLD."revisionNumber"
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER "ContentRevision_inmutable"
  BEFORE UPDATE ON "ContentRevision"
  FOR EACH ROW EXECUTE FUNCTION "contentrevision_inmutable"();

-- SiteState: versión positiva (control optimista).
ALTER TABLE "SiteState" ADD CONSTRAINT "SiteState_version_check" CHECK ("version" >= 1);
