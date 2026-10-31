import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function LearnPage() {
  return <DashboardView />;
}
