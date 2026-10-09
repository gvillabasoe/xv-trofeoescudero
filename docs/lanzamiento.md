# Lista de lanzamiento (F8)

**La web no se lanza sin completar esta lista y sin tu aprobación expresa.** Hasta entonces sigue protegida por Vercel Authentication, con la base no productiva y marcada como «noindex».

## 1. Contenido y textos legales (organización)
- [ ] **P2 · Titular legal:** nombre o razón social, NIF y domicilio en Configuración.
- [ ] **P2 · Política de privacidad** redactada por la organización (o su asesoría) y publicada en Textos legales. Incluye el plazo de conservación de las propuestas y ajústalo en Configuración › Retención.
- [ ] **P2 · Aviso legal** publicado.
- [ ] **P1 · Al menos un canal de contacto** activo (o confirmar que solo se usará el formulario).
- [ ] **P6 · Permisos de logos:** «Autorizado» solo con permiso escrito de cada marca. Sin permiso, el muro muestra el nombre.
- [ ] **Castillo de Cuzcurrita:** sigue oculto mientras la revisión jurídica no esté aprobada.
- [ ] **P4 · Fotos:** con consentimiento de las personas y, si hay menores, autorización de sus tutores.
- [ ] Revisión completa de la vista previa a 375, 768, 1024 y 1440 px.

## 2. Base de datos de producción (con aviso previo)
- [ ] Crear en Neon la rama o el proyecto de producción, en Fráncfort.
- [ ] En Vercel (solo ámbito Production): `DATABASE_URL` y `DIRECT_URL` de producción, `ENTORNO_DATOS=PROD` y secretos nuevos y distintos (`BETTER_AUTH_SECRET`, `FINGERPRINT_HMAC_SECRET`, `CRON_SECRET`, `ADMIN_SETUP_SECRET` para el alta).
- [ ] Antes, una entrega específica habilita el bootstrap de producción (hoy el bootstrap solo admite `NONPROD`) y el marcador `PROD`. **No se hace sin aviso.**
- [ ] Alta inicial del administrador en producción, activar TOTP y borrar `ADMIN_SETUP_SECRET`.
- [ ] Publicar el contenido revisado en producción.

## 3. Dominio y servicios
- [ ] **P3 · Dominio:** añadirlo en Vercel › Domains y configurar el DNS.
- [ ] `URL_PUBLICA` con el dominio (`https://…`, sin barra final).
- [ ] Almacén Blob privado de producción conectado.
- [ ] (Opcional) Resend con el dominio verificado y las tres variables de avisos.
- [ ] Comprobar en Settings › Cron Jobs que la tarea diaria responde 200.
- [ ] **Plan de Vercel:** Hobby es de uso no comercial. Valorar si la web de patrocinio necesita el plan Pro.

## 4. Abrir la web (último paso, con tu aprobación)
- [ ] `SITIO_PUBLICO=si` en Production y volver a desplegar: activa la indexación, el `robots.txt` definitivo y retira `/estado`.
- [ ] Quitar la protección: Vercel › Settings › Deployment Protection › Vercel Authentication solo para Preview (o desactivada).
- [ ] Comprobar: portada, `/proponer` (enviar una propuesta de prueba y anonimizarla después), `/privacidad`, `/aviso-legal`, `robots.txt`, `sitemap.xml` y la imagen al compartir.

## 5. Pendientes técnicos conocidos
- CSP con nonce (cabecera Content-Security-Policy) pendiente: requiere revisar el renderizado con Cache Components.
- ESLint 10: actualización pendiente en una entrega aparte.
- Tarea diaria con Vercel Authentication activa: confirmar en los logs que la invocación llega (si no, se verá un 401 o la ausencia de la línea «[retencion]»).
