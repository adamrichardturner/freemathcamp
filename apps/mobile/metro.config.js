// Metro for the pnpm monorepo. Expo finds the workspace root on its own; the one
// addition lets the app's DOM components reuse the web app's lesson visuals.
const fs = require("node:fs");
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const WEB_SRC = path.resolve(__dirname, "../web/src");
/**
 * Web modules the app swaps for its own: the web's rich-text renderer links
 * concepts to article pages with Next.js links and hover cards, which have no
 * place inside a lesson on the phone.
 */
const WEB_OVERRIDES = {
  "@/components/math/md": path.resolve(__dirname, "src/dom/web/md.tsx"),
};

/**
 * Package "imports" (subpath imports such as "#prehydration/slider/thumb"), which
 * Base UI uses and Metro doesn't resolve: look the name up in the importing
 * package's package.json, preferring the browser build (DOM components run in a web view).
 */
const CONDITIONS = ["browser", "import", "default"];
const pick = (entry) => {
  if (typeof entry === "string") return entry;
  for (const c of CONDITIONS) if (entry && entry[c]) return pick(entry[c]);
  return null;
};
const subpathImport = (origin, name) => {
  for (let dir = path.dirname(origin); dir !== path.dirname(dir); dir = path.dirname(dir)) {
    const file = path.join(dir, "package.json");
    if (!fs.existsSync(file)) continue;
    const target = pick(JSON.parse(fs.readFileSync(file, "utf8")).imports?.[name]);
    if (!target) return null;
    return target.startsWith("./") ? path.join(dir, target) : target;
  }
  return null;
};

/*
 * In DOM components, prefer packages' ES module builds ("module" export condition).
 * @use-gesture (Mafs's dragging) otherwise mixes its ES and CommonJS builds and
 * ends up with two registries, which breaks draggable points.
 */
config.resolver.unstable_conditionsByPlatform = {
  ...config.resolver.unstable_conditionsByPlatform,
  web: [...(config.resolver.unstable_conditionsByPlatform?.web ?? []), "module"],
};

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstream ?? context.resolveRequest;
  if (moduleName.startsWith("#")) {
    const target = subpathImport(context.originModulePath, moduleName);
    if (target) return resolve(context, target, platform);
  }
  // "@fmc/web/…" reaches into the web app's src folder (typed in src/dom/web/modules.d.ts).
  if (moduleName.startsWith("@fmc/web/")) return resolve(context, path.join(WEB_SRC, moduleName.slice("@fmc/web/".length)), platform);
  // Inside apps/web/src, "@/…" means the web app's src folder, not ours.
  if (moduleName.startsWith("@/") && context.originModulePath.startsWith(WEB_SRC)) {
    const target = WEB_OVERRIDES[moduleName] ?? path.join(WEB_SRC, moduleName.slice(2));
    return resolve(context, target, platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
