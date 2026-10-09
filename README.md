# Trofeo Escudero · XV Edición

Web app del Trofeo Escudero: landing pública con contenido gestionable y un panel privado de administración.

**Estado:** Fase 3 · **Entrega 3**: seed de partida, versión publicada nº 1, snapshot público en caché y portada provisional que lo lee. Todavía no hay autenticación, CMS ni formulario.

## Stack
| Pieza | Versión |
|---|---|
| Node.js | 22.23.3 LTS (`.nvmrc`; `22.x` en Vercel) |
| pnpm | 10.34.6 (`packageManager`) |
| Next.js (App Router, Cache Components) | 16.4.0 |
| React | 19.3.0 |
| TypeScript | 6.0.3 |
| ESLint (flat) + eslint-config-next | 9.39.5 + 16.4.0 |
| Vitest | 5.0.3 |
| Prisma ORM (`prisma`, `@prisma/client`, `@prisma/adapter-neon`; `@prisma/adapter-pg` solo en tests) | 7.10.0 (estable; la 8 sigue en RC y no se usa) |
| Driver de Neon (`@neondatabase/serverless`) | 1.2.0 |
| Zod (contrato del snapshot) | 4.6.5 |
| tsx (ejecuta el seed en el build) | 4.23.15 |
| PostgreSQL | Neon (región de Fráncfort); PostgreSQL 17 en CI |

Hosting en **Vercel Hobby** (funciones en `fra1`) y código en un repositorio privado de **GitHub Free**.

## Rutas (provisionales)
| Ruta | Qué es |
|---|---|
| `/` | Portada provisional: muestra la versión publicada. El diseño de los 5 bloques llega en la Fase 4 |
| `/estado` | Estado técnico: entorno, base de datos, versión publicada y prueba de caché. Antes del lanzamiento pasa a `/admin` o se elimina |

## Base de datos
- **Esquema:** `prisma/schema.prisma`. **Migraciones versionadas:** `prisma/migrations/`. Nunca `db push`.
- **Conexiones:**
  - La aplicación usa `DATABASE_URL` (con pool) a través del adaptador de Neon, solo en `src/server/db.ts` (ESLint lo impone).
  - Las migraciones usan `DIRECT_URL` (directa) a través de `prisma.config.ts`.
- **Cliente generado:** `src/generated/prisma`. No se versiona; lo crea `prisma generate` al instalar y en cada build.
- **Reglas escritas a mano** al final de `0001_inicial`:
  - CHECK de singletons, hoyos 1–18, punto focal y caducidad de la huella antiabuso.
  - MediaUsage con un solo destino.
  - TOTP obligatorio en PROD.
  - **Trigger append-only de AuditLog**.
- **Marcador de entorno:** `PolicySettings.environment`. Se fija al crear la base y el build se niega a continuar si no coincide con `ENTORNO_DATOS`. Durante la Fase 3 solo se admite `NONPROD`.

## Contenido y publicación
- **Seed** (`src/server/semilla/`):
  - Textos aprobados en la Fase 1, inventario comercial, 18 hoyos y 18 patrocinadores históricos. Castillo de Cuzcurrita queda **oculto** y con revisión jurídica pendiente.
  - En NONPROD añade propuestas **ficticias** (`isSynthetic`).
  - **Solo crea lo que falta y nunca modifica nada.** No crea administradores.
- **Publicación** (`src/server/publicacion.ts`):
  - Borrador → snapshot validado con Zod (`src/lib/snapshot/`) → revisión inmutable con su hash, en una transacción con control de versión y auditoría.
  - Un borrador idéntico no genera versión nueva.
- **Web pública:**
  - Solo lee el snapshot de la versión publicada, con `'use cache'` + `cacheTag("site-public")` + `cacheLife("max")`.
  - Se genera en el build. A partir de la Entrega 4, publicar desde el panel la invalida con `updateTag`.

### Build de Vercel (`vercel-build`)
1. `prisma generate`.
2. `scripts/desplegar-base.mjs antes`. Comprueba:
   - las variables;
   - que la base es la de este entorno;
   - que no hay migraciones a medias;
   - que ninguna pendiente es destructiva sin confirmar (`CONFIRMAR_MIGRACION_DESTRUCTIVA`).
3. `prisma migrate deploy` por la conexión directa.
4. `scripts/desplegar-base.mjs despues`: fija o verifica el marcador de entorno.
5. `tsx scripts/sembrar.ts`: seed idempotente; publica la versión nº 1 si no hay ninguna.
6. `next build`. Las páginas leen la base **durante el build**, no en cada visita.

Si algo falla, el build se detiene y Vercel mantiene el despliegue anterior. `buildCommand` usa `npm run`, que funciona tanto si Vercel instaló con npm como con pnpm.

## Scripts
| Script | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de Next.js (sin base de datos, como en CI) |
| `pnpm lint` | ESLint (configuración flat) |
| `pnpm typecheck` | `prisma generate` + `next typegen` + `tsc --noEmit` |
| `pnpm test` | Tests unitarios con Vitest |
| `pnpm test:integracion` | Tests de integración contra PostgreSQL (`DIRECT_URL` y `SEMILLA_URL`) |
| `pnpm db:generate` / `db:validate` | Genera el cliente / valida el esquema (no se conectan) |
| `pnpm db:migrate:deploy` | Aplica las migraciones pendientes |
| `pnpm db:seed` | Seed idempotente (usa `DATABASE_URL` y `ENTORNO_DATOS`) |
| `pnpm db:destructivas` | Informe de migraciones destructivas |
| `pnpm vercel-build` | Build de Vercel con el paso de base de datos y el seed |

## Cómo se trabaja
1. Cada entrega se sube **directamente a `main`** desde la web de GitHub (decisión de la organización).
2. Cada subida genera un **despliegue en Vercel**, protegido con **Vercel Authentication** hasta el lanzamiento.
3. Vercel ejecuta los **Native Deployment Checks** (lint y typecheck) y solo promociona el despliegue si pasan.
4. **GitHub Actions**, **sin secretos**, ejecuta en cada subida:
   - **Calidad:** validación del esquema, lint, typecheck, tests y build.
   - **Migraciones:** en un PostgreSQL efímero, hace dos cosas:
     - aplica las migraciones y comprueba que coinciden exactamente con el esquema;
     - ejecuta los tests de integración: reglas de `0001`, seed y publicación.
   - **Lockfile:** comprueba que `pnpm-lock.yaml` existe y corresponde a `package.json`. Si no, publica el correcto como artefacto.
5. Los smoke tests son manuales durante la Fase 3.

## Reglas
- **Ningún secreto en GitHub.** Los valores viven en las variables de Vercel.
- Hasta el lanzamiento, el despliegue de `main` es un entorno **protegido y no productivo**: solo datos sintéticos.
- Nunca `prisma db push`. Toda migración que pueda aplicarse antes del código nuevo debe ser compatible con la versión anterior de la aplicación (expandir → migrar → contraer).
- Nada de datos reales fuera de producción.
