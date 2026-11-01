import type { Metadata } from "next";
import { LeaguesView } from "@/components/leagues/leagues-view";

export const metadata: Metadata = { title: "Leagues", robots: { index: false, follow: false } };

export default function LeaguesPage() {
  return <LeaguesView />;
}
