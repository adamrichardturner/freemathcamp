import { defineConfig } from "tsup";

export default defineConfig({
  entry: { main: "src/main.ts", migrate: "src/infrastructure/db/migrate.ts" },
  format: ["esm"],
  target: "node22",
  platform: "node",
  sourcemap: true,
  clean: true,
  // Bundle the workspace curriculum package; keep real npm deps external.
  noExternal: ["@fmc/curriculum"],
});
