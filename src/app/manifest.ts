import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nuruna",
    short_name: "Nuruna",
    description:
      "Platform belajar Al-Qur'an yang inklusif untuk tunanetra, tunarungu, tunawicara, dan semua orang, dengan bantuan AI.",
    lang: "id",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#02533C",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/nuruna-logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
