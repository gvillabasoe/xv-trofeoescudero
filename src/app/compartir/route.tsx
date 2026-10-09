import { ImageResponse } from "next/og";
import { formatearFechaLarga } from "@/lib/etiquetas";
import { leerVersionPublicada } from "@/server/snapshot-publico";

/**
 * Imagen para compartir en redes por defecto (fase-1 §7): placeholder tipográfico en verde, marfil y latón,
 * mientras no haya una imagen OG autorizada en la biblioteca. Se genera con lo publicado (en caché).
 */
export async function GET() {
  const version = await leerVersionPublicada();
  const sitio = version?.snapshot.sitio;
  const nombre = sitio?.nombre ?? "Trofeo Escudero";
  const detalle = sitio ? `${sitio.edicion} · ${formatearFechaLarga(sitio.fecha)} · ${sitio.sede}` : "";
  const frase = version ? [version.snapshot.hero.tituloLinea1, version.snapshot.hero.tituloLinea2].filter(Boolean) : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#12382C",
          color: "#F4F0E6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34 }}>
          <div style={{ width: 28, height: 4, background: "#B49755" }} />
          {nombre}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 64, lineHeight: 1.05 }}>
          {frase.map((linea, indice) => (
            <div key={indice} style={{ color: indice === 1 ? "#D2BE8E" : "#F4F0E6" }}>
              {linea}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 2, color: "#D2BE8E", textTransform: "uppercase" }}>
          {detalle}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
