import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const soloEnElAdaptador =
  "Solo src/server/db.ts crea el cliente de Prisma y elige el adaptador (Neon o PostgreSQL local). Importa desde @/server/db.";

// Los proveedores solo se importan dentro de su adaptador (plan de la Fase 3, §11).
const restriccionesPrisma = {
  paths: [
    { name: "@prisma/adapter-neon", message: soloEnElAdaptador },
    { name: "@prisma/adapter-pg", message: soloEnElAdaptador },
    { name: "@neondatabase/serverless", message: soloEnElAdaptador },
    { name: "pg", message: soloEnElAdaptador },
    {
      name: "@prisma/client",
      message: "Prisma 7 genera el cliente en src/generated/prisma. Importa desde @/server/db.",
    },
  ],
  patterns: [
    {
      group: ["**/generated/prisma/client"],
      importNames: ["PrismaClient"],
      message: soloEnElAdaptador,
    },
  ],
};

const restriccionBetterAuth = {
  group: ["better-auth", "better-auth/*"],
  message: "Better Auth solo se usa en src/server/auth (y en el proxy).",
};

const restriccionBlob = {
  group: ["@vercel/blob", "@vercel/blob/*"],
  message: "Vercel Blob solo se usa en su adaptador: src/server/medios/almacen.ts.",
};

// Archivos que sí pueden usar Better Auth.
const adaptadorAuth = ["src/server/auth/**/*.{ts,tsx}", "src/proxy.ts"];
// Único archivo que puede usar Vercel Blob.
const adaptadorBlob = ["src/server/medios/almacen.ts"];

// Configuración flat recomendada por Next.js 16 (next lint ya no existe).
// En flat config, una regla definida dos veces para el mismo archivo se sustituye: por eso cada grupo
// de archivos tiene su propia lista completa de restricciones.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/db.ts", ...adaptadorAuth, ...adaptadorBlob],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: restriccionesPrisma.paths,
          patterns: [...restriccionesPrisma.patterns, restriccionBetterAuth, restriccionBlob],
        },
      ],
    },
  },
  {
    files: adaptadorAuth,
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: restriccionesPrisma.paths, patterns: [...restriccionesPrisma.patterns, restriccionBlob] },
      ],
    },
  },
  {
    files: adaptadorBlob,
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: restriccionesPrisma.paths, patterns: [...restriccionesPrisma.patterns, restriccionBetterAuth] },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
]);

export default eslintConfig;
