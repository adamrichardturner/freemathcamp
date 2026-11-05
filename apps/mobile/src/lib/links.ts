import type { Href } from "expo-router";
import { COURSE_ID } from "./course";

/**
 * Maps a web path, as notifications carry them (e.g. "/courses/foundations/division"),
 * to the matching screen in the app. Anything unknown opens the home tab.
 */
export const appHref = (webPath: string | null | undefined): Href => {
  if (!webPath) return "/";
  const [path] = webPath.split(/[?#]/);
  const lesson = new RegExp(`^/courses/${COURSE_ID}/([a-z0-9-]+)`).exec(path ?? "");
  if (lesson) return { pathname: "/lesson/[id]", params: { id: lesson[1]! } };
  const article = /^\/articles\/([a-z0-9-]+)$/.exec(path ?? "");
  if (article) return { pathname: "/article/[slug]", params: { slug: article[1]! } };
  if (path?.startsWith("/courses")) return "/course";
  if (path?.startsWith("/leagues")) return "/leagues";
  if (path?.startsWith("/progress")) return "/progress";
  if (path?.startsWith("/settings")) return "/settings";
  if (path?.startsWith("/notifications")) return "/notifications";
  return "/";
};
