import { categoryById, getExercise } from "@fmc/curriculum";
import { articleBySlug } from "@fmc/curriculum/articles";
import type { Metadata } from "next";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { course, graph } from "./course";
import { absoluteUrl, plainText } from "./site";

/** Shared look for generated share images (1200×630). Rendered at build time by next/og. */
export const OG_SIZE = { width: 1200, height: 630 };

export const SITE_IMAGE_ALT = "FreeMathCamp — all the maths you need before calculus, free";

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
async function fontFile(file: string) {
  "use cache";
  const buf = await readFile(join(process.cwd(), "node_modules/@fontsource", file));
  return new Uint8Array(buf);
}

// A cached Uint8Array can be a view into a larger buffer; hand the renderer exactly its bytes.
const exactBuffer = (u8: Uint8Array) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;

/** Geist (the site's sans, used by the header wordmark) plus Instrument Serif (the landing headline). */
export const ogFonts = async () => [
  { name: "Geist", data: exactBuffer(await fontFile("geist-sans/files/geist-sans-latin-400-normal.woff")), style: "normal" as const, weight: 400 as const },
  { name: "Geist", data: exactBuffer(await fontFile("geist-sans/files/geist-sans-latin-600-normal.woff")), style: "normal" as const, weight: 600 as const },
  { name: "Instrument Serif", data: exactBuffer(await fontFile("instrument-serif/files/instrument-serif-latin-400-normal.woff")), style: "normal" as const, weight: 400 as const },
  { name: "Instrument Serif", data: exactBuffer(await fontFile("instrument-serif/files/instrument-serif-latin-400-italic.woff")), style: "italic" as const, weight: 400 as const },
];

/** The landing page's dark-theme tokens (globals.css `.dark`), converted from OKLCH. */
const C = {
  background: "#0a0b15",
  foreground: "#eff2f9",
  muted: "#989eb2",
  primary: "#9296ff",
  primaryForeground: "#0c0e1c",
  chart4: "#f9667a",
};

/** The header's gradient text treatment (`from-primary to-chart-4`), as on the hero's "before". */
const gradientText = { backgroundImage: `linear-gradient(90deg, ${C.primary}, ${C.chart4})`, backgroundClip: "text", color: "transparent" } as const;

/** The header's LogoMark: rounded gradient tile with the zig-zag line and dot. */
function OgLogoMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: size * 0.375,
        backgroundImage: `linear-gradient(135deg, ${C.primary}, ${C.chart4})`,
        boxShadow: "0 6px 24px rgba(146,150,255,0.30)",
      }}
    >
      <svg width={size * 0.625} height={size * 0.625} viewBox="0 0 24 24" fill="none" stroke={C.primaryForeground} strokeWidth="2.2" strokeLinecap="round">
        <path d="M4 18 L10 6 L14 14 L20 4" />
        <circle cx="20" cy="4" r="2.3" fill={C.primaryForeground} stroke="none" />
      </svg>
    </div>
  );
}

/** The header wordmark: Geist semibold, tight tracking, "Camp" in the primary colour. */
export function OgWordmark({ size, mark }: { size: number; mark?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.5 }}>
      {mark ? <OgLogoMark size={mark} /> : null}
      <div style={{ display: "flex", fontFamily: "Geist", fontWeight: 600, fontSize: size, letterSpacing: `${-0.025 * size}px`, lineHeight: 1, color: C.foreground }}>
        <span>FreeMath</span>
        {/* Satori pads a split text run by ~0.1em; pull "Camp" back so it sits flush, as in the header. */}
        <span style={{ color: C.primary, marginLeft: -0.1 * size }}>Camp</span>
      </div>
    </div>
  );
}

export function OgFrame({ children, footer }: { children: ReactNode; footer: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        color: C.foreground,
        backgroundColor: C.background,
        // The hero's soft primary and teal glows over the dotted grid.
        backgroundImage: [
          "radial-gradient(circle at 14% 0%, rgba(146,150,255,0.30), transparent 48%)",
          "radial-gradient(circle at 96% 40%, rgba(4,197,181,0.16), transparent 42%)",
          "radial-gradient(circle at 70% 110%, rgba(249,102,122,0.14), transparent 45%)",
          "radial-gradient(circle, rgba(255,255,255,0.07) 1.5px, transparent 1.5px)",
        ].join(", "),
        backgroundSize: "100% 100%, 100% 100%, 100% 100%, 28px 28px",
        fontFamily: "Geist",
      }}
    >
      <OgWordmark size={38} mark={60} />
      {children}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: C.muted }}>
        <div style={{ display: "flex" }}>{footer}</div>
        <div style={{ display: "flex", color: C.foreground, fontWeight: 600, letterSpacing: -0.5 }}>freemathcamp.app</div>
      </div>
    </div>
  );
}

export async function siteImage() {
  return new ImageResponse(
    (
      <OgFrame footer={`${graph.refs.length} free lessons · ${course.units.length} units · adaptive practice`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <OgWordmark size={104} />
          <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 64, lineHeight: 1.05, letterSpacing: -1, color: C.foreground }}>
            All the maths you need&nbsp;<span style={{ fontStyle: "italic", ...gradientText }}>before</span>&nbsp;calculus.
          </div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts: await ogFonts(), headers: IMAGE_HEADERS },
  );
}

export async function lessonImage(courseId: string, exerciseId: string) {
  const ref = getExercise(courseId, exerciseId);
  const title = ref?.exercise.title ?? "FreeMathCamp";
  return new ImageResponse(
    (
      <OgFrame footer="Free lesson · interactive visuals · adaptive practice">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {ref && (
            <div style={{ display: "flex", fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: C.primary }}>
              {ref.course.title} · {ref.unit.title}
            </div>
          )}
          <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: title.length > 28 ? 80 : 100, lineHeight: 1.02, letterSpacing: -1.5 }}>{title}</div>
          {ref && <div style={{ display: "flex", fontSize: 32, color: C.muted, maxWidth: 1000 }}>{plainText(ref.exercise.summary).replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/≠/g, "!=")}</div>}
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts: await ogFonts(), headers: IMAGE_HEADERS },
  );
}

export async function articleImage(slug: string) {
  const a = articleBySlug(slug);
  // The share-image font covers Latin-1; titles with superscripts or Greek fall back to the concept's plain name.
  const title = a ? (/[^\u0000-\u00ff\u2013\u2014\u2019]/.test(a.title) ? a.name : a.title) : "FreeMathCamp";
  const category = a ? categoryById(a.category).title : "";
  return new ImageResponse(
    (
      <OgFrame footer="Free maths explainer · visual examples · practice">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {a && <div style={{ display: "flex", fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: C.primary }}>Articles · {category}</div>}
          <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: title.length > 60 ? 64 : title.length > 36 ? 76 : 96, lineHeight: 1.04, letterSpacing: -1.5 }}>{title}</div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts: await ogFonts(), headers: IMAGE_HEADERS },
  );
}
