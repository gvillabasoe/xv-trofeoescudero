# Manual del panel

Para la organización. Todo se hace desde el navegador, en `/admin`. Nada de lo que guardas cambia la web hasta que publicas.

## Entrar
1. `/admin/login`: email y contraseña.
2. Código de 6 cifras de tu app de autenticación (o uno de los códigos de recuperación, que sirven una sola vez).
3. Si pierdes el móvil, entra con un código de recuperación y, en **Seguridad**, genera códigos nuevos.

Las sesiones duran 12 horas. En **Seguridad** ves tus sesiones abiertas y puedes cerrarlas.

## El ciclo de trabajo
1. **Editas** en «Textos de la web», «Vías y hoyos», «Marcas», «Imágenes» o «Contacto». Cada formulario guarda en el **borrador**.
2. **Revisas** en «Vista previa del borrador» (arriba a la derecha): es la web tal como quedaría.
3. **Publicas** en «Revisar y publicar». El panel comprueba todo antes y te dice qué falta, qué se queda fuera y qué cambia.
4. La web pública cambia al momento. Cada publicación queda en **Versiones**.

Si dos personas editan lo mismo a la vez, la segunda verá el aviso «Otra persona ha guardado cambios aquí mientras editabas»: recarga la página y vuelve a hacer tu cambio. Nunca se pisa nada sin querer.

## Secciones
| Sección | Qué haces | Lo importante |
|---|---|---|
| Inicio | Ver propuestas nuevas, cambios sin publicar y tareas pendientes | La lista «Pendiente» te recuerda lo que falta para abrir el formulario o lanzar |
| Propuestas | Leer, cambiar el estado, añadir notas internas, archivar, anonimizar, eliminar y exportar a CSV | Los datos personales son solo para responder. La exportación queda registrada |
| Textos de la web | Los cinco bloques, la franja de cifras, las personas de la familia y el recorrido del día | Solo cifras confirmadas. Sin «fundador». La edad es opcional y manual. Hero y Colaborar no se pueden ocultar |
| Vías y hoyos | Las cuatro vías, sus textos de detalle, las oportunidades y los 18 hoyos | El estado comercial (Disponible, Reservado, Cerrado) y las notas son internos. El estado solo sale en la web si activas «Publicar el estado comercial». El campo de un hoyo, solo cuando esté confirmado |
| Marcas | Patrocinadores y colaboradores reales; categorías | Solo relaciones confirmadas: nunca marcas candidatas ni prospección. «Mostrar en el muro» es independiente del hecho histórico. Las categorías con revisión jurídica (bodega / vino) solo se publican con la revisión aprobada |
| Imágenes | Subir fotos y logos, revisar derechos, autorizar, asignar y retirar | Sin texto alternativo, sin consentimiento o, si hay menores, sin autorización de los tutores, no se publica. Los logos necesitan el permiso de la marca |
| Contacto | Canales de la organización (email, teléfono, WhatsApp…) | Solo se publican los activos. Nunca datos de contacto de marcas |
| Textos legales | Política de privacidad y aviso legal | Los redacta la organización. Sin política de privacidad publicada, el formulario está cerrado |
| Revisar y publicar | Validar y publicar el borrador | Lee el informe: «Qué hay que corregir», «Se publicará sin esto» y «Qué cambia» |
| Versiones | Historial de publicaciones y restauración | Restaurar publica una versión nueva y revisa antes los derechos de hoy. El borrador no cambia |
| Configuración | Datos generales, retención y estado de los servicios | El plazo de anonimización está pendiente de validación legal |
| Actividad | Quién hizo qué y cuándo | No guarda emails, teléfonos, mensajes ni direcciones IP |
| Seguridad | TOTP, códigos de recuperación y sesiones | — |

## Imágenes, paso a paso
1. **Subir:** JPEG, PNG o WebP. Si pesa más de 4 MB, el navegador la reduce antes de subirla. Se eliminan los metadatos (ubicación incluida).
2. **Datos y derechos:** texto alternativo, pie de foto opcional, punto focal y las casillas de personas, menores y consentimientos.
3. **Autorizar** (si falta algo, el panel te dice qué).
4. **Asignar** a un hueco («Portada», «La familia · Nacho Escudero», «Logo · …»). Mientras un hueco no tiene foto, la web muestra una ilustración.
5. **Publicar** desde «Revisar y publicar».

**Si alguien retira su consentimiento:** abre la imagen › «Retirar» con «Quitarla también de la versión publicada ahora». Deja de servirse al instante y se publica una copia de la versión vigente sin ella (el resto del borrador no se publica).

## Propuestas
- **Estados:** Nueva → Revisada → Contactada → En conversación → Cerrada o Descartada. Cada cambio queda en el historial.
- **Anonimizar** borra el nombre, la empresa, el email, el teléfono, el texto y las notas; se conservan el tipo, el estado y las fechas.
- **Eliminar** borra la propuesta y su historial. Las dos acciones piden doble confirmación y no se pueden deshacer.
- **CSV:** usa los filtros de la bandeja. Se abre bien en Excel (separador «;»). No incluye los datos demo.
- La tarea diaria anonimiza las propuestas sin actividad pasado el plazo de Configuración.

## Lo que el panel no hace (a propósito)
- No inventa textos legales, datos de contacto ni cifras.
- No crea más administradores: el alta inicial es única.
- No envía emails a las marcas: solo avisa a la organización (si está configurado) sin datos personales.
