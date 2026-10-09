import { describe, expect, it } from "vitest";
import {
  aImagenPublica,
  esPatrocinadorPublicable,
  motivoMedioNoPublicable,
  prepararPublicacion,
  type MedioBorrador,
} from "@/lib/snapshot/construir";
import { VERSION_ESQUEMA_SNAPSHOT, esquemaSnapshot } from "@/lib/snapshot/esquema";
import { hashContenido } from "@/lib/snapshot/hash";
import { SnapshotIlegible, leerSnapshotGuardado, normalizarV1 } from "@/lib/snapshot/leer";
import { buscarDatosPrivados } from "@/lib/snapshot/privacidad";
import { borradorInicial } from "@/server/semilla/borrador-inicial";
import { aSnapshotV1 } from "../helpers/snapshot-v1";

const ID = "0123456789abcdef0123456789abcdef";

function medio(cambios: Partial<MedioBorrador> = {}): MedioBorrador {
  return {
    id: ID,
    kind: "FOTO",
    reviewState: "AUTORIZADA",
    retirada: false,
    altText: "Una salida en El Rompido",
    caption: null,
    focalX: 0.5,
    focalY: 0.4,
    width: 2400,
    height: 1600,
    hasIdentifiablePeople: false,
    includesMinors: false,
    consentConfirmed: false,
    guardianConsentConfirmed: false,
    variants: [
      { format: "WEBP", width: 640, publicPathname: `${ID}-640.webp` },
      { format: "WEBP", width: 1280, publicPathname: `${ID}-1280.webp` },
      { format: "WEBP", width: 1920, publicPathname: `${ID}-1920.webp` },
      { format: "JPEG", width: 1200, publicPathname: `${ID}-1200.jpg` },
    ],
    ...cambios,
  };
}

/** Versión 1 tal como la publicaba la Entrega 3 (sin imágenes). */
const snapshotV1 = () => aSnapshotV1(prepararPublicacion(borradorInicial("entrega-3")).snapshot);

describe("snapshot versión 2", () => {
  it("el contenido inicial se publica con la versión 2 y sin imágenes", () => {
    const { snapshot, avisos, medios } = prepararPublicacion(borradorInicial());
    expect(snapshot.version).toBe(VERSION_ESQUEMA_SNAPSHOT);
    expect(snapshot.hero.imagen).toBeNull();
    expect(snapshot.cierre?.historial.marcas.every((marca) => marca.logo === null)).toBe(true);
    expect(avisos).toEqual([]);
    expect(medios).toEqual([]);
  });

  it("una revisión de la versión 1 se lee y se normaliza sin cambiar su huella", () => {
    const v1 = snapshotV1();
    const lectura = leerSnapshotGuardado(JSON.parse(JSON.stringify(v1)));
    expect(lectura.version).toBe(1);
    expect(hashContenido(lectura.guardado)).toBe(hashContenido(v1));
    expect(esquemaSnapshot.parse(lectura.snapshot).version).toBe(2);
    expect(lectura.snapshot.hero.imagen).toBeNull();
    expect(normalizarV1(v1).cierre?.historial.marcas).toHaveLength(17);
  });

  it("rechaza versiones desconocidas y snapshots alterados", () => {
    expect(() => leerSnapshotGuardado({ version: 9 })).toThrow(SnapshotIlegible);
    expect(() => leerSnapshotGuardado({ ...snapshotV1(), campoExtra: true })).toThrow(SnapshotIlegible);
  });
});

describe("imágenes publicables", () => {
  it("exigen autorización, texto alternativo, consentimientos y versiones web", () => {
    expect(motivoMedioNoPublicable(medio())).toBeNull();
    expect(motivoMedioNoPublicable(medio({ reviewState: "EN_REVISION" }))).toMatch(/autorizada/);
    expect(motivoMedioNoPublicable(medio({ reviewState: "RETIRADA" }))).toMatch(/retirada/);
    expect(motivoMedioNoPublicable(medio({ retirada: true }))).toMatch(/retirada/);
    expect(motivoMedioNoPublicable(medio({ altText: "  " }))).toMatch(/texto alternativo/);
    expect(motivoMedioNoPublicable(medio({ hasIdentifiablePeople: true }))).toMatch(/consentimiento/);
    expect(motivoMedioNoPublicable(medio({ hasIdentifiablePeople: true, consentConfirmed: true }))).toBeNull();
    expect(motivoMedioNoPublicable(medio({ includesMinors: true }))).toMatch(/tutores/);
    expect(motivoMedioNoPublicable(medio({ variants: [] }))).toMatch(/versiones web/);
  });

  it("los logos necesitan además el permiso de la marca", () => {
    expect(motivoMedioNoPublicable(medio({ kind: "LOGO" }), { esLogo: true, permisoLogo: "PENDIENTE" })).toMatch(/logo/);
    expect(motivoMedioNoPublicable(medio({ kind: "LOGO" }), { esLogo: true, permisoLogo: "AUTORIZADO" })).toBeNull();
  });

  it("la imagen pública solo lleva rutas /medios, medidas, alt y punto focal", () => {
    const imagen = aImagenPublica(medio());
    expect(imagen).toEqual({
      url: `/medios/${ID}-1280.webp`,
      alt: "Una salida en El Rompido",
      ancho: 2400,
      alto: 1600,
      focoX: 0.5,
      focoY: 0.4,
      pie: null,
      variantes: [
        { url: `/medios/${ID}-640.webp`, ancho: 640 },
        { url: `/medios/${ID}-1280.webp`, ancho: 1280 },
        { url: `/medios/${ID}-1920.webp`, ancho: 1920 },
      ],
    });
    expect(aImagenPublica(medio(), "JPEG").url).toBe(`/medios/${ID}-1200.jpg`);
    // Las rutas de imagen contienen cifras, pero no son teléfonos: el inspector de privacidad no las marca.
    expect(buscarDatosPrivados({ hero: { imagen } })).toEqual([]);
  });

  it("una imagen no publicable queda fuera con un aviso; el resto se publica", () => {
    const borrador = borradorInicial();
    const conFoto = {
      ...borrador,
      hero: borrador.hero && { ...borrador.hero, imagenes: [{ orden: 0, medio: medio() }] },
      familia: borrador.familia && {
        ...borrador.familia,
        members: borrador.familia.members.map((miembro, indice) =>
          indice === 0 ? { ...miembro, imagenes: [{ orden: 0, medio: medio({ id: "b".repeat(32), hasIdentifiablePeople: true }) }] } : miembro,
        ),
      },
    };
    const { snapshot, avisos, medios } = prepararPublicacion(conFoto);
    expect(snapshot.hero.imagen?.url).toBe(`/medios/${ID}-1280.webp`);
    expect(snapshot.familia?.miembros[0]?.foto).toBeNull();
    expect(avisos).toEqual(["La imagen de Nacho Escudero no se publica: aparecen personas y falta confirmar su consentimiento."]);
    expect(medios).toEqual([ID]);
  });
});

describe("regla de publicación de marcas", () => {
  const base = {
    name: "Bodega",
    slug: "bodega",
    confirmed: true,
    publicVisibility: true,
    lifecycle: "ACTIVO" as const,
    legalReview: "NO_REQUERIDA" as const,
    url: null,
    shortDescription: null,
    category: "Bodega / vino",
  };

  it("si la categoría exige revisión jurídica, solo se publica con la revisión aprobada", () => {
    expect(esPatrocinadorPublicable({ ...base, categoryRequiresLegalReview: true })).toBe(false);
    expect(esPatrocinadorPublicable({ ...base, categoryRequiresLegalReview: true, legalReview: "PENDIENTE" })).toBe(false);
    expect(esPatrocinadorPublicable({ ...base, categoryRequiresLegalReview: true, legalReview: "APROBADA" })).toBe(true);
    expect(esPatrocinadorPublicable({ ...base, categoryRequiresLegalReview: false })).toBe(true);
  });

  it("Castillo de Cuzcurrita sigue fuera del snapshot del contenido inicial", () => {
    const { snapshot } = prepararPublicacion(borradorInicial());
    expect(JSON.stringify(snapshot)).not.toContain("Cuzcurrita");
  });
});
