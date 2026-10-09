# Operación

Todo se hace desde las webs de Vercel, Neon y GitHub. Ningún paso necesita terminal.

## Variables de Vercel
Lista completa y comentada en [`.env.example`](../.env.example). Resumen:

| Variable | Obligatoria | Ámbito | Notas |
|---|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Sí | Production y Preview | Neon, rama `preview` hasta el lanzamiento. «Sensitive» |
| `ENTORNO_DATOS` | Sí | Production y Preview | `NONPROD` hasta el lanzamiento. No sensible |
| `BETTER_AUTH_SECRET`, `FINGERPRINT_HMAC_SECRET` | Sí | Production y Preview | 32 caracteres o más. Mismo valor en ambos ámbitos |
| `ADMIN_SETUP_SECRET` | Solo para el alta inicial | Production | Se borra después del alta |
| `CRON_SECRET` | Sí | Production | 16 caracteres o más. Protege la tarea diaria |
| `BLOB_STORE_ID` (o `BLOB_READ_WRITE_TOKEN`) | Para subir imágenes | Production y Preview | Las añade Vercel al conectar el almacén |
| `RESEND_API_KEY`, `NOTIFICACIONES_DE`, `NOTIFICACIONES_PARA` | No | Production | Avisos de propuestas nuevas, sin datos personales |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | No | — | Preparado y desactivado: requiere aprobación |
| `URL_PUBLICA`, `SITIO_PUBLICO` | No, hasta el lanzamiento | Production | Ver [lanzamiento](lanzamiento.md) |

Después de cambiar una variable hay que volver a desplegar (Deployments › ⋯ › Redeploy).

## Servicios
- **Neon** (base de datos). Rama `preview` hasta el lanzamiento; la de producción se crea en el lanzamiento.
- **Vercel Blob** (imágenes). Un solo almacén **privado** (D-MEDIA-PRIVADO): originales y variantes. La web sirve las variantes por `/medios/…` y comprueba en cada petición que siguen autorizadas. Caché del CDN: una hora como máximo.
- **Vercel Cron** (tarea diaria). `/api/cron/retencion`, todos los días entre las 04:00 y las 04:59 UTC (plan Hobby: una vez al día y con margen de una hora). Si falla una ejecución, Vercel no reintenta; la siguiente procesa lo pendiente (es idempotente).
- **Resend** (opcional). Solo avisos internos.

## Tarea diaria de retención
1. Anonimiza las propuestas sin actividad desde hace el plazo configurado (24 meses por defecto, pendiente de validación legal).
2. Borra las huellas antiabuso caducadas (30 días como máximo), las sesiones y las verificaciones caducadas.
3. Recorta la actividad del panel más antigua que el plazo configurado (24 meses por defecto).
4. Borra los archivos de las imágenes retiradas hace más de 30 días (el registro se conserva si una versión publicada la usó).
5. Deja una línea en «Actividad» con los recuentos.

Para comprobarla: Vercel › Settings › Cron Jobs › View Logs. Una respuesta 401 significa que falta `CRON_SECRET` o no coincide.

## Copias y recuperación
- **Contenido publicado:** cada publicación es una versión inmutable en Neon. Panel › Versiones › Restaurar.
- **Despliegues:** Vercel › Deployments › Instant Rollback vuelve al despliegue anterior en segundos (no toca la base de datos).
- **Base de datos:** Neon guarda historial para restaurar una rama a un momento anterior (Branches › Restore). Antes de restaurar, crea una rama de seguridad desde el estado actual. En el plan gratuito el historial es corto: consulta el periodo disponible en la consola de Neon.
- **Imágenes:** el almacén Blob no tiene papelera. Las imágenes retiradas se conservan 30 días antes de borrar sus archivos.

## Incidencias habituales
| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El build falla con «falta ENTORNO_DATOS» o «DIRECT_URL» | Variable ausente o mal escrita | Revisar las variables y volver a desplegar |
| «Subida incompleta» en el log de Vercel o CI omitido | Falta un lote de la entrega | Subir el lote que falta; el despliegue sale solo |
| La web no muestra un cambio | No se ha publicado | Panel › Revisar y publicar |
| «/proponer» dice que no puede recibir propuestas | No hay política de privacidad publicada | Panel › Textos legales › Privacidad › Publicar |
| La biblioteca de imágenes no deja subir | Almacén Blob sin conectar | Vercel › Storage › Blob (privado) › Connect › Redeploy |
| Un administrador perdió el móvil y los códigos | — | No hay recuperación por email (decisión de seguridad). Se gestiona con soporte técnico sobre la base de datos |
| Muchos «Demasiados envíos» | Abuso o una red compartida | El límite se renueva cada 15 minutos |

## Datos y privacidad
- La IP nunca se guarda: solo una huella HMAC con caducidad. La IP y el navegador de las sesiones del panel se borran con la sesión.
- Las propuestas son privadas: nunca entran en el snapshot ni en la web.
- La actividad del panel no guarda emails, teléfonos, mensajes, contraseñas, códigos ni IP.
