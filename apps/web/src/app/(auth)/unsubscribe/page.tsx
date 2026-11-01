import type { Metadata } from "next";
import { Suspense } from "react";
import { UnsubscribeView } from "@/components/notifications/unsubscribe-view";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeView />
    </Suspense>
  );
}
