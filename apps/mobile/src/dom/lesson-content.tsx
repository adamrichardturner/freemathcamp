"use dom";

import { getExercise } from "@fmc/curriculum";
import { articleBySlug } from "@fmc/curriculum/articles";
import "./katex.generated.css";
import "mafs/core.css";
import type { DOMProps } from "expo/dom";
import { Blocks, screenWidth, useScheme } from "./blocks";
import "./content.css";

/**
 * A lesson's (or an article's) blocks, rendered in a web view so the maths is
 * typeset by KaTeX and the visuals are the web app's own. Curriculum content
 * holds functions (plots), which can't cross the bridge, so the web view looks
 * the content up itself from its id.
 */
export default function LessonContent({ source, scheme }: { source: { kind: "lesson"; courseId: string; exerciseId: string } | { kind: "article"; slug: string }; scheme: "light" | "dark"; dom?: DOMProps }) {
  useScheme(scheme);
  const blocks = source.kind === "lesson" ? getExercise(source.courseId, source.exerciseId)?.exercise.lesson : articleBySlug(source.slug)?.body;
  if (!blocks) return null;
  return (
    <div className="px-4 pt-1 pb-4" style={screenWidth}>
      <Blocks blocks={blocks} />
    </div>
  );
}
