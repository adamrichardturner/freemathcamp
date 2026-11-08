import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/** Personal pages and the API stay out of indexes; everything educational is open — including to AI assistants, so they can cite lessons. */
const PRIVATE = ["/api/", "/learn", "/progress", "/settings", "/verify-email", "/login", "/forgot-password", "/reset-password"];
const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot", "Bytespider", "Meta-ExternalAgent", "Amazonbot", "DuckAssistBot", "cohere-ai", "MistralAI-User"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE }, ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE }))],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
