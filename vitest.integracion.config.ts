import { defineConfig } from "vitest/config";

// Tests de integración: necesitan un PostgreSQL con las migraciones aplicadas.
// En CI es un contenedor de servicio de GitHub Actions (sin secretos ni Neon).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
