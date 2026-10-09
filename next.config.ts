import type { NextConfig } from "next";

// Cabeceras básicas de seguridad.
const cabecerasSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

// Hasta el lanzamiento (SITIO_PUBLICO=si, lo activa la organización) nada se indexa.
const indexable = process.env.SITIO_PUBLICO === "si";
const cabecerasNoIndexar = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

// Panel: nunca en cachés intermedias, sin enviar la URL a otros sitios y nunca indexado.
// La CSP con nonce queda pendiente: con Cache Components exige revisar el renderizado (riesgo documentado).
const cabecerasPanel = [
  { key: "Cache-Control", value: "no-store" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Cache Components: activa 'use cache', cacheTag y cacheLife (fase-2 §8). La web pública lee lo publicado
  // desde la caché y se regenera al invalidar la etiqueta «site-public».
  cacheComponents: true,
  // Recomendado por Next 16.4 para proyectos nuevos con Cache Components.
  partialPrefetching: true,
  experimental: {
    // Subida de imágenes desde el panel: 4 MB (el cuerpo de una función de Vercel admite 4,5 MB).
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: indexable ? cabecerasSeguridad : [...cabecerasSeguridad, ...cabecerasNoIndexar],
      },
      { source: "/admin/:path*", headers: cabecerasPanel },
      { source: "/admin", headers: cabecerasPanel },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
