import type { Metadata } from "next";
import { Landing } from "@/components/publico/bloques";
import { MarcoPublico } from "@/components/publico/marco";
import { formatearFechaLarga } from "@/lib/etiquetas";
import type { SnapshotPublico } from "@/lib/snapshot/esquema";
import { leerLegales, leerVersionPublicada, legalesPublicados } from "@/server/snapshot-publico";

// Portada: los cinco bloques principales leídos de la versión publicada (snapshot), en caché.

export async function generateMetadata(): Promise<Metadata> {
  const version = await leerVersionPublicada();
  if (!version) return { title: "Trofeo Escudero" };
  const { sitio, hero } = version.snapshot;
  const imagen = sitio.imagenCompartir;
  return {
    title: { absolute: sitio.seo.titulo },
    description: sitio.seo.descripcion,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "es_ES",
      siteName: sitio.nombre,
      title: `${sitio.nombre} · ${sitio.edicion} · ${formatearFechaLarga(sitio.fecha)}`,
      description: [hero.tituloLinea1, hero.tituloLinea2].filter(Boolean).join(" "),
      url: "/",
      images: imagen
        ? [{ url: imagen.url, width: imagen.variantes[0]?.ancho, alt: imagen.alt }]
        : [{ url: "/compartir", width: 1200, height: 630, alt: `${sitio.nombre}, ${sitio.edicion}, ${formatearFechaLarga(sitio.fecha)}, ${sitio.localidad}` }],
    },
    twitter: { card: "summary_large_image" },
  };
}

function datosEstructurados(snapshot: SnapshotPublico) {
  const { sitio } = snapshot;
  // Sin organizador ni dirección postal hasta que estén confirmados (§7, P2).
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${sitio.nombre} · ${sitio.edicion}`,
    sport: "Golf",
    startDate: sitio.fecha,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: sitio.sede,
      address: { "@type": "PostalAddress", addressLocality: sitio.localidad },
    },
  };
}

export default async function Portada() {
  const [version, legales] = await Promise.all([leerVersionPublicada(), leerLegales()]);
  const snapshot = version?.snapshot ?? null;

  return (
    <MarcoPublico snapshot={snapshot} legales={legalesPublicados(legales)} enPortada>
      <main id="main" tabIndex={-1}>
        {snapshot ? (
          <>
            <Landing snapshot={snapshot} />
            <script
              type="application/ld+json"
              // Datos públicos del snapshot; «<» escapado para que no pueda cerrar la etiqueta.
              dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados(snapshot)).replace(/</g, "\\u003c") }}
            />
          </>
        ) : (
          <section className="pagina">
            <div className="wrap pagina-head">
              <h1 className="display">Todavía no hay ninguna versión publicada.</h1>
              <p className="lead">Este build no tiene base de datos (CI o local).</p>
            </div>
          </section>
        )}
      </main>
    </MarcoPublico>
  );
}
