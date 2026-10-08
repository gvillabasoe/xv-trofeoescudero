# Trofeo Escudero · XV Edición

Web app del Trofeo Escudero: landing pública con contenido gestionable y un panel privado de administración.

**Estado:** Fase 3 · **PR-1**: esqueleto técnico, CI y primera preview. Todavía no hay base de datos, autenticación, CMS ni formulario.

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

Hosting en **Vercel Hobby** y código en un repositorio privado de **GitHub Free**. Neon (PostgreSQL) llega en el PR-2.

## Scripts
| Script | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción de Next.js |
| `pnpm lint` | ESLint (configuración flat) |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |
| `pnpm test` | Tests unitarios con Vitest |

## Cómo se trabaja
1. Cada bloque de trabajo es un **pull request** con su **preview de Vercel**.
2. **GitHub Actions** ejecuta lint, typecheck, tests y build **sin secretos**.
3. Vercel ejecuta además los **Native Deployment Checks** (lint y typecheck).
4. La preview está protegida con **Vercel Authentication**. Los smoke tests son manuales durante la Fase 3.
5. **El merge lo hace la organización.** No se hacen pushes directos a `main`.

## Reglas
- **Ningún secreto en GitHub.** Los valores no productivos viven en Vercel (Preview).
- **Durante la Fase 3 no hay producción:** `vercel.json` omite los builds de producción (`scripts/ignorar-produccion.sh`).
- Nunca `prisma db push` en producción. Las migraciones serán versionadas (a partir del PR-2).
- Nada de datos reales fuera de producción.
