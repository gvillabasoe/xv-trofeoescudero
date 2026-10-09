import { aSlug, type Campo, type Errores, type Valores } from "@/lib/panel/campos";
import { OPCIONES } from "@/lib/panel/opciones";
import type { AccionAuditada } from "@/server/auditoria";
import type { ConsultasBD } from "@/server/db";

/**
 * Registro de lo que se edita desde el panel: qué tabla, qué campos y qué reglas.
 * Las acciones genéricas (entidades.ts) solo aceptan claves de este registro y solo escriben estos campos.
 */

export type NombreModelo =
  | "siteSettings"
  | "policySettings"
  | "pageSection"
  | "heroContent"
  | "heroFigure"
  | "familyContent"
  | "familyMember"
  | "dayContent"
  | "dayStep"
  | "collaborationContent"
  | "closingContent"
  | "collaborationRoute"
  | "routeItem"
  | "opportunity"
  | "competitionHole"
  | "sponsorCategory"
  | "sponsor"
  | "contactChannel"
  | "legalPage";

export interface ContextoValidacion {
  tx: ConsultasBD;
  /** Fila actual (null al crear). */
  actual: Record<string, unknown> | null;
}

export interface DefinicionEntidad {
  modelo: NombreModelo;
  /** Para la auditoría: «la portada», «una cifra»… */
  nombre: string;
  campos: Campo[];
  /** Campos al crear, si son distintos (p. ej., el tipo de un texto de vía solo se elige al crearlo). */
  camposCreacion?: Campo[];
  idNumerico?: boolean;
  accion?: AccionAuditada;
  /** false: no cambia nada de la web pública (configuración interna, textos legales sin publicar). */
  afectaPublicacion?: boolean;
  /** Elementos de una lista ordenada: campo del padre y campos que agrupan a los hermanos. */
  lista?: { padre?: string; grupo?: string[] };
  borrable?: boolean;
  validar?(datos: Valores, contexto: ContextoValidacion): Promise<Errores>;
  /** Datos adicionales al crear (claves, slugs…). */
  preparar?(datos: Valores, tx: ConsultasBD): Promise<Valores>;
}

const t = (nombre: string, etiqueta: string, extra: Partial<Campo> = {}): Campo => ({ nombre, etiqueta, tipo: "texto", ...extra });
const a = (nombre: string, etiqueta: string, extra: Partial<Campo> = {}): Campo => ({
  nombre,
  etiqueta,
  tipo: "area",
  ancho: true,
  ...extra,
});
const c = (nombre: string, etiqueta: string, extra: Partial<Campo> = {}): Campo => ({ nombre, etiqueta, tipo: "casilla", ...extra });

const VISIBLE = c("isVisible", "Visible en la web");

async function slugLibre(tx: ConsultasBD, modelo: "sponsor" | "sponsorCategory", base: string): Promise<string> {
  const raiz = aSlug(base) || "entidad";
  for (let intento = 0; intento < 50; intento += 1) {
    const slug = intento === 0 ? raiz : `${raiz}-${intento + 1}`;
    const existe =
      modelo === "sponsor"
        ? await tx.sponsor.findUnique({ where: { slug }, select: { id: true } })
        : await tx.sponsorCategory.findUnique({ where: { slug }, select: { id: true } });
    if (!existe) return slug;
  }
  throw new Error("No se ha podido generar un identificador libre.");
}

const PATRON_TELEFONO = /^\+?[\d\s]{6,20}$/;
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export const REGISTRO = {
  sitio: {
    modelo: "siteSettings",
    nombre: "la configuración general",
    idNumerico: true,
    accion: "CONFIGURACION_GUARDADA",
    campos: [
      t("siteName", "Nombre del torneo", { max: 80 }),
      t("editionLabel", "Edición (texto)", { max: 40, ayuda: "Por ejemplo, «XV Edición»." }),
      { nombre: "editionNumber", etiqueta: "Número de edición", tipo: "numero", min: 1, max: 99 },
      { nombre: "eventDate", etiqueta: "Fecha del torneo", tipo: "fecha" },
      t("venueName", "Sede", { max: 120 }),
      t("location", "Localidad", { max: 120 }),
      t("afterPartyName", "AfterParty oficial", { opcional: true, max: 120 }),
      t("seoTitle", "Título para buscadores", { max: 70, ayuda: "Máximo 70 caracteres." }),
      a("seoDescription", "Descripción para buscadores", { max: 200, filas: 3, ayuda: "Máximo 200 caracteres." }),
      t("legalOwnerName", "Titular legal (nombre o razón social)", { opcional: true, max: 160, privado: true }),
      t("legalOwnerTaxId", "NIF / CIF del titular", { opcional: true, max: 20, privado: true }),
      a("legalOwnerAddress", "Domicilio del titular", { opcional: true, max: 300, filas: 2, privado: true }),
    ],
  },
  politica: {
    modelo: "policySettings",
    nombre: "la política de retención",
    idNumerico: true,
    accion: "CONFIGURACION_GUARDADA",
    afectaPublicacion: false,
    campos: [
      {
        nombre: "submissionAnonymizeMonths",
        etiqueta: "Anonimizar propuestas sin actividad tras (meses)",
        tipo: "numero",
        min: 1,
        max: 120,
        ayuda: "La tarea diaria borra sus datos personales. Plazo pendiente de validación legal.",
      },
      { nombre: "auditRetentionMonths", etiqueta: "Conservar la actividad del panel (meses)", tipo: "numero", min: 6, max: 120 },
      { nombre: "retiredMediaPurgeDays", etiqueta: "Borrar archivos de imágenes retiradas tras (días)", tipo: "numero", min: 1, max: 365 },
      { nombre: "fingerprintMaxDays", etiqueta: "Caducidad máxima de las huellas antiabuso (días)", tipo: "numero", min: 1, max: 30 },
      {
        nombre: "revisionsToKeep",
        etiqueta: "Versiones publicadas de referencia",
        tipo: "numero",
        min: 10,
        max: 1000,
        ayuda: "Informativo: las versiones publicadas no se borran nunca.",
      },
    ],
  },
  bloque: {
    modelo: "pageSection",
    nombre: "un bloque",
    campos: [t("indexLabel", "Índice del bloque", { max: 60, ayuda: "Por ejemplo, «02 / La familia»." }), VISIBLE],
    async validar(datos, { actual }): Promise<Errores> {
      if (datos.isVisible === false && (actual?.key === "HERO" || actual?.key === "COLABORAR")) {
        return { isVisible: "Este bloque es obligatorio: no se puede ocultar." };
      }
      return {};
    },
  },
  hero: {
    modelo: "heroContent",
    nombre: "el Hero",
    campos: [
      t("eyebrow", "Antetítulo", { max: 120, ancho: true }),
      t("titleLine1", "Titular · primera línea", { max: 120 }),
      t("titleLine2", "Titular · segunda línea", { opcional: true, max: 120 }),
      a("lead", "Entradilla", { max: 600, filas: 3 }),
      t("primaryCtaLabel", "Botón principal (lleva a Colaborar)", { max: 40 }),
      t("secondaryCtaLabel", "Botón secundario (lleva a /proponer)", { max: 40 }),
      t("brandCardTitle", "Tarjeta de marcas · título", { max: 120 }),
      a("brandCardText", "Tarjeta de marcas · texto", { max: 400, filas: 2 }),
      t("brandCardLinkLabel", "Tarjeta de marcas · enlace", { max: 80 }),
    ],
  },
  cifra: {
    modelo: "heroFigure",
    nombre: "una cifra",
    lista: { padre: "heroId" },
    borrable: true,
    campos: [
      t("label", "Cabecera", { max: 40 }),
      t("value", "Cifra o dato", { max: 40, ayuda: "Exacta y confirmada. Usa «~» para una cifra aproximada." }),
      t("caption", "Aclaración", { opcional: true, max: 120 }),
      t("internalSource", "Fuente (interna)", { opcional: true, max: 200, privado: true }),
      VISIBLE,
    ],
  },
  familia: {
    modelo: "familyContent",
    nombre: "el bloque Familia",
    campos: [
      t("title", "Titular", { max: 160, ancho: true }),
      t("secondGenerationLabel", "Segunda generación · etiqueta", { max: 80 }),
      a("secondGenerationText", "Segunda generación · texto", { max: 600, filas: 3 }),
      t("thirdGenerationLabel", "3ª Generación · etiqueta", { max: 80 }),
      a("thirdGenerationText", "3ª Generación · texto", { max: 600, filas: 3 }),
      t("thirdGenerationCaption", "3ª Generación · pie de foto", { opcional: true, max: 120 }),
    ],
  },
  miembro: {
    modelo: "familyMember",
    nombre: "una persona de la familia",
    lista: { padre: "familyId" },
    borrable: true,
    campos: [
      t("name", "Nombre", { max: 80 }),
      { nombre: "generation", etiqueta: "Generación", tipo: "seleccion", opciones: OPCIONES.generacion },
      a("text", "Texto", { max: 800, filas: 3 }),
      t("caption", "Pie de foto", { opcional: true, max: 120, ayuda: "Máximo 8 palabras (humor seco)." }),
      {
        nombre: "ageManual",
        etiqueta: "Edad (opcional)",
        tipo: "numero",
        opcional: true,
        min: 1,
        max: 120,
        ayuda: "Campo manual: si está vacío no se muestra. No se calcula ni se guarda la fecha de nacimiento.",
      },
      VISIBLE,
    ],
  },
  dia: {
    modelo: "dayContent",
    nombre: "el bloque El día",
    campos: [
      t("title", "Titular", { max: 160, ancho: true }),
      a("lead", "Entradilla", { max: 600, filas: 2 }),
      t("northLabel", "Campo Norte · etiqueta", { max: 80 }),
      t("northTitle", "Campo Norte · titular", { max: 160 }),
      a("northText", "Campo Norte · texto", { max: 800, filas: 3 }),
      t("northHighlight", "Campo Norte · dato destacado", { opcional: true, max: 120 }),
      a("northBridge", "Campo Norte · puente comercial", { opcional: true, max: 600, filas: 2 }),
      t("southLabel", "Campo Sur · etiqueta", { max: 80 }),
      t("southTitle", "Campo Sur · titular", { max: 160 }),
      a("southText", "Campo Sur · texto", { max: 600, filas: 2 }),
      t("afterLabel", "Después del 18 · etiqueta", { max: 80 }),
      t("afterTitle", "Después del 18 · titular", { max: 160 }),
      a("afterText", "Después del 18 · texto", { max: 600, filas: 2 }),
    ],
  },
  paso: {
    modelo: "dayStep",
    nombre: "un paso del recorrido",
    lista: { padre: "dayId" },
    borrable: true,
    campos: [
      t("label", "Paso", { max: 60 }),
      t("time", "Hora (opcional)", { opcional: true, max: 20, ayuda: "Si está vacía, no se muestra." }),
      VISIBLE,
    ],
  },
  colaborar: {
    modelo: "collaborationContent",
    nombre: "el bloque Colaborar",
    campos: [
      t("titleLine1", "Titular · primera línea", { max: 160 }),
      t("titleLine2", "Titular · segunda línea", { opcional: true, max: 160 }),
      a("lead", "Entradilla", { max: 600, filas: 3 }),
      t("closingLine", "Remate", { opcional: true, max: 200, ancho: true }),
      t("holesLabel", "Concursos · etiqueta", { max: 80 }),
      t("holesTitle", "Concursos · titular", { max: 160 }),
      a("holesLead", "Concursos · entradilla", { max: 400, filas: 2 }),
      a("holesModelsText", "Concursos · modelos", { opcional: true, max: 400, filas: 2 }),
      a("holesNamingText", "Concursos · ejemplos de denominación", { opcional: true, max: 400, filas: 2 }),
      t("holesCtaLabel", "Concursos · botón", { max: 40 }),
      t("allHolesTitle", "Los 18 hoyos · titular", { max: 160 }),
      a("allHolesText", "Los 18 hoyos · texto", { max: 600, filas: 3 }),
      a("transparencyNote", "Nota de transparencia (texto literal aprobado)", { max: 600, filas: 3 }),
    ],
  },
  cierre: {
    modelo: "closingContent",
    nombre: "el bloque de cierre",
    campos: [
      t("historyTitle", "Historial · titular", { max: 160 }),
      a("historyText", "Historial · texto", { max: 600, filas: 2 }),
      t("wallLabel", "Etiqueta del muro de marcas", { max: 120, ancho: true }),
      t("charityTitle", "Colaboración solidaria · titular", { max: 160 }),
      a("charityText", "Colaboración solidaria · texto", { max: 800, filas: 3 }),
      c("charityVisible", "Mostrar la colaboración solidaria"),
      t("closingTitleLine1", "Cierre · titular, primera línea", { max: 160 }),
      t("closingTitleLine2", "Cierre · titular, segunda línea", { opcional: true, max: 160 }),
      a("closingText", "Cierre · texto", { max: 800, filas: 3 }),
      a("closingMicrocopy", "Cierre · microcopy", { opcional: true, max: 300, filas: 2 }),
      t("closingCtaLabel", "Cierre · botón", { max: 40 }),
    ],
  },
  via: {
    modelo: "collaborationRoute",
    nombre: "una vía de colaboración",
    lista: {},
    campos: [
      t("title", "Título", { max: 60 }),
      t("subtitle", "Subtítulo", { max: 120 }),
      a("cardCopy", "Texto de la tarjeta", { max: 400, filas: 2 }),
      t("ctaLabel", "Botón", { max: 60 }),
      {
        nombre: "formType",
        etiqueta: "Tipo que se preselecciona en el formulario",
        tipo: "seleccion",
        opciones: OPCIONES.tipoColaboracion,
      },
      VISIBLE,
    ],
  },
  elemento: {
    modelo: "routeItem",
    nombre: "un texto de vía",
    lista: { padre: "routeId", grupo: ["kind"] },
    borrable: true,
    campos: [a("text", "Texto", { max: 1200, filas: 3 })],
    camposCreacion: [
      { nombre: "kind", etiqueta: "Apartado", tipo: "seleccion", opciones: OPCIONES.elementoVia },
      a("text", "Texto", { max: 1200, filas: 3 }),
    ],
  },
  oportunidad: {
    modelo: "opportunity",
    nombre: "una oportunidad",
    lista: { padre: "routeId" },
    borrable: true,
    campos: [
      t("name", "Nombre", { max: 120 }),
      a("publicDescription", "Descripción pública", { opcional: true, max: 400, filas: 2 }),
      { nombre: "maxSponsors", etiqueta: "Máximo de marcas", tipo: "numero", opcional: true, min: 1, max: 50 },
      {
        nombre: "availability",
        etiqueta: "Estado comercial (interno)",
        tipo: "seleccion",
        opciones: OPCIONES.disponibilidad,
        privado: true,
      },
      c("showStatusPublicly", "Publicar el estado comercial", {
        ayuda: "Apagado por defecto. Si lo enciendes, el estado aparece en el detalle de la vía.",
      }),
      a("internalNotes", "Notas internas", { opcional: true, max: 2000, filas: 3, privado: true }),
      VISIBLE,
    ],
    async preparar(datos, tx) {
      const base = aSlug(String(datos.name ?? "oportunidad")) || "oportunidad";
      for (let intento = 0; intento < 50; intento += 1) {
        const key = intento === 0 ? base : `${base}-${intento + 1}`;
        if (!(await tx.opportunity.findUnique({ where: { key }, select: { id: true } }))) return { key };
      }
      throw new Error("No se ha podido generar una clave libre.");
    },
  },
  hoyo: {
    modelo: "competitionHole",
    nombre: "un hoyo",
    campos: [
      { nombre: "contestType", etiqueta: "Concurso", tipo: "seleccion", opcional: true, opciones: OPCIONES.concurso },
      { nombre: "par", etiqueta: "Par", tipo: "numero", opcional: true, min: 3, max: 6 },
      {
        nombre: "course",
        etiqueta: "Campo",
        tipo: "seleccion",
        opcional: true,
        opciones: OPCIONES.campo,
        ayuda: "Solo cuando esté confirmado (P8).",
      },
      c("showCourse", "Mostrar el campo en la web"),
      c("isContestVisible", "Mostrar el concurso en la web"),
    ],
    async validar(datos): Promise<Errores> {
      return datos.showCourse === true && !datos.course ? { course: "Elige el campo antes de mostrarlo." } : {};
    },
  },
  categoria: {
    modelo: "sponsorCategory",
    nombre: "una categoría",
    lista: {},
    borrable: true,
    campos: [
      t("name", "Nombre", { max: 80 }),
      c("requiresLegalReview", "Exige revisión jurídica (p. ej., bebidas alcohólicas)"),
    ],
    async preparar(datos, tx) {
      return { slug: await slugLibre(tx, "sponsorCategory", String(datos.name ?? "categoria")) };
    },
  },
  patrocinador: {
    modelo: "sponsor",
    nombre: "una entidad",
    lista: {},
    campos: [
      t("name", "Nombre", { max: 120 }),
      { nombre: "relationshipType", etiqueta: "Relación", tipo: "seleccion", opciones: OPCIONES.relacion },
      { nombre: "temporalRelation", etiqueta: "Cuándo", tipo: "seleccion", opciones: OPCIONES.temporalidad },
      c("confirmed", "Relación confirmada", {
        ayuda: "Solo se registran relaciones reales. Nunca posibles patrocinadores ni prospección.",
      }),
      { nombre: "source", etiqueta: "Fuente", tipo: "seleccion", opciones: OPCIONES.fuente, privado: true },
      t("sourceNote", "Nota sobre la fuente", { opcional: true, max: 300, privado: true }),
      { nombre: "categoryId", etiqueta: "Categoría", tipo: "seleccion" },
      t("currentRoleLabel", "Papel actual", { opcional: true, max: 80, ayuda: "Por ejemplo, «AfterParty oficial»." }),
      t("editionsNote", "Ediciones", { opcional: true, max: 80, ayuda: "Solo si se conocen. Por ejemplo, «X edición»." }),
      { nombre: "url", etiqueta: "Web", tipo: "url", opcional: true },
      t("shortDescription", "Descripción breve", { opcional: true, max: 200 }),
      c("publicVisibility", "Mostrar en el muro de marcas", { ayuda: "Independiente del hecho histórico." }),
      {
        nombre: "logoPermission",
        etiqueta: "Permiso para usar su logo",
        tipo: "seleccion",
        opciones: OPCIONES.permisoLogo,
        privado: true,
      },
      { nombre: "legalReview", etiqueta: "Revisión jurídica", tipo: "seleccion", opciones: OPCIONES.revisionJuridica, privado: true },
    ],
    async validar(datos, { tx }) {
      const errores: Errores = {};
      const categoria =
        typeof datos.categoryId === "string"
          ? await tx.sponsorCategory.findUnique({ where: { id: datos.categoryId }, select: { requiresLegalReview: true } })
          : null;
      if (!categoria) errores.categoryId = "Elige una categoría.";
      if (categoria?.requiresLegalReview && datos.legalReview === "NO_REQUERIDA") {
        errores.legalReview = "Esta categoría exige revisión jurídica: elige Pendiente, Aprobada o Rechazada.";
      }
      if (datos.publicVisibility === true && datos.confirmed !== true) {
        errores.publicVisibility = "Solo se pueden mostrar relaciones confirmadas.";
      }
      return errores;
    },
    async preparar(datos, tx) {
      return { slug: await slugLibre(tx, "sponsor", String(datos.name ?? "entidad")), lifecycle: "ACTIVO" };
    },
  },
  canal: {
    modelo: "contactChannel",
    nombre: "un canal de contacto",
    lista: {},
    borrable: true,
    campos: [
      { nombre: "type", etiqueta: "Tipo", tipo: "seleccion", opciones: OPCIONES.tipoContacto },
      t("label", "Texto del enlace", { max: 80, ayuda: "Por ejemplo, «Escribir por WhatsApp»." }),
      t("value", "Dato", { max: 200, ayuda: "El email, el teléfono con prefijo o el nombre de la cuenta." }),
      {
        nombre: "url",
        etiqueta: "Enlace",
        tipo: "url",
        opcional: true,
        ayuda: "Obligatorio para Instagram, LinkedIn, web y otros. Para email, teléfono y WhatsApp se genera solo.",
      },
      c("isActive", "Activo", { ayuda: "Apagado, no se publica en ningún sitio." }),
      c("showInClosing", "Mostrar en el cierre"),
      c("showInFooter", "Mostrar en el pie"),
    ],
    async validar(datos) {
      const errores: Errores = {};
      const valor = String(datos.value ?? "");
      if (datos.type === "EMAIL" && !PATRON_EMAIL.test(valor)) errores.value = "Escribe un email válido.";
      if ((datos.type === "TELEFONO" || datos.type === "WHATSAPP") && !PATRON_TELEFONO.test(valor)) {
        errores.value = "Escribe el teléfono con su prefijo: solo números, espacios y «+».";
      }
      if (["INSTAGRAM", "LINKEDIN", "WEB", "OTRO"].includes(String(datos.type)) && !datos.url) {
        errores.url = "Este tipo de canal necesita el enlace completo (https://…).";
      }
      return errores;
    },
  },
  legal: {
    modelo: "legalPage",
    nombre: "un texto legal",
    afectaPublicacion: false,
    campos: [
      t("title", "Título", { max: 120, ancho: true }),
      a("body", "Texto", {
        max: 50_000,
        filas: 24,
        ayuda: "Formato: «## Apartado», «### Subapartado», listas con «- », **negrita** y [enlace](https://…).",
      }),
      c("isComplete", "Texto completo y revisado", {
        ayuda: "Imprescindible para publicar una versión. Con la privacidad publicada se abre el formulario.",
      }),
    ],
  },
} satisfies Record<string, DefinicionEntidad>;

export type ClaveEntidad = keyof typeof REGISTRO;

export function definicion(clave: string): DefinicionEntidad | null {
  return Object.prototype.hasOwnProperty.call(REGISTRO, clave) ? (REGISTRO as Record<string, DefinicionEntidad>)[clave] ?? null : null;
}
