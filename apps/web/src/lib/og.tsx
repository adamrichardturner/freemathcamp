import { getExercise } from "@fmc/curriculum";
import type { Metadata } from "next";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { course, graph } from "./course";
import { absoluteUrl, plainText } from "./site";

/** Shared look for generated share images (1200×630). Rendered at build time by next/og. */
export const OG_SIZE = { width: 1200, height: 630 };

export const SITE_IMAGE_ALT = "Free Math Camp — all the maths you need before calculus, free";

/**
 * Share images live at plain `.png` paths (`/og.png`, `/og/<course>/<lesson>.png`) rather than
 * Next's `opengraph-image?<hash>` convention: WhatsApp and some other link unfurlers skip images
 * whose URL has no extension or carries a query string.
 */
export const ogImagePath = (courseId?: string, exerciseId?: string) => (courseId && exerciseId ? `/og/${courseId}/${exerciseId}.png` : "/og.png");

/** Open Graph and Twitter tags for a share image, with every property the unfurlers read. */
export function shareImage(path: string, alt: string) {
  const url = absoluteUrl(path);
  const image = { url, secureUrl: url, type: "image/png", ...OG_SIZE, alt };
  return { openGraph: { images: [image] }, twitter: { card: "summary_large_image", images: [image] } } satisfies Metadata;
}

const IMAGE_HEADERS = { "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" };

// Cached so the images prerender at build time (uncached file reads would make them request-time).
async function fontFile(style: "normal" | "italic") {
  "use cache";
  const buf = await readFile(join(process.cwd(), `node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-${style}.woff`));
  return new Uint8Array(buf);
}

// A cached Uint8Array can be a view into a larger buffer; hand the renderer exactly its bytes.
const exactBuffer = (u8: Uint8Array) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;

export const ogFonts = async () => [
  { name: "Instrument Serif", data: exactBuffer(await fontFile("normal")), style: "normal" as const, weight: 400 as const },
  { name: "Instrument Serif", data: exactBuffer(await fontFile("italic")), style: "italic" as const, weight: 400 as const },
];

export async function logoDataUri() {
  "use cache";
  return `data:image/svg+xml;base64,${(await readFile(join(process.cwd(), "public/logo.svg"))).toString("base64")}`;
}

export function OgFrame({ logo, children, footer }: { logo: string; children: ReactNode; footer: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        color: "#f4f3fb",
        backgroundColor: "#14131f",
        backgroundImage: "radial-gradient(circle at 18% 12%, rgba(91,75,224,0.55), transparent 45%), radial-gradient(circle at 92% 95%, rgba(217,84,122,0.45), transparent 45%)",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={72} height={72} alt="" />
        <div style={{ display: "flex", fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>
          FreeMath<span style={{ color: "#a99cff" }}>Camp</span>
        </div>
      </div>
      {children}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: "#b9b6d3" }}>
        <div style={{ display: "flex" }}>{footer}</div>
        <div style={{ display: "flex", color: "#f4f3fb" }}>freemathcamp.app</div>
      </div>
    </div>
  );
}

export async function siteImage() {
  const logo = await logoDataUri();
  return new ImageResponse(
    (
      <OgFrame logo={logo} footer={`${graph.refs.length} free lessons · ${course.units.length} units · adaptive practice`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 96, lineHeight: 1, letterSpacing: -2 }}>Free Math Camp</div>
          <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 54, lineHeight: 1.1, color: "#d8d4f5" }}>
            All the maths you need&nbsp;<span style={{ fontStyle: "italic", color: "#f0a3bc" }}>before</span>&nbsp;calculus.
          </div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts: await ogFonts(), headers: IMAGE_HEADERS },
  );
}

export async function lessonImage(courseId: string, exerciseId: string) {
  const ref = getExercise(courseId, exerciseId);
  const logo = await logoDataUri();
  const title = ref?.exercise.title ?? "Free Math Camp";
  return new ImageResponse(
    (
      <OgFrame logo={logo} footer="Free lesson · interactive visuals · adaptive practice">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {ref && (
            <div style={{ display: "flex", fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: "#a99cff" }}>
              {ref.course.title} · {ref.unit.title}
            </div>
          )}
          <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: title.length > 28 ? 80 : 100, lineHeight: 1.02, letterSpacing: -1.5 }}>{title}</div>
          {ref && <div style={{ display: "flex", fontSize: 32, color: "#cfcbe6", maxWidth: 1000 }}>{plainText(ref.exercise.summary).replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/≠/g, "!=")}</div>}
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts: await ogFonts(), headers: IMAGE_HEADERS },
  );
}
