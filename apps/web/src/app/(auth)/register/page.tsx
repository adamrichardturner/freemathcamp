import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/app/auth-form";

export const metadata: Metadata = {
  title: "Create Your Free Account",
  description: "Join Free Math Camp free: adaptive practice, spaced reviews and progress tracking across 81 lessons, from arithmetic to trigonometry.",
  alternates: { canonical: "/register" },
};

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
