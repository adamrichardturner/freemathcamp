import type { Metadata } from "next";
import { AnalyticsView } from "@/components/progress/analytics-view";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return <AnalyticsView />;
}
