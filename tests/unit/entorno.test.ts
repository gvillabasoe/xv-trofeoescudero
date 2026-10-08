import { describe, expect, it } from "vitest";
import { abreviarCommit, describirEntorno } from "../../src/lib/entorno";

describe("describirEntorno", () => {
  it("traduce los entornos de Vercel", () => {
    expect(describirEntorno("production")).toBe("Producción");
    expect(describirEntorno("preview")).toBe("Preview");
    expect(describirEntorno("development")).toBe("Desarrollo");
  });

  it("usa un valor neutro fuera de Vercel", () => {
    expect(describirEntorno(undefined)).toBe("Local o CI");
    expect(describirEntorno("otro")).toBe("Local o CI");
  });
});

describe("abreviarCommit", () => {
  it("abrevia un SHA válido a 7 caracteres", () => {
    expect(abreviarCommit("0123456789abcdef0123456789abcdef01234567")).toBe("0123456");
  });

  it("rechaza valores ausentes o no hexadecimales", () => {
    expect(abreviarCommit(undefined)).toBe("sin commit");
    expect(abreviarCommit("no-es-un-sha")).toBe("sin commit");
    expect(abreviarCommit("abc12")).toBe("sin commit");
  });
});
