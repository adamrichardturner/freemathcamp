// Rasterises public/logo.svg into the PNGs that need a bitmap:
// the Apple touch icon, a PWA icon and square images for social profiles.
// Run with `pnpm --filter @fmc/web icons` after changing the logo.
import { readFileSync } from "node:fs";
import sharp from "sharp";

const read = (name) => readFileSync(new URL(`../public/${name}`, import.meta.url));
const rounded = read("logo.svg");
// Full-bleed variant for platforms that apply their own circle/rounded mask (and for iOS, which rounds itself).
const square = read("logo-square.svg");
const outputs = [
  ["src/app/apple-icon.png", 180, square],
  ["public/icon-192.png", 192, rounded],
  ["public/icon-512.png", 512, rounded],
  ["public/icon-maskable-512.png", 512, square],
  ["public/logo-1024.png", 1024, rounded],
  ["public/logo-square-1024.png", 1024, square],
];

for (const [path, size, svg] of outputs) {
  await sharp(svg, { density: 72 * (size / 512) * 2 }).resize(size, size).png({ compressionLevel: 9 }).toFile(new URL(`../${path}`, import.meta.url).pathname);
  console.log(`✓ ${path} (${size}×${size})`);
}
