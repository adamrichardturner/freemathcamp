/**
 * The web app's visual components, reused inside the DOM components. Metro
 * resolves "@fmc/web/…" to apps/web/src (see metro.config.js); they're typed
 * here rather than type-checked with the app, whose "@/" alias means its own src.
 */
declare module "@fmc/web/components/visuals/static-visuals" {
  import type { ComponentType } from "react";
  const visuals: Record<string, ComponentType<any>>;
  export = visuals;
}
declare module "@fmc/web/components/visuals/animated-visuals" {
  import type { ComponentType } from "react";
  const visuals: Record<string, ComponentType<any>>;
  export = visuals;
}
declare module "@fmc/web/components/visuals/interactive-visuals" {
  import type { ComponentType } from "react";
  const visuals: Record<string, ComponentType<any>>;
  export = visuals;
}
declare module "@fmc/web/components/math/tex" {
  import type { ComponentType } from "react";
  export const Tex: ComponentType<{ tex: string; display?: boolean; className?: string }>;
}
