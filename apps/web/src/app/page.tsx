import type { Metadata } from "next";
import { SiteHeader } from "@/components/app/site-header";
import { Landing } from "@/components/landing/landing";
import { JsonLd } from "@/components/seo/json-ld";
import { course } from "@/lib/course";
import { FAQS } from "@/lib/faq";
import { courseSchema, faqSchema, graph, organization, website } from "@/lib/structured-data";

// Canonical is set per page (never in the root layout, where every page would inherit "/").
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
      <JsonLd data={graph(organization, website, courseSchema(course), faqSchema(FAQS))} />
      <SiteHeader />
      <main className="flex-1">
        <Landing />
      </main>
    </>
  );
}
