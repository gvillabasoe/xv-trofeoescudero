import { z } from "zod";
import {
  CAMPOS,
  CLAVES_VIA,
  DISPONIBILIDADES,
  GENERACIONES,
  TIPOS_COLABORACION,
  TIPOS_CONCURSO,
  TIPOS_CONTACTO,
  TIPOS_ELEMENTO_VIA,
  texto,
  textoOpcional,
} from "./comun";

/**
 * Snapshot versión 1 (Entregas 3 y 4): sin imágenes. Se conserva para leer y verificar las revisiones
 * publicadas con esa versión (la nº 1, por ejemplo). Las revisiones son inmutables: nunca se reescriben;
 * al leerlas se normalizan a la versión vigente (leer.ts).
 */
export const VERSION_ESQUEMA_SNAPSHOT_V1 = 1;

export const esquemaSnapshotV1 = z.strictObject({
  version: z.literal(VERSION_ESQUEMA_SNAPSHOT_V1),
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

export type SnapshotV1 = z.infer<typeof esquemaSnapshotV1>;
