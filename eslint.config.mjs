import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const soloEnElAdaptador =
  "Solo src/server/db.ts crea el cliente de Prisma y usa el adaptador de Neon. Importa desde @/server/db.";

// Configuración flat recomendada por Next.js 16 (next lint ya no existe).
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Los proveedores solo se importan dentro de su adaptador (plan de la Fase 3, §11).
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/db.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
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
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts", "src/generated/**"]),
]);

export default eslintConfig;
