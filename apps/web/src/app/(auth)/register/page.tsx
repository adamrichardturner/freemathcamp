import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/app/auth-form";
import { graph } from "@/lib/course";

export const metadata: Metadata = {
  title: "Create Your Free Account",
  description: `Join Free Math Camp free: adaptive practice, spaced reviews and progress tracking across ${graph.refs.length} lessons, from arithmetic to your first limits.`,
  alternates: { canonical: "/register" },
};

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
