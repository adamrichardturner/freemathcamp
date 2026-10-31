import { getGraph, type Block } from "@fmc/curriculum";
import { FAQS } from "./faq";
import { absoluteUrl, allCourses, lessonPath, plainText, SITE } from "./site";

/**
 * llms.txt (https://llmstxt.org): a plain-markdown map of the site for AI
 * assistants and answer engines, generated from the curriculum so it never drifts.
 */
const header = () => {
  const lessons = allCourses.reduce((a, c) => a + c.units.reduce((b, u) => b + u.exercises.length, 0), 0);
  return [
    `# ${SITE.alternateName} (${SITE.name})`,
    "",
    `> ${SITE.description}`,
    "",
    `${SITE.alternateName} is free with no ads or paywall. It has ${lessons} lessons; each has an explanation with worked examples and interactive visuals, links to the earlier lessons it builds on (advisory, never locked), and unlimited generated practice problems. An adaptive engine adjusts difficulty, measures struggle from wrong attempts, hints and time, tracks mastery with Bayesian knowledge tracing, and schedules spaced reviews.`,
    "",
  ];
};

export const llmsTxt = () => {
  const lines = header();
  for (const course of allCourses) {
    lines.push(`## Course: ${course.title}`, "", `- [${course.title}](${absoluteUrl(`/courses/${course.id}`)}): ${plainText(course.description)}`, "");
    const graph = getGraph(course.id)!;
    course.units.forEach((unit, i) => {
      lines.push(`### Unit ${i + 1}: ${unit.title}`, "", plainText(unit.description), "");
      for (const e of unit.exercises) lines.push(`- [${e.title}](${absoluteUrl(lessonPath(graph.byId.get(e.id)!))}): ${plainText(e.summary)}`);
      lines.push("");
    });
  }
  lines.push("## FAQ", "");
  for (const f of FAQS) lines.push(`- **${f.q}** ${f.a}`);
  lines.push("", "## Optional", "", `- [Full lesson text](${absoluteUrl("/llms-full.txt")}): every lesson's explanation, key ideas and prerequisites`, `- [Sitemap](${absoluteUrl("/sitemap.xml")})`, "");
  return lines.join("\n");
};

const blockText = (b: Block): string[] => {
  switch (b.kind) {
    case "text":
      return [plainText(b.md)];
    case "math":
      return [`  ${plainText(`$${b.tex}$`)}${b.caption ? ` — ${plainText(b.caption)}` : ""}`];
    case "rule":
      return [`**${b.name}:** ${plainText(`$${b.tex}$`)}${b.md ? ` — ${plainText(b.md)}` : ""}`];
    case "callout":
      return [`> ${b.title ? `${b.title}: ` : ""}${plainText(b.md)}`];
    case "example":
      return [`Worked example: ${plainText(b.problem)}`, ...b.steps.map((s, i) => `  ${i + 1}. ${[s.md && plainText(s.md), s.tex && plainText(`$${s.tex}$`)].filter(Boolean).join(" ")}`)];
    case "visual":
      return b.caption ? [`(Interactive visual) ${plainText(b.caption)}`] : [];
  }
};

export const llmsFullTxt = () => {
  const lines = header();
  for (const course of allCourses) {
    const graph = getGraph(course.id)!;
    lines.push(`## ${course.title}`, "");
    for (const ref of graph.refs) {
      const e = ref.exercise;
      lines.push(`### ${e.title} (${ref.unit.title})`, "", `URL: ${absoluteUrl(lessonPath(ref))}`, `Summary: ${plainText(e.summary)}`);
      if (e.prerequisites.length) lines.push(`Builds on: ${e.prerequisites.map((p) => graph.byId.get(p)?.exercise.title ?? p).join(", ")}`);
      lines.push(`Key ideas: ${e.keyIdeas.map(plainText).join(" ")}`, "", ...e.lesson.flatMap(blockText), "");
    }
  }
  return lines.join("\n");
};
