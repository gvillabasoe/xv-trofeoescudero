import { describe, expect, it, vi } from "vitest";
import { limitesRetencion, restarMeses } from "@/lib/retencion";
import { sitioIndexable, urlBaseSitio } from "@/lib/sitio";
import { describirAlmacen } from "@/server/medios/almacen";
import { crearNotificador, textoAviso } from "@/server/notificaciones/notificador";
import { turnstileActivo, verificarTurnstile } from "@/server/propuestas/turnstile";
import { esBaseLocal } from "@/server/db";

describe("retención", () => {
  it("resta meses respetando el final de mes", () => {
    expect(restarMeses(new Date("2027-03-31T10:00:00.000Z"), 1).toISOString()).toBe("2027-02-28T10:00:00.000Z");
    expect(restarMeses(new Date("2027-08-03T00:00:00.000Z"), 24).toISOString()).toBe("2025-08-03T00:00:00.000Z");
  });

  it("deja un día de margen en la auditoría para no rozar el límite del trigger", () => {
    const ahora = new Date("2027-08-03T12:00:00.000Z");
    const limites = limitesRetencion({ submissionAnonymizeMonths: 24, auditRetentionMonths: 24, retiredMediaPurgeDays: 30 }, ahora);
    expect(limites.propuestas.toISOString()).toBe("2025-08-03T12:00:00.000Z");
    expect(limites.auditoria.toISOString()).toBe("2025-08-02T12:00:00.000Z");
    expect(limites.mediosRetirados).toBe(30);
  });
});

describe("avisos de propuestas nuevas", () => {
  const aviso = {
    id: "propuesta-123",
    creadaEn: new Date("2027-05-01T10:00:00.000Z"),
    tipo: "WELCOME_PACK" as const,
    enlace: "https://example.com/admin/propuestas/propuesta-123",
  };

  it("sin configuración no envía nada", async () => {
    const notificador = crearNotificador({});
    expect(notificador.nombre).toBe("ninguno");
    expect(await notificador.nuevaPropuesta(aviso)).toEqual({ enviado: false, motivo: "sin-configurar" });
  });

  it("con Resend envía solo referencia, fecha, tipo y enlace", async () => {
    const peticion = vi.fn(async () => new Response("{}", { status: 200 }));
    const notificador = crearNotificador(
      { RESEND_API_KEY: "re_prueba", NOTIFICACIONES_DE: "avisos@example.com", NOTIFICACIONES_PARA: "a@example.com, b@example.com" },
      peticion as unknown as typeof fetch,
    );
    expect(await notificador.nuevaPropuesta(aviso)).toEqual({ enviado: true });
    const cuerpo = JSON.parse(String((peticion.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(cuerpo).toMatchObject({ from: "avisos@example.com", to: ["a@example.com", "b@example.com"] });
    expect(cuerpo.text).toContain("propuesta-123");
    expect(cuerpo.text).toContain("Welcome pack");
    expect(textoAviso(aviso).texto).toContain("no incluye los datos de la propuesta");
  });

  it("un fallo de Resend no rompe nada", async () => {
    const notificador = crearNotificador(
      { RESEND_API_KEY: "re_prueba", NOTIFICACIONES_DE: "avisos@example.com", NOTIFICACIONES_PARA: "a@example.com" },
      (async () => {
        throw new Error("sin red");
      }) as unknown as typeof fetch,
    );
    expect(await notificador.nuevaPropuesta(aviso)).toEqual({ enviado: false, motivo: "error" });
  });
});

describe("servicios preparados y entorno", () => {
  it("Turnstile está desactivado salvo que existan las dos claves", async () => {
    expect(turnstileActivo({})).toBe(false);
    expect(await verificarTurnstile("", {})).toBe(true);
    expect(turnstileActivo({ TURNSTILE_SECRET_KEY: "x", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "y" })).toBe(true);
    expect(await verificarTurnstile("", { TURNSTILE_SECRET_KEY: "x", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "y" })).toBe(false);
  });

  it("el almacén solo usa disco fuera de Vercel", () => {
    expect(describirAlmacen({})).toBeNull();
    expect(describirAlmacen({ BLOB_STORE_ID: "store" })).toBe("vercel-blob");
    expect(describirAlmacen({ ALMACEN_LOCAL_DIR: "/tmp/x" })).toBe("disco-local");
    expect(describirAlmacen({ ALMACEN_LOCAL_DIR: "/tmp/x", VERCEL: "1" })).toBeNull();
  });

  it("nada se indexa hasta SITIO_PUBLICO=si, y la URL base sale de URL_PUBLICA o de Vercel", () => {
    expect(sitioIndexable({})).toBe(false);
    expect(sitioIndexable({ SITIO_PUBLICO: "true" })).toBe(false);
    expect(sitioIndexable({ SITIO_PUBLICO: "si" })).toBe(true);
    expect(urlBaseSitio({ URL_PUBLICA: "https://trofeo.example/" })).toBe("https://trofeo.example");
    expect(urlBaseSitio({ URL_PUBLICA: "javascript:x", VERCEL_PROJECT_PRODUCTION_URL: "app.vercel.app" })).toBe(
      "https://app.vercel.app",
    );
  });

  it("solo una base de esta máquina usa el adaptador de PostgreSQL", () => {
    expect(esBaseLocal("postgresql://u@localhost:5432/x")).toBe(true);
    expect(esBaseLocal("postgresql://u@127.0.0.1/x")).toBe(true);
    expect(esBaseLocal("postgresql://u@ep-x-pooler.eu-central-1.aws.neon.tech/neondb")).toBe(false);
  });
});
