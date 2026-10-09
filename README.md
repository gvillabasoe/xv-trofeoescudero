# Trofeo Escudero · XV Edición

Web app del Trofeo Escudero: landing pública con contenido gestionable y un panel privado de administración.

**Estado:** Fase 3 · **Entrega 4A**: saneamiento de datos y publicación sobre la instalación de la Entrega 3, sin reinicializar nada. Todavía no hay autenticación, CMS ni formulario (Entrega 4B y fases siguientes).

## Stack
| Pieza | Versión exacta |
|---|---|
| Node.js | 22.23.3 LTS en CI (`.nvmrc`); `22.x` en Vercel |
| pnpm | 10.34.6 (`packageManager`; en Vercel, con Corepack) |
| Next.js (App Router, Cache Components) | 16.4.0 |
| React | 19.3.0 |
| TypeScript | 6.0.3 |
| ESLint (flat) + eslint-config-next | 9.39.5 + 16.4.0 |
| Vitest | 5.0.3 |
| Prisma ORM (`prisma`, `@prisma/client`, `@prisma/adapter-neon`; `@prisma/adapter-pg` solo en tests) | 7.10.0 |
| Driver de Neon (`@neondatabase/serverless`) | 1.2.0 |
| Zod | 4.6.5 |
| tsx | 4.23.15 |
| PostgreSQL | Neon (Fráncfort); PostgreSQL 17 temporal en CI |

## Dependencias reproducibles (D-LOCKFILE)
- `pnpm-lock.yaml` está versionado y **nunca se borra**.
- CI y Vercel instalan **solo** con `pnpm install --frozen-lockfile`. Si el lockfile falta o no corresponde a `package.json`, CI falla y el despliegue no continúa.
- **Si una entrega cambia dependencias:**
  1. El job «Lockfile» publica el lockfile correcto como artefacto.
  2. Se sube a la **misma rama** antes del merge.
  3. Con «Squash and merge», `package.json` y `pnpm-lock.yaml` llegan a `main` en un único commit.

## Rutas (provisionales)
| Ruta | Qué es |
|---|---|
| `/` | Portada provisional: lee solo la versión publicada (`ContentRevision`) |
| `/estado` | Estado técnico, sin secretos. Muestra: conexión, marcador, migraciones, ejecuciones únicas, propuestas sintéticas, ID, número y `contentHash` de la revisión, y hora e identificador de lectura |

## Base de datos
- **Migraciones versionadas** en `prisma/migrations/`. Nunca `db push`.
  - Todas son **aditivas** y compatibles con el código anterior: expandir → migrar → contraer.
- **0001_inicial:** modelo completo.
- **0002_seedrun:**
  - `SeedRun` y `AuditLog.actorType` (las filas antiguas quedan como `SYSTEM`).
  - `Sponsor.currentRoleLabel` y `Sponsor.editionsNote`.
  - Valores nuevos de enums.
  - Revisiones publicadas **inmutables** (trigger) y con huella válida (CHECK).
- **Reglas SQL escritas a mano:**
  - Singletons.
  - Hoyos 1–18.
  - MediaUsage con un solo destino.
  - AuditLog de solo inserción.
  - ContentRevision inmutable.
  - Una acción del sistema nunca tiene usuario.

## Datos
### Bootstrap de una sola ejecución (D-BOOTSTRAP)
`db:bootstrap` (`scripts/sembrar.ts`) se ejecuta en cada build de Vercel y hace una de estas tres cosas:

| Situación | Qué hace |
|---|---|
| `initial-content-v1` ya está en `SeedRun` | **Nada.** No busca registros borrados ni resucita nada |
| La base ya tiene contenido (Entrega 3) | **Verifica** que es coherente y **solo registra** `SeedRun`. Comprueba: contenido, oportunidades principales, 18 hoyos, revisión nº 1 válida y con su huella, y `SiteState`. Si falta algo, falla con el diagnóstico y no rellena nada |
| Las tablas funcionales están vacías | Crea todo, publica la revisión nº 1, audita (actor `SYSTEM`) y registra `SeedRun` en **una transacción** |

Dos ejecuciones simultáneas se ordenan con un cerrojo de PostgreSQL; la clave única de `SeedRun` impide duplicar.

### Backfills (`src/server/semilla/backfills.ts`)
- Son explícitos, versionados, idempotentes, reanudables y auditados.
- Se registran en `SeedRun` (`kind = BACKFILL`).
- Nunca recrean lo borrado, nunca reactivan lo oculto y nunca tocan lo editado desde el panel.
- **`entidades-historicas-v1`:**
  - Crea las categorías «AfterParty oficial» y «Colaboración solidaria».
  - Luz de Mar: su papel actual (AfterParty oficial).
  - dalecandELA: colaboración solidaria de la X edición.
  - El cambio queda en el borrador; no publica.

### 18 entidades históricas registradas (D-HISTORICAL-RELATION)
Las 17 de la información v3 y Castillo de Cuzcurrita.
- Cuando la fuente no dice si una entidad fue patrocinadora o colaboradora: `PATROCINADOR_O_COLABORADOR`.
- **Castillo de Cuzcurrita:** patrocinador histórico confirmado, bodega / vino, **oculto**, revisión jurídica **pendiente**.
- **dalecandELA:** colaboración solidaria especial (X edición).
- **Luz de Mar:** relación histórica y papel actual de AfterParty oficial.

«Sin categoría» es solo una categoría comercial.

### Datos demo (D-DEMO)
- Están en `src/server/semilla/demo.ts`, **separados** del bootstrap.
- **Nunca** se crean en un despliegue.
- Solo `db:seed:demo` o el reset del panel (Entrega 4B) los crean. Requisitos:
  - Vercel en `development` o `preview` (nunca `production`);
  - `ENTORNO_DATOS=NONPROD`;
  - el marcador de la base en `NONPROD`;
  - si se configura `PRODUCCION_DB_HOST`, una conexión distinta de esa.
- Si se borran, no vuelven.
- El reset solo borra y recrea propuestas con `isSynthetic = true`.

## Publicación y snapshot (D-SNAPSHOT-WHITELIST)
El snapshot pasa tres barreras independientes:
1. **Lista blanca:** se construye campo a campo; nunca se serializa una entidad de Prisma.
2. **Zod estricto:** un campo no previsto hace fallar la publicación.
3. **Inspección recursiva** (`src/lib/snapshot/privacidad.ts`): nombres de propiedad, textos, objetos y arrays. Busca emails, teléfonos, «[PENDIENTE]» y propiedades privadas.

Publicar crea una revisión inmutable con su huella, en una transacción con control de versión y auditoría.

## Caché (D-CACHE-TAG)
- La web pública lee la versión publicada con `'use cache'` + `cacheTag("site-public")` + `cacheLife("max")`.
- Cada lectura real de Neon deja en los logs de Vercel la línea `[cache:site-public] Lectura real de Neon · revisión nº N · lectura XXXX`.
- `src/server/cache/invalidacion.ts`: servicio de invalidación (`updateTag("site-public")` + `revalidatePath` de las rutas públicas). Está probado de forma aislada y lo usará la acción de publicación del panel.

## Build de Vercel (`vercel-build`)
1. `prisma generate`.
2. `scripts/desplegar-base.mjs antes`: variables, marcador, migraciones a medias y destructivas sin confirmar.
3. `prisma migrate deploy`.
4. `scripts/desplegar-base.mjs despues`: marcador de entorno.
5. `tsx scripts/sembrar.ts`: bootstrap (no-op si ya está registrado) y backfills pendientes. Son operaciones cortas.
6. `next build`.

## CI (D-CI-POSTGRES)
GitHub Actions, **sin secretos**, en cada PR y en cada subida a `main`:
- **Calidad:** lint, typecheck, tests unitarios y build.
- **Migraciones y datos:** un **PostgreSQL 17 temporal** del propio job, que se crea al empezar y se destruye al terminar. Tiene tres bases:
  1. Migraciones desde cero, comprobación de deriva y reglas SQL.
  2. Base nueva: bootstrap, segunda ejecución como no-op, ejecuciones simultáneas, registros borrados que no vuelven, datos demo, snapshot, publicación y caché.
  3. Instalación equivalente a la Entrega 3 (`tests/fixtures/cargar-entrega-3.ts`) que recibe la 0002, el registro de `SeedRun` y el backfill.
- **Lockfile:** que `pnpm-lock.yaml` corresponde a `package.json`.

Nunca se usan Neon, la base de preview, claves de API ni datos reales.

## Reglas
- **Ningún secreto en GitHub.** Los valores viven en las variables de Vercel.
- Hasta el lanzamiento, los despliegues de Vercel son entornos **protegidos y no productivos**: solo datos sintéticos.
- No se reinicializa la base: cualquier cambio de datos es una migración aditiva, un backfill versionado o una corrección de código, con tests.
