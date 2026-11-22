import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // O service worker (avisos por push) nunca pode ficar preso no cache, senão o aparelho não recebe a versão nova.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
