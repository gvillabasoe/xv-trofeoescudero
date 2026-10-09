/** Los cinco bloques de la portada en el panel: dirección de su editor y nombre. */
export const BLOQUES_PANEL = {
  HERO: { slug: "hero", nombre: "1 · Hero y cifras" },
  FAMILIA: { slug: "familia", nombre: "2 · La familia" },
  EL_DIA: { slug: "el-dia", nombre: "3 · El día y 3ª Generación" },
  COLABORAR: { slug: "colaborar", nombre: "4 · Colaborar" },
  CIERRE: { slug: "cierre", nombre: "5 · Ediciones anteriores y cierre" },
} as const;

export type SlugBloque = (typeof BLOQUES_PANEL)[keyof typeof BLOQUES_PANEL]["slug"];
