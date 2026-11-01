#!/usr/bin/env node
/**
 * First-run setup: creates any missing env files from their examples, filling
 * in freshly generated database passwords and Web Push keys. Existing files are
 * never touched (add push keys to those with scripts/vapid-keys.mjs).
 */
import { randomBytes } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { vapidKeys } from "./vapid-keys.mjs";

const secret = () => randomBytes(30).toString("base64url");

const readEnv = (path) =>
  Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );

const createFrom = (target, example, transform) => {
  if (existsSync(target)) return console.log(`• ${target} exists — leaving it alone`);
  copyFileSync(example, target);
  writeFileSync(target, transform(readFileSync(target, "utf8")));
  chmodSync(target, 0o600); // owner-only: these files hold secrets
  console.log(`✓ created ${target}`);
};

const withVapid = (text, keys = vapidKeys()) =>
  text.replace(/^VAPID_PUBLIC_KEY=.*$/m, `VAPID_PUBLIC_KEY=${keys.publicKey}`).replace(/^VAPID_PRIVATE_KEY=.*$/m, `VAPID_PRIVATE_KEY=${keys.privateKey}`);

const withPassword = (text) =>
  withVapid(text.replace(/^POSTGRES_PASSWORD=.*$/m, `POSTGRES_PASSWORD=${secret()}`).replace(/^PROXY_SECRET=.*$/m, `PROXY_SECRET=${secret()}`));

createFrom(".env", ".env.example", withPassword);
createFrom(".env.production", ".env.production.example", withPassword);

const db = readEnv(".env");
// The locally run API shares the dev compose file's push keys, so subscriptions work with either.
const devVapid = db.VAPID_PUBLIC_KEY && db.VAPID_PRIVATE_KEY ? { publicKey: db.VAPID_PUBLIC_KEY, privateKey: db.VAPID_PRIVATE_KEY } : undefined;
createFrom("apps/api/.env", "apps/api/.env.example", (text) =>
  withVapid(text.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=postgres://${db.POSTGRES_USER}:${db.POSTGRES_PASSWORD}@127.0.0.1:5433/${db.POSTGRES_DB}`), devVapid),
);

console.log("\nBack up .env and .env.production — they hold your generated secrets.");
