import { articleBySlug, articles } from "@fmc/curriculum/articles";
import { notFound } from "next/navigation";
import { articleImage } from "@/lib/og";

// One image per article, rendered at build time, served as /og/articles/<slug>.png.
export const generateStaticParams = () => articles.map((a) => ({ image: `${a.slug}.png` }));

export async function GET(_req: Request, { params }: RouteContext<"/og/articles/[image]">) {
  const { image } = await params;
  const slug = image.replace(/\.png$/, "");
  if (slug === image || !articleBySlug(slug)) notFound();
  return articleImage(slug);
}
