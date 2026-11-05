"use dom";

import "./katex.generated.css";
import type { DOMProps } from "expo/dom";
import { screenWidth, useScheme } from "./blocks";
import "./content.css";
import { Md } from "./web/md";

/** A short piece of curriculum rich text with maths in it, such as a summary or a key idea. */
export default function RichText({ md, scheme, size = "base", muted = false }: { md: string; scheme: "light" | "dark"; size?: "sm" | "base" | "lg"; muted?: boolean; dom?: DOMProps }) {
  useScheme(scheme);
  return (
    <div style={screenWidth}>
      <Md md={md} className={[size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-base", muted ? "text-muted-foreground" : ""].join(" ")} />
    </div>
  );
}
