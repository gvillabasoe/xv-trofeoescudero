import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de extremo a extremo (F7). Se ejecutan contra la aplicación compilada (`next start`) y un PostgreSQL
 * desechable con datos de prueba: en CI, el del propio job; nunca Neon.
 * - E2E_URL: dirección de la aplicación (por defecto, http://localhost:3100).
 * - E2E_ARRANCAR=si: Playwright arranca `next start` él mismo (CI).
 */
const url = process.env.E2E_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: url,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }],
  webServer:
    process.env.E2E_ARRANCAR === "si"
      ? {
          command: "pnpm start -p 3100",
          url,
          reuseExistingServer: false,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe",
        }
      : undefined,
});
