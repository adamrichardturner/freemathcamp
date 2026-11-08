#!/usr/bin/env node
/**
 * Turns raw simulator captures (store/screenshots/raw/<device>/<name>.png) into
 * App Store screenshots: the app in a device frame on the landing page's
 * gradients, under a headline set in the app's display serif, with generated
 * artwork (art.mjs) behind the headline and floating across the device.
 *
 *   node store/compose/compose.mjs            # every device
 *   node store/compose/compose.mjs duo        # one device
 *   node store/compose/compose.mjs creatives  # the Header and Search Results assets
 *
 * Each shot is an HTML page (template.html) rendered by headless Chrome at the
 * exact size App Store Connect asks for, then flattened to an opaque PNG.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { backdrop, cards, creativeCards, field } from "./art.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const mobile = resolve(here, "../..");
const raw = join(mobile, "store/screenshots/raw");
const out = join(mobile, "store/screenshots");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * App Store Connect sizes: 6.9" iPhone, 6.3" iPhone (the 6.1"/6.3" slot, drawn
 * from the same 6.9" captures since the design is sized in vw), 13" iPad, and
 * the iPhone Duo. The Duo
 * slot takes either display's size; the simulator boots folded (and only its
 * window can unfold it), so the set is the cover display, 1398 × 2034.
 */
const devices = {
  iphone: { width: 1320, height: 2868, frame: "phone" },
  "iphone-6.3": { width: 1206, height: 2622, frame: "phone", raw: "iphone" },
  ipad: { width: 2064, height: 2752, frame: "tablet" },
  duo: { width: 1398, height: 2034, frame: "duo" },
};

/**
 * The listing, in order. `title` takes *one* italic accent word, as the site's
 * hero does; `theme` picks the background (indigo, aurora or night).
 */
const listing = [
  { name: "01-learn", title: "Your plan for *today*, every day", sub: "Reviews, repairs and new ideas, mixed for you", theme: "indigo" },
  { name: "02-lesson", title: "Lessons that *show* the idea", sub: "Interactive visuals and worked examples", theme: "aurora" },
  { name: "03-practice", title: "Practice that *adapts* to you", sub: "Harder as you improve, gentler when you're stuck", theme: "indigo" },
  { name: "04-progress", title: "Watch mastery *grow*", sub: "Streaks, daily goals and every lesson's progress", theme: "aurora" },
  { name: "05-leagues", title: "Friendly *weekly* leagues", sub: "Earn XP for every problem you solve", theme: "night" },
  { name: "06-course", title: "Place value to your first *limits*", sub: "95 connected lessons, free and ad-free", theme: "indigo" },
  { name: "07-welcome", title: "Your path, *your* way", sub: "Unlock lessons in order, or explore them all", theme: "aurora" },
];
/** The same story on every device; the Duo's progress shot is taken in dark mode, so it gets the night sky. */
const shots = {
  iphone: listing,
  "iphone-6.3": listing,
  ipad: listing,
  duo: listing.map((s) => (s.name === "04-progress" ? { ...s, theme: "night" } : s.name === "05-leagues" ? { ...s, theme: "aurora" } : s)),
};

const font = (p) => pathToFileURL(join(mobile, "node_modules/@expo-google-fonts", p)).href;
const fonts = {
  serif: font("instrument-serif/400Regular/InstrumentSerif_400Regular.ttf"),
  serifItalic: font("instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf"),
  sans: font("geist/400Regular/Geist_400Regular.ttf"),
  sansMedium: font("geist/500Medium/Geist_500Medium.ttf"),
  sansSemibold: font("geist/600SemiBold/Geist_600SemiBold.ttf"),
};
const template = readFileSync(join(here, "template.html"), "utf8");
const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const headline = (t) => escape(t).replace(/\*(.+?)\*/g, "<em>$1</em>");

const fill = (html, w, h) =>
  html
    .replaceAll("{{W}}", String(w))
    .replaceAll("{{H}}", String(h))
    .replace("{{ART_CSS}}", pathToFileURL(join(here, "art.css")).href)
    .replace("{{SERIF}}", fonts.serif)
    .replace("{{SERIF_ITALIC}}", fonts.serifItalic)
    .replace("{{SANS}}", fonts.sans)
    .replace("{{SANS_MEDIUM}}", fonts.sansMedium)
    .replace("{{SANS_SEMIBOLD}}", fonts.sansSemibold);

/** Renders a page in headless Chrome at w×h and saves it as an opaque PNG. */
const render = (html, w, h, dest, work) => {
  const page = join(work, "page.html");
  const png = join(work, "page.png");
  writeFileSync(page, html);
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    "--force-device-scale-factor=1",
    "--virtual-time-budget=3000",
    `--window-size=${w},${h}`,
    `--screenshot=${png}`,
    pathToFileURL(page).href,
  ], { stdio: "ignore" });
  // App Store Connect rejects images with an alpha channel: flatten to RGB.
  execFileSync("python3", ["-c", "import sys; from PIL import Image; Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2], optimize=True)", png, dest], { cwd: work });
};

/**
 * The product page's creative assets (Product Page Information › Header and
 * Search Results): the header at 21:9, 3840 × 1646, and the search results
 * asset at 3:2, the largest accepted size, 3840 × 2560.
 */
const creatives = {
  header: { width: 3840, height: 1646, clear: [0.24, 0.12, 0.76, 0.9] },
  search: { width: 3840, height: 2560, clear: [0.12, 0.08, 0.9, 0.94], screen: "iphone/lesson.png" },
};
const creative = readFileSync(join(here, "creative.html"), "utf8");
const logo = `<span class="chip"><span class="mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 18 L10 6 L14 14 L20 4" /><circle cx="20" cy="4" r="2.3" fill="currentColor" stroke="none" /></svg></span><span>FreeMath<span class="camp">Camp</span></span></span>`;
const creativeBody = {
  header: () => `${creativeCards.header()}<div class="copy">${logo}<h1>${headline("Maths that *clicks*")}</h1><p>Free, visual lessons from place value to calculus</p></div>`,
  search: (spec) =>
    `<div class="copy">${logo}<h1>${headline("Lessons that *show* the idea")}</h1><p>Interactive visuals, worked examples and practice that adapts to you. Free, with no ads.</p></div>
     <div class="device"><img class="screen" src="${pathToFileURL(join(raw, spec.screen)).href}" alt="" /><div class="island"></div>${creativeCards.search()}</div>`,
};

const only = process.argv[2];
const work = mkdtempSync(join(tmpdir(), "fmc-shots-"));
try {
  for (const [device, spec] of Object.entries(devices)) {
    if (only && only !== device) continue;
    mkdirSync(join(out, device), { recursive: true });
    for (const shot of shots[device]) {
      const screen = join(raw, spec.raw ?? device, `${shot.name.replace(/^\d+-/, "")}.png`);
      if (!existsSync(screen)) {
        console.warn(`skip ${device}/${shot.name}: no ${screen}`);
        continue;
      }
      const html = fill(template, spec.width, spec.height)
        .replace("{{FRAME}}", spec.frame)
        .replace("{{THEME}}", shot.theme)
        .replace("{{TITLE}}", headline(shot.title))
        .replace("{{SUB}}", escape(shot.sub))
        .replace("{{BACKDROP}}", backdrop(shot.name))
        .replace("{{CARDS}}", cards(shot.name))
        .replace("{{SCREEN}}", pathToFileURL(screen).href);
      render(html, spec.width, spec.height, join(out, device, `${shot.name}.png`), work);
      console.log(`✓ ${device}/${shot.name}.png`);
    }
  }
  if (!only || only === "creatives") {
    mkdirSync(join(out, "creatives"), { recursive: true });
    for (const [kind, spec] of Object.entries(creatives)) {
      const html = fill(creative, spec.width, spec.height)
        .replace("{{KIND}}", kind)
        .replace("{{FIELD}}", field(`creative-${kind}`, { clear: spec.clear }))
        .replace("{{BODY}}", creativeBody[kind](spec));
      render(html, spec.width, spec.height, join(out, "creatives", `${kind}.png`), work);
      console.log(`✓ creatives/${kind}.png`);
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
