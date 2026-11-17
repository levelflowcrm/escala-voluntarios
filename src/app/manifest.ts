import type { MetadataRoute } from "next";

/** Torna o Mais Conectados instalável na tela inicial (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mais Conectados",
    short_name: "Mais Conectados",
    description: "Escalas, confirmações e cuidado com os voluntários da igreja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    background_color: "#ffffff",
    theme_color: "#7c3aed",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
