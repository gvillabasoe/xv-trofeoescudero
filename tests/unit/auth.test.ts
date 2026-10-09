import { describe, expect, it } from "vitest";
import { secretoCorrecto } from "@/server/auth/alta-inicial";
import { hostsPermitidos } from "@/server/auth/config";
import { huellaDeCabeceras, ipDeCabeceras } from "@/server/auth/huella";
import { presentarTotp } from "@/server/auth/totp";
import { codigoTotp } from "../helpers/totp";

const SECRETO = "x".repeat(32);

describe("huella antiabuso", () => {
  it("usa la primera IP de x-forwarded-for, normalizada", () => {
    expect(ipDeCabeceras(new Headers({ "x-forwarded-for": " 203.0.113.5 , 10.0.0.1" }))).toBe("203.0.113.5");
    expect(ipDeCabeceras(new Headers({ "x-real-ip": "2001:DB8::1" }))).toBe("2001:db8::1");
    expect(ipDeCabeceras(new Headers())).toBe("desconocida");
  });

  it("es un HMAC estable que no contiene la IP", () => {
    const cabeceras = new Headers({ "x-forwarded-for": "203.0.113.5" });
    const huella = huellaDeCabeceras(cabeceras, SECRETO);
    expect(huella).toMatch(/^[0-9a-f]{64}$/);
    expect(huella).not.toContain("203");
    expect(huellaDeCabeceras(cabeceras, SECRETO)).toBe(huella);
    expect(huellaDeCabeceras(cabeceras, "y".repeat(32))).not.toBe(huella);
  });

  it("exige FINGERPRINT_HMAC_SECRET", () => {
    expect(() => huellaDeCabeceras(new Headers(), undefined)).toThrow(/FINGERPRINT_HMAC_SECRET/);
  });
});

describe("secreto de alta inicial", () => {
  it("solo acepta el valor exacto y exige un secreto configurado de 32 caracteres o más", () => {
    expect(secretoCorrecto(SECRETO, SECRETO)).toBe(true);
    expect(secretoCorrecto(`${SECRETO}x`, SECRETO)).toBe(false);
    expect(secretoCorrecto("corto", "corto")).toBe(false);
    expect(secretoCorrecto(SECRETO, undefined)).toBe(false);
  });
});

describe("hosts de Better Auth", () => {
  it("solo admite los hosts de este despliegue y localhost, nunca un comodín", () => {
    expect(
      hostsPermitidos({
        VERCEL_URL: "trofeo-abc123.vercel.app",
        VERCEL_BRANCH_URL: "trofeo-git-entrega-4.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "trofeo.vercel.app",
      }),
    ).toEqual(["trofeo-abc123.vercel.app", "trofeo-git-entrega-4.vercel.app", "trofeo.vercel.app", "localhost:*"]);
    expect(hostsPermitidos({})).toEqual(["localhost:*"]);
  });
});

describe("presentación del TOTP", () => {
  it("genera el QR como imagen SVG y la clave legible", () => {
    const { qrDataUri, clave } = presentarTotp("otpauth://totp/Trofeo%20Escudero:admin@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Trofeo%20Escudero");
    expect(qrDataUri.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(clave).toBe("JBSW Y3DP EHPK 3PXP");
  });
});

describe("código TOTP de los tests (RFC 6238)", () => {
  it("coincide con el vector de prueba conocido", () => {
    // Secreto «12345678901234567890» (vector del RFC 6238) en base32, a los 59 segundos: 94287082 → 287082.
    expect(codigoTotp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000)).toBe("287082");
  });
});
