import { describe, expect, it } from "vitest";
import { motivoDemoNoPermitida } from "@/server/semilla/demo";

describe("motivoDemoNoPermitida", () => {
  it("permite desarrollo, CI y preview con NONPROD", () => {
    expect(motivoDemoNoPermitida({ ENTORNO_DATOS: "NONPROD" })).toBeNull();
    expect(motivoDemoNoPermitida({ VERCEL_ENV: "preview", ENTORNO_DATOS: "NONPROD" })).toBeNull();
    expect(motivoDemoNoPermitida({ VERCEL_ENV: "development", ENTORNO_DATOS: "NONPROD" })).toBeNull();
  });

  it("nunca funciona en el entorno Production de Vercel", () => {
    expect(motivoDemoNoPermitida({ VERCEL_ENV: "production", ENTORNO_DATOS: "NONPROD" })).toMatch(/production/);
  });

  it("exige ENTORNO_DATOS=NONPROD", () => {
    expect(motivoDemoNoPermitida({ VERCEL_ENV: "preview", ENTORNO_DATOS: "PROD" })).toMatch(/NONPROD/);
    expect(motivoDemoNoPermitida({ VERCEL_ENV: "preview" })).toMatch(/NONPROD/);
  });

  it("rechaza una conexión a la base de producción si se ha configurado su host", () => {
    expect(
      motivoDemoNoPermitida({
        VERCEL_ENV: "preview",
        ENTORNO_DATOS: "NONPROD",
        PRODUCCION_DB_HOST: "ep-prod-1.eu-central-1.aws.neon.tech",
        DATABASE_URL: "postgresql://u:c@ep-prod-1-pooler.eu-central-1.aws.neon.tech/neondb",
      }),
    ).toMatch(/producción/);
  });
});
