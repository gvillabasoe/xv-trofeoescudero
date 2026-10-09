import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const soloEnElAdaptador =
  "Solo src/server/db.ts crea el cliente de Prisma y usa el adaptador de Neon. Importa desde @/server/db.";

// Los proveedores solo se importan dentro de su adaptador (plan de la Fase 3, §11).
const restriccionesPrisma = {
  paths: [
    { name: "@prisma/adapter-neon", message: soloEnElAdaptador },
    { name: "@neondatabase/serverless", message: soloEnElAdaptador },
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
  message: "Better Auth solo se usa en src/server/auth (y en su route handler y en el proxy).",
};

// Archivos que sí pueden usar Better Auth.
const adaptadorAuth = ["src/server/auth/**/*.{ts,tsx}", "src/app/api/auth/**/*.{ts,tsx}", "src/proxy.ts"];

// Configuración flat recomendada por Next.js 16 (next lint ya no existe).
// En flat config, una regla definida dos veces para el mismo archivo se sustituye: por eso cada grupo
// de archivos tiene su propia lista completa de restricciones.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/db.ts", ...adaptadorAuth],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: restriccionesPrisma.paths, patterns: [...restriccionesPrisma.patterns, restriccionBetterAuth] },
      ],
    },
  },
  {
    files: adaptadorAuth,
    rules: {
      "no-restricted-imports": ["error", restriccionesPrisma],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts", "src/generated/**"]),
]);

export default eslintConfig;
