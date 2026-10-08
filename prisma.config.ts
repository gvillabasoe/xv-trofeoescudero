import { defineConfig } from "prisma/config";

// Configuración de la CLI de Prisma 7.
// - Las migraciones usan la conexión DIRECTA (DIRECT_URL): el pooler de Neon no admite los
//   advisory locks de Prisma Migrate.
// - La aplicación no lee este archivo: en tiempo de ejecución usa DATABASE_URL (con pool) a través
//   del adaptador de Neon (src/server/db.ts).
// - `prisma generate` y `prisma validate` no se conectan a nada; por eso la URL puede faltar
//   (por ejemplo, en el build de CI) y no se usa `env()`, que fallaría si no existe.
// - Las variables no se cargan desde archivos .env: solo existen en Vercel y en CI.
const urlDirecta = process.env.DIRECT_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(urlDirecta ? { datasource: { url: urlDirecta } } : {}),
});
