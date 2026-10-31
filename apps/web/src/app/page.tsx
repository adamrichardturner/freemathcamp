import { SiteHeader } from "@/components/app/site-header";
import { Landing } from "@/components/landing/landing";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Landing />
      </main>
    </>
  );
}
