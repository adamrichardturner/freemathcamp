"use client";

import katex from "katex";
import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";

/** Renders TeX with KaTeX. Errors render inline instead of throwing. */
export const Tex = memo(function Tex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  const html = useMemo(() => katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore", trust: false }), [tex, display]);
  return <span className={cn(display && "block", className)} dangerouslySetInnerHTML={{ __html: html }} />;
});
