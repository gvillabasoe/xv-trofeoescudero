import { z } from "zod";

/**
 * Contrato del snapshot publicado (fase-2 §6 y §8): lo único que lee la web pública.
 * - Solo contiene lo público. Los objetos son estrictos: un campo que no esté aquí
 *   (por ejemplo, notas internas o estados comerciales sin publicar) hace fallar la publicación.
 * - Si cambia su forma, se sube VERSION_ESQUEMA_SNAPSHOT.
 */
export const VERSION_ESQUEMA_SNAPSHOT = 1;

const texto = z.string().trim().min(1);
const textoOpcional = texto.nullable();

export const TIPOS_CONTACTO = ["EMAIL", "TELEFONO", "WHATSAPP", "INSTAGRAM", "LINKEDIN", "WEB", "OTRO"] as const;
export const GENERACIONES = ["PRIMERA", "SEGUNDA", "TERCERA"] as const;
export const CLAVES_VIA = ["PECHO", "BOLSA", "JUEGO", "DESPUES"] as const;
export const TIPOS_ELEMENTO_VIA = ["NECESITAMOS", "PUEDES_APORTAR", "RECIBES", "CONDICION", "EJEMPLO"] as const;
export const TIPOS_COLABORACION = [
  "PATROCINADOR_PRINCIPAL_POLO",
  "WELCOME_PACK",
  "PREMIO_CONCURSO",
  "HOYO",
  "SORTEO_EXPERIENCIA",
  "OTRA",
] as const;
export const DISPONIBILIDADES = ["DISPONIBLE", "RESERVADO", "CERRADO"] as const;
export const TIPOS_CONCURSO = ["BOLA_MAS_CERCANA", "DRIVE_MAS_LARGO"] as const;
export const CAMPOS = ["NORTE", "SUR", "AMBOS"] as const;

export const esquemaSnapshot = z.strictObject({
  version: z.literal(VERSION_ESQUEMA_SNAPSHOT),
  sitio: z.strictObject({
    nombre: texto,
    edicion: texto,
    numeroEdicion: z.number().int().positive(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sede: texto,
    localidad: texto,
    afterParty: textoOpcional,
    seo: z.strictObject({ titulo: texto, descripcion: texto }),
  }),
  /** Solo los canales activos. */
  contacto: z.array(
    z.strictObject({
      tipo: z.enum(TIPOS_CONTACTO),
      etiqueta: texto,
      valor: texto,
      url: textoOpcional,
      enCierre: z.boolean(),
      enPie: z.boolean(),
    }),
  ),
  hero: z.strictObject({
    indice: texto,
    antetitulo: texto,
    tituloLinea1: texto,
    tituloLinea2: textoOpcional,
    entradilla: texto,
    ctaPrincipal: texto,
    ctaSecundario: texto,
    tarjetaMarcas: z.strictObject({ titulo: texto, texto: texto, enlace: texto }),
    cifras: z.array(z.strictObject({ etiqueta: texto, valor: texto, pie: textoOpcional })),
  }),
  /** null si el bloque está oculto. */
  familia: z
    .strictObject({
      indice: texto,
      titulo: texto,
      segundaGeneracion: z.strictObject({ etiqueta: texto, texto: texto }),
      terceraGeneracion: z.strictObject({ etiqueta: texto, texto: texto, pie: textoOpcional }),
      miembros: z.array(
        z.strictObject({
          nombre: texto,
          generacion: z.enum(GENERACIONES),
          texto: texto,
          pie: textoOpcional,
          /** Campo editorial manual; null si está vacío. */
          edad: z.number().int().positive().nullable(),
        }),
      ),
    })
    .nullable(),
  dia: z
    .strictObject({
      indice: texto,
      titulo: texto,
      entradilla: texto,
      norte: z.strictObject({
        etiqueta: texto,
        titulo: texto,
        texto: texto,
        destacado: textoOpcional,
        puente: textoOpcional,
      }),
      sur: z.strictObject({ etiqueta: texto, titulo: texto, texto: texto }),
      despues: z.strictObject({ etiqueta: texto, titulo: texto, texto: texto }),
      recorrido: z.array(z.strictObject({ etiqueta: texto, hora: textoOpcional })),
    })
    .nullable(),
  colaborar: z.strictObject({
    indice: texto,
    tituloLinea1: texto,
    tituloLinea2: textoOpcional,
    entradilla: texto,
    remate: textoOpcional,
    vias: z.array(
      z.strictObject({
        clave: z.enum(CLAVES_VIA),
        numero: z.number().int().positive(),
        titulo: texto,
        subtitulo: texto,
        texto: texto,
        cta: texto,
        tipoFormulario: z.enum(TIPOS_COLABORACION),
        elementos: z.array(z.strictObject({ tipo: z.enum(TIPOS_ELEMENTO_VIA), texto: texto })),
        oportunidades: z.array(
          z.strictObject({
            clave: texto,
            nombre: texto,
            descripcion: textoOpcional,
            /** Solo si su interruptor de publicación está activo; si no, null. */
            estado: z.enum(DISPONIBILIDADES).nullable(),
            hoyo: z.number().int().min(1).max(18).nullable(),
          }),
        ),
      }),
    ),
    concursos: z.strictObject({
      etiqueta: texto,
      titulo: texto,
      entradilla: texto,
      modelos: textoOpcional,
      denominacion: textoOpcional,
      cta: texto,
      hoyos: z.array(
        z.strictObject({
          numero: z.number().int().min(1).max(18),
          concurso: z.enum(TIPOS_CONCURSO),
          par: z.number().int().positive().nullable(),
          /** Solo si showCourse está activo (P8); si no, null. */
          campo: z.enum(CAMPOS).nullable(),
        }),
      ),
    }),
    dieciochoHoyos: z.strictObject({ titulo: texto, texto: texto }),
    notaTransparencia: texto,
  }),
  cierre: z
    .strictObject({
      indice: texto,
      historial: z.strictObject({
        titulo: texto,
        texto: texto,
        etiquetaMuro: texto,
        /** Solo las marcas que cumplen la regla de publicación. Sin logos hasta la F5. */
        marcas: z.array(
          z.strictObject({
            nombre: texto,
            slug: texto,
            categoria: texto,
            url: textoOpcional,
            descripcion: textoOpcional,
          }),
        ),
      }),
      solidaria: z.strictObject({ titulo: texto, texto: texto }).nullable(),
      tituloLinea1: texto,
      tituloLinea2: textoOpcional,
      texto: texto,
      microcopy: textoOpcional,
      cta: texto,
    })
    .nullable(),
});

export type SnapshotPublico = z.infer<typeof esquemaSnapshot>;
