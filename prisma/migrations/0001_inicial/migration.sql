-- Trofeo Escudero · 0001_inicial
-- Modelo relacional completo (fase-2/arquitectura-tecnica.md §6).
-- Parte 1: lo que expresa prisma/schema.prisma. CI comprueba en cada subida que coincide exactamente con el esquema.
-- Parte 2 (al final): reglas escritas a mano que Prisma no puede expresar (CHECK y trigger append-only de AuditLog).
-- No es destructiva: solo crea objetos.

-- CreateEnum
CREATE TYPE "DataEnvironment" AS ENUM ('NONPROD', 'PROD');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('ALTA_INICIAL', 'INICIO_SESION', 'INICIO_SESION_FALLIDO', 'CIERRE_SESION', 'TOTP_ACTIVADO', 'TOTP_RESTABLECIDO', 'CODIGOS_RECUPERACION_REGENERADOS', 'SESION_REVOCADA', 'EMERGENCIA_USADA', 'USUARIO_CREADO', 'USUARIO_BLOQUEADO', 'USUARIO_ELIMINADO', 'CONTENIDO_GUARDADO', 'PUBLICACION', 'RESTAURACION', 'MEDIO_SUBIDO', 'MEDIO_REVISADO', 'MEDIO_RETIRADO', 'MEDIO_PURGADO', 'PATROCINADOR_GUARDADO', 'PATROCINADOR_ARCHIVADO', 'PROPUESTA_ESTADO', 'PROPUESTA_NOTA', 'PROPUESTA_ARCHIVADA', 'PROPUESTA_ANONIMIZADA', 'PROPUESTA_ELIMINADA', 'EXPORTACION_CSV', 'CONFIGURACION_GUARDADA', 'RETENCION_EJECUTADA', 'RESET_NO_PRODUCTIVO');

-- CreateEnum
CREATE TYPE "SectionKey" AS ENUM ('HERO', 'FAMILIA', 'EL_DIA', 'COLABORAR', 'CIERRE');

-- CreateEnum
CREATE TYPE "FamilyGeneration" AS ENUM ('PRIMERA', 'SEGUNDA', 'TERCERA');

-- CreateEnum
CREATE TYPE "ContactChannelType" AS ENUM ('EMAIL', 'TELEFONO', 'WHATSAPP', 'INSTAGRAM', 'LINKEDIN', 'WEB', 'OTRO');

-- CreateEnum
CREATE TYPE "RouteKey" AS ENUM ('PECHO', 'BOLSA', 'JUEGO', 'DESPUES');

-- CreateEnum
CREATE TYPE "RouteItemKind" AS ENUM ('NECESITAMOS', 'PUEDES_APORTAR', 'RECIBES', 'CONDICION', 'EJEMPLO');

-- CreateEnum
CREATE TYPE "CollaborationType" AS ENUM ('PATROCINADOR_PRINCIPAL_POLO', 'WELCOME_PACK', 'PREMIO_CONCURSO', 'HOYO', 'SORTEO_EXPERIENCIA', 'OTRA');

-- CreateEnum
CREATE TYPE "OpportunityAvailability" AS ENUM ('DISPONIBLE', 'RESERVADO', 'CERRADO');

-- CreateEnum
CREATE TYPE "HoleContestType" AS ENUM ('BOLA_MAS_CERCANA', 'DRIVE_MAS_LARGO');

-- CreateEnum
CREATE TYPE "GolfCourse" AS ENUM ('NORTE', 'SUR', 'AMBOS');

-- CreateEnum
CREATE TYPE "SponsorRelationshipType" AS ENUM ('PATROCINADOR', 'COLABORADOR', 'PATROCINADOR_O_COLABORADOR', 'COLABORACION_SOLIDARIA');

-- CreateEnum
CREATE TYPE "SponsorTemporalRelation" AS ENUM ('HISTORICO', 'ACTUAL');

-- CreateEnum
CREATE TYPE "SponsorSource" AS ENUM ('INFO_V3', 'GUION', 'ORGANIZACION', 'OTRA');

-- CreateEnum
CREATE TYPE "LogoPermission" AS ENUM ('PENDIENTE', 'AUTORIZADO', 'DENEGADO', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "LegalReviewStatus" AS ENUM ('NO_REQUERIDA', 'PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "SponsorLifecycle" AS ENUM ('ACTIVO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('FOTO', 'LOGO', 'ILUSTRACION');

-- CreateEnum
CREATE TYPE "MediaReviewState" AS ENUM ('SUBIDA', 'EN_REVISION', 'AUTORIZADA', 'PUBLICADA', 'RETIRADA');

-- CreateEnum
CREATE TYPE "MediaRetiredReason" AS ENUM ('SUSTITUIDA', 'CONSENTIMIENTO_RETIRADO', 'PERMISO_LOGO', 'JURIDICO', 'OTRO');

-- CreateEnum
CREATE TYPE "MediaFormat" AS ENUM ('WEBP', 'AVIF', 'PNG', 'JPEG');

-- CreateEnum
CREATE TYPE "MediaSlot" AS ENUM ('HERO_IMAGEN', 'FAMILIA_IMAGEN', 'MIEMBRO_FOTO', 'DIA_IMAGEN', 'VIA_IMAGEN', 'PATROCINADOR_LOGO', 'CIERRE_IMAGEN', 'OG_IMAGEN');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NUEVA', 'REVISADA', 'CONTACTADA', 'EN_CONVERSACION', 'CERRADA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "AbuseAction" AS ENUM ('FORM', 'SETUP', 'BREAKGLASS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMPTZ(3),
    "twoFactorEnabled" BOOLEAN DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verified" BOOLEAN DEFAULT true,
    "failedVerificationCount" INTEGER DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),

    CONSTRAINT "TwoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "preferences" JSONB,
    "lastSeenAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "publishedRevisionId" TEXT,
    "hasUnpublishedChanges" BOOLEAN NOT NULL DEFAULT false,
    "lastPublishedAt" TIMESTAMPTZ(3),
    "lastPublishedById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRevision" (
    "id" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMPTZ(3) NOT NULL,
    "sourceRevisionId" TEXT,
    "publishComment" TEXT,

    CONSTRAINT "ContentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionMediaRef" (
    "revisionId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,

    CONSTRAINT "RevisionMediaRef_pkey" PRIMARY KEY ("revisionId","mediaId")
);

-- CreateTable
CREATE TABLE "PolicySettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "environment" "DataEnvironment" NOT NULL,
    "submissionAnonymizeMonths" INTEGER NOT NULL DEFAULT 24,
    "fingerprintMaxDays" INTEGER NOT NULL DEFAULT 30,
    "auditRetentionMonths" INTEGER NOT NULL DEFAULT 24,
    "revisionsToKeep" INTEGER NOT NULL DEFAULT 50,
    "retiredMediaPurgeDays" INTEGER NOT NULL DEFAULT 30,
    "requireTotp" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "PolicySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "requestId" TEXT,
    "summary" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "siteName" TEXT NOT NULL,
    "editionLabel" TEXT NOT NULL,
    "editionNumber" INTEGER NOT NULL,
    "eventDate" DATE NOT NULL,
    "venueName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "afterPartyName" TEXT,
    "seoTitle" TEXT NOT NULL,
    "seoDescription" TEXT NOT NULL,
    "legalOwnerName" TEXT,
    "legalOwnerTaxId" TEXT,
    "legalOwnerAddress" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactChannel" (
    "id" TEXT NOT NULL,
    "type" "ContactChannelType" NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "url" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "showInClosing" BOOLEAN NOT NULL DEFAULT false,
    "showInFooter" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "ContactChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageSection" (
    "id" TEXT NOT NULL,
    "key" "SectionKey" NOT NULL,
    "indexLabel" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "PageSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroContent" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL,
    "titleLine1" TEXT NOT NULL,
    "titleLine2" TEXT,
    "lead" TEXT NOT NULL,
    "primaryCtaLabel" TEXT NOT NULL,
    "secondaryCtaLabel" TEXT NOT NULL,
    "brandCardTitle" TEXT NOT NULL,
    "brandCardText" TEXT NOT NULL,
    "brandCardLinkLabel" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "HeroContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroFigure" (
    "id" TEXT NOT NULL,
    "heroId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "caption" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "internalSource" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "HeroFigure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyContent" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "secondGenerationLabel" TEXT NOT NULL,
    "secondGenerationText" TEXT NOT NULL,
    "thirdGenerationLabel" TEXT NOT NULL,
    "thirdGenerationText" TEXT NOT NULL,
    "thirdGenerationCaption" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "FamilyContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "generation" "FamilyGeneration" NOT NULL,
    "text" TEXT NOT NULL,
    "caption" TEXT,
    "ageManual" INTEGER,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayContent" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "lead" TEXT NOT NULL,
    "northLabel" TEXT NOT NULL,
    "northTitle" TEXT NOT NULL,
    "northText" TEXT NOT NULL,
    "northHighlight" TEXT,
    "northBridge" TEXT,
    "southLabel" TEXT NOT NULL,
    "southTitle" TEXT NOT NULL,
    "southText" TEXT NOT NULL,
    "afterLabel" TEXT NOT NULL,
    "afterTitle" TEXT NOT NULL,
    "afterText" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "DayContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayStep" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "time" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "DayStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollaborationContent" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "titleLine1" TEXT NOT NULL,
    "titleLine2" TEXT,
    "lead" TEXT NOT NULL,
    "closingLine" TEXT,
    "holesLabel" TEXT NOT NULL,
    "holesTitle" TEXT NOT NULL,
    "holesLead" TEXT NOT NULL,
    "holesModelsText" TEXT,
    "holesNamingText" TEXT,
    "holesCtaLabel" TEXT NOT NULL,
    "allHolesTitle" TEXT NOT NULL,
    "allHolesText" TEXT NOT NULL,
    "transparencyNote" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "CollaborationContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosingContent" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "historyTitle" TEXT NOT NULL,
    "historyText" TEXT NOT NULL,
    "wallLabel" TEXT NOT NULL,
    "charityTitle" TEXT NOT NULL,
    "charityText" TEXT NOT NULL,
    "charityVisible" BOOLEAN NOT NULL DEFAULT false,
    "closingTitleLine1" TEXT NOT NULL,
    "closingTitleLine2" TEXT,
    "closingText" TEXT NOT NULL,
    "closingMicrocopy" TEXT,
    "closingCtaLabel" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "ClosingContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalVersion" (
    "id" TEXT NOT NULL,
    "legalPageId" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "bodyHash" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollaborationRoute" (
    "id" TEXT NOT NULL,
    "key" "RouteKey" NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "cardCopy" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL,
    "formType" "CollaborationType" NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "CollaborationRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteItem" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "kind" "RouteItemKind" NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "RouteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "holeId" TEXT,
    "name" TEXT NOT NULL,
    "publicDescription" TEXT,
    "maxSponsors" INTEGER,
    "availability" "OpportunityAvailability" NOT NULL DEFAULT 'DISPONIBLE',
    "showStatusPublicly" BOOLEAN NOT NULL DEFAULT false,
    "internalNotes" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionHole" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "contestType" "HoleContestType",
    "par" INTEGER,
    "course" "GolfCourse",
    "showCourse" BOOLEAN NOT NULL DEFAULT false,
    "isContestVisible" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "CompetitionHole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "requiresLegalReview" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "SponsorCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "relationshipType" "SponsorRelationshipType" NOT NULL,
    "temporalRelation" "SponsorTemporalRelation" NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "source" "SponsorSource" NOT NULL,
    "sourceNote" TEXT,
    "categoryId" TEXT NOT NULL,
    "publicVisibility" BOOLEAN NOT NULL DEFAULT false,
    "logoPermission" "LogoPermission" NOT NULL DEFAULT 'PENDIENTE',
    "legalReview" "LegalReviewStatus" NOT NULL DEFAULT 'PENDIENTE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lifecycle" "SponsorLifecycle" NOT NULL DEFAULT 'ACTIVO',
    "url" TEXT,
    "shortDescription" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "reviewState" "MediaReviewState" NOT NULL DEFAULT 'SUBIDA',
    "privatePathname" TEXT NOT NULL,
    "sourceMime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "megapixels" DOUBLE PRECISION NOT NULL,
    "sha256" TEXT NOT NULL,
    "altText" TEXT,
    "caption" TEXT,
    "description" TEXT,
    "focalX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "focalY" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "hasIdentifiablePeople" BOOLEAN NOT NULL DEFAULT false,
    "includesMinors" BOOLEAN NOT NULL DEFAULT false,
    "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "guardianConsentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "consentConfirmedAt" TIMESTAMPTZ(3),
    "consentConfirmedById" TEXT,
    "retiredAt" TIMESTAMPTZ(3),
    "retiredReason" "MediaRetiredReason",
    "uploadedById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaVariant" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "format" "MediaFormat" NOT NULL,
    "width" INTEGER NOT NULL,
    "publicPathname" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaUsage" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "slot" "MediaSlot" NOT NULL,
    "heroContentId" TEXT,
    "familyMemberId" TEXT,
    "familyContentId" TEXT,
    "dayContentId" TEXT,
    "routeId" TEXT,
    "sponsorId" TEXT,
    "closingContentId" TEXT,
    "siteSettingsId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "jobTitle" TEXT,
    "phone" TEXT,
    "collaborationType" "CollaborationType" NOT NULL,
    "originRouteKey" TEXT,
    "originHoleNumber" INTEGER,
    "formOrigin" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "consentAt" TIMESTAMPTZ(3) NOT NULL,
    "consentLegalVersionId" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NUEVA',
    "archivedAt" TIMESTAMPTZ(3),
    "readAt" TIMESTAMPTZ(3),
    "anonymizedAt" TIMESTAMPTZ(3),
    "lastActivityAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourcePath" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionStatusHistory" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fromStatus" "SubmissionStatus",
    "toStatus" "SubmissionStatus" NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "SubmissionStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionNote" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "SubmissionNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbuseCounter" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "action" "AbuseAction" NOT NULL,
    "windowStart" TIMESTAMPTZ(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AbuseCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE INDEX "TwoFactor_secret_idx" ON "TwoFactor"("secret");

-- CreateIndex
CREATE INDEX "TwoFactor_userId_idx" ON "TwoFactor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AdminProfile_userId_key" ON "AdminProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRevision_revisionNumber_key" ON "ContentRevision"("revisionNumber");

-- CreateIndex
CREATE INDEX "ContentRevision_createdAt_idx" ON "ContentRevision"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "RevisionMediaRef_mediaId_idx" ON "RevisionMediaRef"("mediaId");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_at_idx" ON "AuditLog"("action", "at");

-- CreateIndex
CREATE UNIQUE INDEX "ContactChannel_type_value_key" ON "ContactChannel"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "PageSection_key_key" ON "PageSection"("key");

-- CreateIndex
CREATE UNIQUE INDEX "HeroContent_sectionId_key" ON "HeroContent"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "HeroFigure_heroId_sortOrder_key" ON "HeroFigure"("heroId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyContent_sectionId_key" ON "FamilyContent"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_familyId_sortOrder_key" ON "FamilyMember"("familyId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DayContent_sectionId_key" ON "DayContent"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "DayStep_dayId_sortOrder_key" ON "DayStep"("dayId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CollaborationContent_sectionId_key" ON "CollaborationContent"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ClosingContent_sectionId_key" ON "ClosingContent"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalPage_slug_key" ON "LegalPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LegalVersion_legalPageId_versionLabel_key" ON "LegalVersion"("legalPageId", "versionLabel");

-- CreateIndex
CREATE UNIQUE INDEX "CollaborationRoute_key_key" ON "CollaborationRoute"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RouteItem_routeId_kind_sortOrder_key" ON "RouteItem"("routeId", "kind", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_key_key" ON "Opportunity"("key");

-- CreateIndex
CREATE INDEX "Opportunity_routeId_sortOrder_idx" ON "Opportunity"("routeId", "sortOrder");

-- CreateIndex
CREATE INDEX "Opportunity_availability_idx" ON "Opportunity"("availability");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionHole_number_key" ON "CompetitionHole"("number");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorCategory_name_key" ON "SponsorCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorCategory_slug_key" ON "SponsorCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_slug_key" ON "Sponsor"("slug");

-- CreateIndex
CREATE INDEX "Sponsor_temporalRelation_lifecycle_sortOrder_idx" ON "Sponsor"("temporalRelation", "lifecycle", "sortOrder");

-- CreateIndex
CREATE INDEX "Sponsor_categoryId_idx" ON "Sponsor"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_sha256_key" ON "MediaAsset"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "MediaVariant_publicPathname_key" ON "MediaVariant"("publicPathname");

-- CreateIndex
CREATE UNIQUE INDEX "MediaVariant_mediaId_format_width_key" ON "MediaVariant"("mediaId", "format", "width");

-- CreateIndex
CREATE INDEX "MediaUsage_mediaId_idx" ON "MediaUsage"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_slot_heroContentId_mediaId_key" ON "MediaUsage"("slot", "heroContentId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_slot_familyMemberId_mediaId_key" ON "MediaUsage"("slot", "familyMemberId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_slot_familyContentId_mediaId_key" ON "MediaUsage"("slot", "familyContentId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_slot_dayContentId_mediaId_key" ON "MediaUsage"("slot", "dayContentId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_slot_routeId_mediaId_key" ON "MediaUsage"("slot", "routeId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_slot_sponsorId_mediaId_key" ON "MediaUsage"("slot", "sponsorId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_slot_closingContentId_mediaId_key" ON "MediaUsage"("slot", "closingContentId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_slot_siteSettingsId_mediaId_key" ON "MediaUsage"("slot", "siteSettingsId", "mediaId");

-- CreateIndex
CREATE INDEX "Submission_status_createdAt_idx" ON "Submission"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Submission_archivedAt_idx" ON "Submission"("archivedAt");

-- CreateIndex
CREATE INDEX "Submission_collaborationType_idx" ON "Submission"("collaborationType");

-- CreateIndex
CREATE INDEX "Submission_lastActivityAt_idx" ON "Submission"("lastActivityAt");

-- CreateIndex
CREATE INDEX "Submission_email_idx" ON "Submission"("email");

-- CreateIndex
CREATE INDEX "SubmissionStatusHistory_submissionId_changedAt_idx" ON "SubmissionStatusHistory"("submissionId", "changedAt");

-- CreateIndex
CREATE INDEX "SubmissionNote_submissionId_idx" ON "SubmissionNote"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AbuseCounter_fingerprint_action_windowStart_key" ON "AbuseCounter"("fingerprint", "action", "windowStart");

-- CreateIndex
CREATE INDEX "AbuseCounter_expiresAt_idx" ON "AbuseCounter"("expiresAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactor" ADD CONSTRAINT "TwoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteState" ADD CONSTRAINT "SiteState_publishedRevisionId_fkey" FOREIGN KEY ("publishedRevisionId") REFERENCES "ContentRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteState" ADD CONSTRAINT "SiteState_lastPublishedById_fkey" FOREIGN KEY ("lastPublishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_sourceRevisionId_fkey" FOREIGN KEY ("sourceRevisionId") REFERENCES "ContentRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionMediaRef" ADD CONSTRAINT "RevisionMediaRef_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ContentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionMediaRef" ADD CONSTRAINT "RevisionMediaRef_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicySettings" ADD CONSTRAINT "PolicySettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactChannel" ADD CONSTRAINT "ContactChannel_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageSection" ADD CONSTRAINT "PageSection_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroContent" ADD CONSTRAINT "HeroContent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "PageSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroContent" ADD CONSTRAINT "HeroContent_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroFigure" ADD CONSTRAINT "HeroFigure_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "HeroContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeroFigure" ADD CONSTRAINT "HeroFigure_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyContent" ADD CONSTRAINT "FamilyContent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "PageSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyContent" ADD CONSTRAINT "FamilyContent_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FamilyContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayContent" ADD CONSTRAINT "DayContent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "PageSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayContent" ADD CONSTRAINT "DayContent_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayStep" ADD CONSTRAINT "DayStep_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "DayContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayStep" ADD CONSTRAINT "DayStep_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollaborationContent" ADD CONSTRAINT "CollaborationContent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "PageSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollaborationContent" ADD CONSTRAINT "CollaborationContent_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingContent" ADD CONSTRAINT "ClosingContent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "PageSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingContent" ADD CONSTRAINT "ClosingContent_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPage" ADD CONSTRAINT "LegalPage_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalVersion" ADD CONSTRAINT "LegalVersion_legalPageId_fkey" FOREIGN KEY ("legalPageId") REFERENCES "LegalPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollaborationRoute" ADD CONSTRAINT "CollaborationRoute_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteItem" ADD CONSTRAINT "RouteItem_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "CollaborationRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteItem" ADD CONSTRAINT "RouteItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "CollaborationRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "CompetitionHole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionHole" ADD CONSTRAINT "CompetitionHole_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorCategory" ADD CONSTRAINT "SponsorCategory_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SponsorCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_consentConfirmedById_fkey" FOREIGN KEY ("consentConfirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaVariant" ADD CONSTRAINT "MediaVariant_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_heroContentId_fkey" FOREIGN KEY ("heroContentId") REFERENCES "HeroContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_familyContentId_fkey" FOREIGN KEY ("familyContentId") REFERENCES "FamilyContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_dayContentId_fkey" FOREIGN KEY ("dayContentId") REFERENCES "DayContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "CollaborationRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_closingContentId_fkey" FOREIGN KEY ("closingContentId") REFERENCES "ClosingContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_siteSettingsId_fkey" FOREIGN KEY ("siteSettingsId") REFERENCES "SiteSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_consentLegalVersionId_fkey" FOREIGN KEY ("consentLegalVersionId") REFERENCES "LegalVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionStatusHistory" ADD CONSTRAINT "SubmissionStatusHistory_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionStatusHistory" ADD CONSTRAINT "SubmissionStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionNote" ADD CONSTRAINT "SubmissionNote_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionNote" ADD CONSTRAINT "SubmissionNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionNote" ADD CONSTRAINT "SubmissionNote_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═════════════════════════════════════════════════════════════════════════════
-- Parte 2 · Reglas escritas a mano (Prisma no las expresa en el esquema)
-- ═════════════════════════════════════════════════════════════════════════════

-- Singletons: una sola fila, siempre con id = 1.
ALTER TABLE "SiteState" ADD CONSTRAINT "SiteState_singleton_check" CHECK ("id" = 1);
ALTER TABLE "PolicySettings" ADD CONSTRAINT "PolicySettings_singleton_check" CHECK ("id" = 1);
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_singleton_check" CHECK ("id" = 1);

-- PolicySettings: la huella antiabuso dura 30 días como máximo; los plazos son positivos;
-- en producción el TOTP no se puede desactivar.
ALTER TABLE "PolicySettings" ADD CONSTRAINT "PolicySettings_fingerprintMaxDays_check" CHECK ("fingerprintMaxDays" BETWEEN 1 AND 30);
ALTER TABLE "PolicySettings" ADD CONSTRAINT "PolicySettings_plazos_positivos_check" CHECK ("submissionAnonymizeMonths" >= 1 AND "auditRetentionMonths" >= 1 AND "revisionsToKeep" >= 1 AND "retiredMediaPurgeDays" >= 1);
ALTER TABLE "PolicySettings" ADD CONSTRAINT "PolicySettings_totp_en_produccion_check" CHECK ("environment" <> 'PROD' OR "requireTotp");

-- PageSection: HERO y COLABORAR no se pueden ocultar.
ALTER TABLE "PageSection" ADD CONSTRAINT "PageSection_bloques_fijos_check" CHECK ("isVisible" OR "key" NOT IN ('HERO', 'COLABORAR'));

-- CompetitionHole: hoyos del 1 al 18.
ALTER TABLE "CompetitionHole" ADD CONSTRAINT "CompetitionHole_number_check" CHECK ("number" BETWEEN 1 AND 18);

-- MediaAsset: punto focal entre 0 y 1.
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_focal_check" CHECK ("focalX" BETWEEN 0 AND 1 AND "focalY" BETWEEN 0 AND 1);

-- MediaUsage: cada uso apunta exactamente a un destino.
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_un_destino_check" CHECK (num_nonnulls("heroContentId", "familyMemberId", "familyContentId", "dayContentId", "routeId", "sponsorId", "closingContentId", "siteSettingsId") = 1);

-- AbuseCounter: la huella caduca después de su ventana y en 30 días como máximo.
ALTER TABLE "AbuseCounter" ADD CONSTRAINT "AbuseCounter_caducidad_check" CHECK ("expiresAt" > "windowStart" AND "expiresAt" <= "windowStart" + INTERVAL '30 days');

-- AuditLog: solo inserción.
-- - UPDATE: rechazado. Única excepción: la FK actorId (ON DELETE SET NULL) al eliminar un usuario,
--   que solo pone actorId a NULL y no cambia nada más.
-- - DELETE: solo los registros más antiguos que PolicySettings.auditRetentionMonths (política de retención).
-- - TRUNCATE: rechazado.
CREATE FUNCTION "auditlog_solo_insercion"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  meses integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD."actorId" IS NOT NULL AND NEW."actorId" IS NULL
       AND (NEW."id", NEW."at", NEW."action", NEW."entityType", NEW."entityId", NEW."requestId", NEW."summary")
           IS NOT DISTINCT FROM
           (OLD."id", OLD."at", OLD."action", OLD."entityType", OLD."entityId", OLD."requestId", OLD."summary") THEN
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

CREATE TRIGGER "AuditLog_solo_insercion"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION "auditlog_solo_insercion"();

CREATE FUNCTION "auditlog_sin_truncate"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog es de solo inserción: TRUNCATE no está permitido'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER "AuditLog_sin_truncate"
  BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION "auditlog_sin_truncate"();
