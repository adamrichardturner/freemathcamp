// Rasterises public/logo.svg into the bitmaps the site cannot serve as SVG:
// Apple touch icon, PWA icons, social images, and the favicon Google Search
// indexes. Google does not accept SVG favicons.
// Run with `pnpm --filter @fmc/web icons` after changing the logo.
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const read = (name) => readFileSync(new URL(`../public/${name}`, import.meta.url));
const rounded = read("logo.svg");
// Full-bleed variant for platforms that apply their own circle/rounded mask (and for iOS, which rounds itself).
const square = read("logo-square.svg");
const outputs = [
  ["src/app/apple-icon.png", 180, square],
  ["public/favicon-192.png", 192, square],
  ["public/icon-192.png", 192, rounded],
  ["public/icon-512.png", 512, rounded],
  ["public/icon-maskable-512.png", 512, square],
  ["public/logo-1024.png", 1024, rounded],
  ["public/logo-square-1024.png", 1024, square],
];

const raster = (svg, size) => sharp(svg, { density: 72 * (size / 512) * 2 }).resize(size, size).png({ compressionLevel: 9 });

for (const [path, size, svg] of outputs) {
  await raster(svg, size).toFile(new URL(`../${path}`, import.meta.url).pathname);
  console.log(`✓ ${path} (${size}×${size})`);
}

// 192 is listed first so the directory entry Next (and Google) read is 192×192,
// a multiple of 48 and above the size Google recommends. Smaller sizes are for tabs.
const faviconSizes = [192, 48, 32, 16];
const faviconImages = [];

for (const size of faviconSizes) {
  faviconImages.push({ size, buffer: await raster(square, size).toBuffer() });
}

writeFileSync(new URL("../public/favicon.ico", import.meta.url), toIco(faviconImages));
console.log(`✓ public/favicon.ico (${faviconSizes.join(", ")})`);

function toIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = 6 + 16 * count;
  const directories = [];

  for (const image of images) {
    const directory = Buffer.alloc(16);
    const dimension = image.size >= 256 ? 0 : image.size;
    directory.writeUInt8(dimension, 0);
    directory.writeUInt8(dimension, 1);
    directory.writeUInt16LE(1, 4);
    directory.writeUInt16LE(32, 6);
    directory.writeUInt32LE(image.buffer.length, 8);
    directory.writeUInt32LE(offset, 12);
    offset += image.buffer.length;
    directories.push(directory);
  }

  return Buffer.concat([header, ...directories, ...images.map((image) => image.buffer)]);
}
