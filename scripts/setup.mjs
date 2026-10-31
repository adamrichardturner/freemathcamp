#!/usr/bin/env node
/**
 * First-run setup: creates any missing env files from their examples, filling
 * in freshly generated database passwords. Existing files are never touched.
 */
import { randomBytes } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

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

const withPassword = (text) =>
  text.replace(/^POSTGRES_PASSWORD=.*$/m, `POSTGRES_PASSWORD=${secret()}`).replace(/^PROXY_SECRET=.*$/m, `PROXY_SECRET=${secret()}`);

createFrom(".env", ".env.example", withPassword);
createFrom(".env.production", ".env.production.example", withPassword);

const db = readEnv(".env");
createFrom("apps/api/.env", "apps/api/.env.example", (text) =>
  text.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=postgres://${db.POSTGRES_USER}:${db.POSTGRES_PASSWORD}@127.0.0.1:5433/${db.POSTGRES_DB}`),
);

console.log("\nBack up .env and .env.production — they hold your generated secrets.");
