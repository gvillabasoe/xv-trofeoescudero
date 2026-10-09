/**
 * Datos demo (D-DEMO): separados del bootstrap y nunca automáticos.
 * - Solo en desarrollo o preview, con la base marcada NONPROD (demo.ts lo comprueba).
 * - Dominios example.com (reservados para ejemplos) y ninguna marca ni persona real.
 * - Todas las propuestas llevan isSynthetic = true.
 */

export const VERSION_LEGAL_SINTETICA = {
  versionLabel: "sintetica-1",
  body: "Texto sintético para pruebas en el entorno no productivo. No es la política de privacidad del Trofeo Escudero.",
} as const;

export const TEXTO_CONSENTIMIENTO = "He leído y acepto la política de privacidad.";

export const MENSAJE_FICTICIO =
  "Propuesta ficticia generada por el seed para probar la bandeja de propuestas. No corresponde a ninguna empresa ni persona real.";

export const PROPUESTAS_FICTICIAS = [
  {
    name: "Persona de Prueba Uno",
    company: "Empresa Ficticia Uno (prueba)",
    email: "prueba.uno@example.com",
    jobTitle: "Cargo ficticio",
    collaborationType: "PATROCINADOR_PRINCIPAL_POLO",
    originRouteKey: "PECHO",
    originHoleNumber: null,
    formOrigin: "via:PECHO · tipo:PATROCINADOR_PRINCIPAL_POLO",
    status: "NUEVA",
    archivada: false,
    leida: false,
    nota: null,
  },
  {
    name: "Persona de Prueba Dos",
    company: "Empresa Ficticia Dos (prueba)",
    email: "prueba.dos@example.com",
    jobTitle: null,
    collaborationType: "WELCOME_PACK",
    originRouteKey: "BOLSA",
    originHoleNumber: null,
    formOrigin: "via:BOLSA · tipo:WELCOME_PACK",
    status: "REVISADA",
    archivada: false,
    leida: true,
    nota: null,
  },
  {
    name: "Persona de Prueba Tres",
    company: "Empresa Ficticia Tres (prueba)",
    email: "prueba.tres@example.com",
    jobTitle: "Cargo ficticio",
    collaborationType: "HOYO",
    originRouteKey: "JUEGO",
    originHoleNumber: 12,
    formOrigin: "via:JUEGO · hoyo:12 · tipo:HOYO",
    status: "EN_CONVERSACION",
    archivada: false,
    leida: true,
    nota: "Nota ficticia de prueba.",
  },
  {
    name: "Persona de Prueba Cuatro",
    company: "Empresa Ficticia Cuatro (prueba)",
    email: "prueba.cuatro@example.com",
    jobTitle: null,
    collaborationType: "OTRA",
    originRouteKey: null,
    originHoleNumber: null,
    formOrigin: "directo · tipo:OTRA",
    status: "DESCARTADA",
    archivada: true,
    leida: true,
    nota: null,
  },
] as const;
