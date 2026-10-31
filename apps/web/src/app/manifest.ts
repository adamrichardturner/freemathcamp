import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.alternateName} — ${SITE.name}`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/learn",
    scope: "/",
    display: "standalone",
    background_color: "#fbfbfe",
    theme_color: SITE.themeColor,
    categories: ["education"],
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512" },
      { src: "/icon-maskable-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
  };
}
