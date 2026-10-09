import type { NextConfig } from "next";

// Cabeceras básicas de seguridad. La CSP con nonce para /admin llega en la Entrega 4.
const cabecerasSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Durante la Fase 3 nada debe indexarse: no hay producción pública.
const cabecerasNoIndexar = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

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
    ];
  },
};

export default nextConfig;
