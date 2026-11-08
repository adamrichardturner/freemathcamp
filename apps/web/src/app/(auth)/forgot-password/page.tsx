import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/app/password-reset";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: true } };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
