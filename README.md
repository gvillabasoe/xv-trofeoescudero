# Trofeo Escudero · XV Edición

Web app del Trofeo Escudero: landing pública con contenido gestionable y un panel privado de administración.

**Estado:** Fase 3 · **Entrega 2**: Prisma 7, Neon no productivo, modelo relacional completo y migración `0001_inicial`. Todavía no hay datos del torneo, autenticación, CMS ni formulario.

## Stack
| Pieza | Versión |
|---|---|
| Node.js | 22.23.3 LTS (`.nvmrc`; `22.x` en Vercel) |
| pnpm | 10.34.6 (`packageManager`) |
| Next.js (App Router) | 16.4.0 |
| React | 19.3.0 |
| TypeScript | 6.0.3 |
| ESLint (flat) + eslint-config-next | 9.39.5 + 16.4.0 |
| Vitest | 5.0.3 |
| Prisma ORM (`prisma`, `@prisma/client`, `@prisma/adapter-neon`) | 7.10.0 (estable; la 8 sigue en RC y no se usa) |
| Driver de Neon (`@neondatabase/serverless`) | 1.2.0 |
| PostgreSQL | Neon (región de Fráncfort); PostgreSQL 17 en CI |

Hosting en **Vercel Hobby** (funciones en `fra1`) y código en un repositorio privado de **GitHub Free**.

## Base de datos
- **Esquema:** `prisma/schema.prisma`. **Migraciones versionadas:** `prisma/migrations/`. Nunca `db push`.
- **Conexiones:** la aplicación usa `DATABASE_URL` (con pool) a través del adaptador de Neon, solo en `src/server/db.ts` (ESLint lo impone). Las migraciones usan `DIRECT_URL` (directa) a través de `prisma.config.ts`.
- **Cliente generado:** `src/generated/prisma` (no se versiona; lo crea `prisma generate` al instalar y en cada build).
- **Reglas escritas a mano** al final de `0001_inicial`: CHECK de singletons, hoyos 1–18, punto focal, MediaUsage con un solo destino, caducidad de la huella antiabuso, TOTP obligatorio en PROD y el **trigger append-only de AuditLog**.
- **Marcador de entorno:** `PolicySettings.environment`. Se fija al crear la base y el build se niega a continuar si no coincide con `ENTORNO_DATOS`. Durante la Fase 3 solo se admite `NONPROD`.

### Build de Vercel (`vercel-build`)
1. `prisma generate`.
2. `scripts/desplegar-base.mjs antes`: comprueba las variables, que la base es la de este entorno, que no hay migraciones a medias y que ninguna pendiente es destructiva sin confirmar (`CONFIRMAR_MIGRACION_DESTRUCTIVA`).
3. `prisma migrate deploy` por la conexión directa.
4. `scripts/desplegar-base.mjs despues`: fija o verifica el marcador de entorno.
5. `next build`. La página de comprobación lee el estado de la base **durante el build**, no en cada visita.

Si algo falla, el build se detiene y Vercel mantiene el despliegue anterior. `buildCommand` usa `npm run`, que funciona tanto si Vercel instaló con npm como con pnpm.

## Scripts
| Script | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de Next.js (sin base de datos, como en CI) |
| `pnpm lint` | ESLint (configuración flat) |
| `pnpm typecheck` | `prisma generate` + `next typegen` + `tsc --noEmit` |
| `pnpm test` | Tests unitarios con Vitest |
| `pnpm test:integracion` | Tests de integración contra PostgreSQL (`DIRECT_URL`) |
| `pnpm db:generate` / `db:validate` | Genera el cliente / valida el esquema (no se conectan) |
| `pnpm db:migrate:deploy` | Aplica las migraciones pendientes |
| `pnpm db:destructivas` | Informe de migraciones destructivas |
| `pnpm vercel-build` | Build de Vercel con el paso de base de datos |

## Cómo se trabaja
1. Cada entrega se sube **directamente a `main`** desde la web de GitHub (decisión de la organización).
2. Cada subida genera un **despliegue en Vercel**, protegido con **Vercel Authentication** hasta el lanzamiento.
3. Vercel ejecuta los **Native Deployment Checks** (lint y typecheck) y solo promociona el despliegue si pasan.
4. **GitHub Actions**, **sin secretos**, ejecuta en cada subida:
   - **Calidad:** validación del esquema, lint, typecheck, tests y build.
   - **Migraciones:** en un PostgreSQL efímero, aplica las migraciones, comprueba que coinciden exactamente con el esquema y ejecuta los tests de integración.
   - **Lockfile:** comprueba que `pnpm-lock.yaml` existe y corresponde a `package.json`. Si no, publica el correcto como artefacto.
5. Los smoke tests son manuales durante la Fase 3.

## Reglas
- **Ningún secreto en GitHub.** Los valores viven en las variables de Vercel.
- Hasta el lanzamiento, el despliegue de `main` es un entorno **protegido y no productivo**: solo datos sintéticos.
- Nunca `prisma db push`. Toda migración que pueda aplicarse antes del código nuevo debe ser compatible con la versión anterior de la aplicación (expandir → migrar → contraer).
- Nada de datos reales fuera de producción.
