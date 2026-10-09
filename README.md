# Trofeo Escudero · XV Edición

Web del Trofeo Escudero (3 de agosto de 2027, Golf El Rompido): una landing pública para atraer patrocinadores y colaboradores, un formulario de propuestas que se guarda en Neon y un panel privado (`/admin`) para gestionar todo el contenido.

**Estado:** versión 0.9.0, todas las fases construidas (F4 web pública, F5 CMS, F6 bandeja, F7 QA, F8 documentación). **La web no está lanzada:** sigue protegida por Vercel y marcada como «noindex» hasta que la organización complete la [lista de lanzamiento](docs/lanzamiento.md).

| Documento | Para qué |
|---|---|
| [docs/manual-panel.md](docs/manual-panel.md) | Manual del panel para la organización |
| [docs/operacion.md](docs/operacion.md) | Variables, servicios, tarea diaria, copias, recuperación e incidencias |
| [docs/lanzamiento.md](docs/lanzamiento.md) | Lista de comprobación del lanzamiento (no se lanza sin ella) |

## Stack
| Pieza | Versión exacta |
|---|---|
| Node.js | 22.23.3 LTS en CI (`.nvmrc`); `22.x` en Vercel |
| pnpm | 10.34.6 (`packageManager`; en Vercel, `npx pnpm@10.34.6`) |
| Next.js (App Router, Cache Components) | 16.4.0 |
| React | 19.3.0 |
| TypeScript | 6.0.3 |
| ESLint (flat) + eslint-config-next | 9.39.5 + 16.4.0 |
| Prisma ORM + adaptadores Neon y PostgreSQL | 7.10.0 |
| Better Auth (twoFactor, admin, nextCookies) | 1.7.7 |
| Zod | 4.6.5 |
| Vercel Blob (almacén privado) | 2.8.1 |
| sharp (variantes WebP/JPEG) | 0.35.5 |
| Vitest · Playwright · axe-core | 5.0.3 · 1.64.0 · 4.13.0 |
| PostgreSQL | Neon (Fráncfort); PostgreSQL 17 desechable en CI |

## Rutas
| Ruta | Qué es |
|---|---|
| `/` | Portada: los cinco bloques (Hero y cifras, La familia, El día, Colaborar, ediciones anteriores y cierre), leídos de la versión publicada |
| `/proponer` | Formulario de propuestas. Funciona sin JavaScript. Cerrado mientras no haya política de privacidad publicada |
| `/privacidad`, `/aviso-legal` | Última versión publicada de cada texto legal (404 si no hay ninguna) |
| `/medios/[archivo]` | Variantes web de las imágenes autorizadas, desde el almacén privado (deja de servirlas al retirarlas) |
| `/compartir` | Imagen para redes por defecto (tipográfica) |
| `/estado` | Estado técnico sin secretos. Desaparece al lanzar |
| `/api/cron/retencion` | Tarea diaria de retención (Vercel Cron, con `CRON_SECRET`) |
| `/admin/*` | Panel: acceso con contraseña + TOTP, CMS, imágenes, publicación, versiones, bandeja, actividad y seguridad |

## Cómo funciona el contenido
1. **Borrador:** lo que se edita en el panel vive en tablas relacionales (Neon), con **control de versión optimista**: si dos personas editan lo mismo, la segunda no pisa a la primera.
2. **Publicar:** crea una **revisión inmutable** (snapshot) que pasa tres barreras: lista blanca campo a campo, Zod estricto e inspección recursiva de privacidad (emails, teléfonos, «[PENDIENTE]» y propiedades privadas). Después invalida la caché `site-public`.
3. **Web pública:** solo lee la revisión publicada, en caché (`'use cache'` + `cacheTag("site-public")` + `cacheLife("max")`). No consulta Neon en cada visita.
4. **Versiones:** se puede restaurar cualquiera; se publica como versión nueva y antes se revisa con los derechos de hoy (marcas, imágenes y canales).

Snapshot **versión 2** (añade imágenes). Las revisiones de la versión 1 (Entregas 3 y 4) se leen normalizadas y nunca se reescriben (`src/lib/snapshot/leer.ts`).

### Reglas de publicación
- **Marcas:** confirmada, visible, activa y sin bloqueo jurídico; si su categoría exige revisión jurídica (bodega / vino), solo con la revisión **aprobada**. Castillo de Cuzcurrita sigue oculto. Logo solo con permiso «Autorizado».
- **Imágenes:** autorizadas, con texto alternativo, consentimiento si aparecen personas y autorización de los tutores si aparecen menores. Las que no cumplen se quedan fuera con un aviso.
- **Estados comerciales:** privados; solo se publican con el interruptor de cada oportunidad. **Campo de los hoyos (P8):** solo con su interruptor.
- **Canales de contacto:** solo los activos.

## Formulario y bandeja
- Validación con los textos aprobados (fase-1 §6). Sin JavaScript funciona igual; con JavaScript se envía sin recargar y no pierde lo escrito si falla la red.
- Antispam sin servicios externos: límite de 5 envíos por 15 minutos por huella HMAC de la IP (la IP nunca se guarda), campo trampa y trampa de tiempo. Cloudflare Turnstile está **preparado y desactivado**.
- Consentimiento ligado a la versión exacta de la política de privacidad (`LegalVersion`).
- La propuesta se guarda primero en Neon. El aviso por email (Resend) es opcional y no lleva datos personales.
- Bandeja: filtros, estados con historial, notas internas, archivo, anonimización y borrado con doble confirmación, y exportación CSV auditada (sin datos demo, protegida contra fórmulas).
- Retención diaria: anonimiza las propuestas sin actividad (24 meses por defecto, configurable), borra huellas y sesiones caducadas, recorta la auditoría antigua y los archivos de imágenes retiradas.

## Seguridad
- Better Auth: registro público desactivado; ningún camino de Better Auth puede crear usuarios; sesiones en Neon de 12 h; **TOTP obligatorio**; códigos de recuperación de un solo uso.
- Autorización real en cada página y acción (`requerirAdmin`); el proxy solo redirige sin cookie.
- Auditoría de solo inserción (trigger SQL) sin emails, teléfonos, mensajes, contraseñas, códigos ni IP.
- Cabeceras de seguridad; panel con `no-store`, `no-referrer` y `noindex`. **CSP con nonce: pendiente** (riesgo documentado).
- Ningún secreto en el repositorio: solo nombres en `.env.example`.

## Base de datos y despliegue
- Migraciones versionadas y aditivas (`prisma/migrations`, nunca `db push`). Esta versión **no añade migraciones**.
- `vercel-build`: `prisma generate` → comprobaciones (`desplegar-base.mjs antes`) → `prisma migrate deploy` → marcador de entorno → bootstrap de una sola ejecución y backfills (`sembrar.ts`) → `next build`.
- **Subida por lotes (D-SUBIDA-POR-LOTES):** `manifiesto-subida.json` lista la huella de cada archivo. Mientras falte alguno, Vercel omite el despliegue (`ignoreCommand`) y CI omite las pruebas.

## CI (sin secretos)
| Job | Qué comprueba |
|---|---|
| Subida completa | Que el repositorio coincide con el manifiesto de la entrega |
| Calidad | Validación del esquema, lint, typecheck, tests unitarios y build sin base de datos |
| Migraciones y datos | PostgreSQL 17 desechable con cinco bases: migraciones y deriva, bootstrap, instalación de la Entrega 3 (revisión en esquema 1), autenticación y CMS/propuestas/retención |
| Extremo a extremo | Build y `next start` contra PostgreSQL desechable: web pública, accesibilidad (axe), menú y diálogos, alta y TOTP, CMS, textos legales, publicación, formulario con y sin JavaScript, bandeja, CSV, imágenes y retención |
| Lockfile | Que `pnpm-lock.yaml` corresponde a `package.json` |

Nunca se usan Neon, la base de preview, claves de API ni datos reales.

## Reglas
- **No se inventan datos ni se publica información interna** (prospección, contactos de marcas, estados comerciales sin publicar, marcas candidatas).
- Hasta el lanzamiento, los despliegues son entornos protegidos y no productivos.
- No se reinicializa la base: cualquier cambio de datos es una migración aditiva, un backfill versionado o una corrección de código, con tests.
