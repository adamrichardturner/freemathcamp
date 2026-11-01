#!/usr/bin/env node
/**
 * Generates a Web Push (VAPID) key pair and adds it to env files that don't
 * have one yet. The private key is written to the files, never printed.
 *
 *   node scripts/vapid-keys.mjs .env apps/api/.env .env.production
 *
 * Keep one key pair per environment: rotating it invalidates every browser
 * subscription, and learners would have to turn push on again.
 */
import { generateKeyPairSync } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

export const vapidKeys = () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pub = publicKey.export({ format: "jwk" });
  const priv = privateKey.export({ format: "jwk" });
  // Browsers want the raw uncompressed point (0x04 || x || y); the private key is the raw scalar.
  const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, "base64url"), Buffer.from(pub.y, "base64url")]);
  return { publicKey: raw.toString("base64url"), privateKey: priv.d };
};

export const addVapidKeys = (file, keys = vapidKeys()) => {
  if (!existsSync(file)) return console.log(`• ${file} doesn't exist — skipped`);
  const text = readFileSync(file, "utf8");
  if (/^VAPID_PRIVATE_KEY=.+$/m.test(text)) return console.log(`• ${file} already has VAPID keys — leaving them alone`);
  const cleaned = text.replace(/^VAPID_(PUBLIC|PRIVATE)_KEY=\s*$/gm, "");
  appendFileSync(file, `${cleaned.endsWith("\n") ? "" : "\n"}VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\n`);
  console.log(`✓ added VAPID keys to ${file}`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = process.argv.slice(2);
  if (!files.length) console.log("Usage: node scripts/vapid-keys.mjs <env file>…");
  // Files for the same environment share one pair (the API and its compose file).
  const keys = vapidKeys();
  files.forEach((f) => addVapidKeys(f, keys));
}
