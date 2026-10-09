import type { NextConfig } from "next";

// Cabeceras básicas de seguridad.
const cabecerasSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Durante la Fase 3 nada debe indexarse: no hay producción pública.
const cabecerasNoIndexar = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

// Panel y autenticación: nunca en cachés intermedias y sin enviar la URL a otros sitios.
// La CSP con nonce queda pendiente: con Cache Components exige revisar el renderizado (riesgo documentado).
const cabecerasPanel = [
  { key: "Cache-Control", value: "no-store" },
  { key: "Referrer-Policy", value: "no-referrer" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Cache Components: activa 'use cache', cacheTag y cacheLife (fase-2 §8). La web pública lee el snapshot
  // publicado desde la caché y se regenera al invalidar la etiqueta «site-public».
  cacheComponents: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...cabecerasSeguridad, ...cabecerasNoIndexar],
      },
      { source: "/admin/:path*", headers: cabecerasPanel },
      { source: "/admin", headers: cabecerasPanel },
      { source: "/api/auth/:path*", headers: cabecerasPanel },
    ];
  },
};

export default nextConfig;
