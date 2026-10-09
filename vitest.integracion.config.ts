import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests de integración: necesitan PostgreSQL con las migraciones aplicadas.
// En CI son dos bases de un contenedor de servicio de GitHub Actions (sin secretos ni Neon):
// DIRECT_URL para las reglas de 0001_inicial y SEMILLA_URL, vacía, para el seed y la publicación.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
