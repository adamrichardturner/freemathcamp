import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordView } from "@/components/app/password-reset";

// The token travels in the query string; keep it out of indexes and other sites' referrer logs.
export const metadata: Metadata = { title: "Reset password", robots: { index: false }, referrer: "no-referrer" };

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordView />
    </Suspense>
  );
}
