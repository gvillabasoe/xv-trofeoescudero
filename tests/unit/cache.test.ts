import { afterEach, describe, expect, it, vi } from "vitest";

// next/cache solo funciona dentro de Next: aquí se sustituye para comprobar qué etiqueta y qué vida usa la lectura.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

const cache = await import("next/cache");
const { leerVersionPublicada } = await import("@/server/snapshot-publico");
const { crearInvalidador } = await import("@/server/cache/invalidacion");
const { ETIQUETA_SITIO_PUBLICO, RUTAS_SITIO_PUBLICO } = await import("@/lib/cache");

afterEach(() => {
  vi.clearAllMocks();
});

describe("lectura pública en caché", () => {
  it("usa la etiqueta «site-public» y la vida «max»", async () => {
    const anterior = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      // Sin base de datos devuelve null, pero ya ha declarado su etiqueta y su vida de caché.
      expect(await leerVersionPublicada()).toBeNull();
    } finally {
      if (anterior !== undefined) process.env.DATABASE_URL = anterior;
    }
    expect(ETIQUETA_SITIO_PUBLICO).toBe("site-public");
    expect(cache.cacheTag).toHaveBeenCalledWith("site-public");
    expect(cache.cacheLife).toHaveBeenCalledWith("max");
  });
});

describe("servicio de invalidación", () => {
  it("invalida la etiqueta «site-public» y revalida las rutas públicas", () => {
    const api = { updateTag: vi.fn(), revalidatePath: vi.fn() };
    const resultado = crearInvalidador(api).invalidarSitioPublico();

    expect(api.updateTag).toHaveBeenCalledExactlyOnceWith("site-public");
    expect(api.revalidatePath.mock.calls.map(([ruta]) => ruta)).toEqual([...RUTAS_SITIO_PUBLICO]);
    expect(resultado).toEqual({ etiqueta: "site-public", rutas: ["/", "/estado"] });
  });
});
