import { MobileTabBar, SiteHeader } from "@/components/app/site-header";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-6 md:pb-12">{children}</main>
      <MobileTabBar />
    </>
  );
}
