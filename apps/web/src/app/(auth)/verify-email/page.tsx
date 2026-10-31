import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailView } from "@/components/app/verify-email-view";

export const metadata: Metadata = { title: "Confirm email", robots: { index: false } };

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailView />
    </Suspense>
  );
}
