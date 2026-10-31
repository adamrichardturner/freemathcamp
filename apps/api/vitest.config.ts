import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

/** Integration tests read DATABASE_URL from the environment, falling back to apps/api/.env. */
const loadEnv = (): Record<string, string> => {
  try {
    return Object.fromEntries(
      readFileSync(new URL(".env", import.meta.url), "utf8")
        .split("\n")
        .filter((l) => /^[A-Z_]+=/.test(l))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
    );
  } catch {
    return {};
  }
};

export default defineConfig({
  test: { env: process.env.DATABASE_URL ? {} : loadEnv(), testTimeout: 20_000 },
});
