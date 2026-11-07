#!/usr/bin/env node
/**
 * Turns raw simulator captures (store/screenshots/raw/<device>/<name>.png) into
 * App Store screenshots: the app in a device frame on the landing page's
 * gradients, under a headline set in the app's display serif.
 *
 *   node store/compose/compose.mjs            # every device
 *   node store/compose/compose.mjs duo        # one device
 *
 * Each shot is an HTML page (template.html) rendered by headless Chrome at the
 * exact size App Store Connect asks for, then flattened to an opaque PNG.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const mobile = resolve(here, "../..");
const raw = join(mobile, "store/screenshots/raw");
const out = join(mobile, "store/screenshots");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * App Store Connect sizes: 6.9" iPhone, 13" iPad, and the iPhone Duo. The Duo
 * slot takes either display's size; the simulator boots folded (and only its
 * window can unfold it), so the set is the cover display, 1398 × 2034.
 */
const devices = {
  iphone: { width: 1320, height: 2868, frame: "phone" },
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
];
/** The same story on every device; the Duo's progress shot is taken in dark mode, so it gets the night sky. */
const shots = {
  iphone: listing,
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

const only = process.argv[2];
const work = mkdtempSync(join(tmpdir(), "fmc-shots-"));
try {
  for (const [device, spec] of Object.entries(devices)) {
    if (only && only !== device) continue;
    mkdirSync(join(out, device), { recursive: true });
    for (const shot of shots[device]) {
      const screen = join(raw, device, `${shot.name.replace(/^\d+-/, "")}.png`);
      if (!existsSync(screen)) {
        console.warn(`skip ${device}/${shot.name}: no ${screen}`);
        continue;
      }
      const html = template
        .replaceAll("{{W}}", String(spec.width))
        .replaceAll("{{H}}", String(spec.height))
        .replace("{{FRAME}}", spec.frame)
        .replace("{{THEME}}", shot.theme)
        .replace("{{TITLE}}", headline(shot.title))
        .replace("{{SUB}}", escape(shot.sub))
        .replace("{{SCREEN}}", pathToFileURL(screen).href)
        .replace("{{SERIF}}", fonts.serif)
        .replace("{{SERIF_ITALIC}}", fonts.serifItalic)
        .replace("{{SANS}}", fonts.sans)
        .replace("{{SANS_MEDIUM}}", fonts.sansMedium)
        .replace("{{SANS_SEMIBOLD}}", fonts.sansSemibold);
      const page = join(work, `${device}-${shot.name}.html`);
      const png = join(work, `${device}-${shot.name}.png`);
      writeFileSync(page, html);
      execFileSync(CHROME, [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--allow-file-access-from-files",
        "--force-device-scale-factor=1",
        "--virtual-time-budget=3000",
        `--window-size=${spec.width},${spec.height}`,
        `--screenshot=${png}`,
        pathToFileURL(page).href,
      ], { stdio: "ignore" });
      // App Store Connect rejects PNGs with an alpha channel: flatten to RGB.
      const dest = join(out, device, `${shot.name}.png`);
      execFileSync("python3", ["-c", "import sys; from PIL import Image; Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2], optimize=True)", png, dest], { cwd: work });
      console.log(`✓ ${device}/${shot.name}.png`);
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
