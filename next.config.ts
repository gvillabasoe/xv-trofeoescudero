import type { NextConfig } from "next";

// Cabeceras básicas de seguridad. La CSP con nonce para /admin llega en el PR-4.
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
