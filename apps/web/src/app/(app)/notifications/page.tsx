import type { Metadata } from "next";
import { NotificationsPageView } from "@/components/notifications/notifications-page";

export const metadata: Metadata = { title: "Notifications", robots: { index: false, follow: false } };

export default function NotificationsPage() {
  return <NotificationsPageView />;
}
