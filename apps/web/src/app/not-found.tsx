import { ButtonLink } from "@/components/app/button-link";
import { SiteHeader } from "@/components/app/site-header";
import { Tex } from "@/components/math/tex";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <Tex tex="\lim_{x \to 404} \text{page}(x) = \varnothing" display className="text-2xl" />
        <h1 className="font-display text-4xl">This page doesn&apos;t exist</h1>
        <ButtonLink href="/">Back home</ButtonLink>
      </div>
    </>
  );
}
