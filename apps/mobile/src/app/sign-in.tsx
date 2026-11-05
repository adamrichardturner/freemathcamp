import { router } from "expo-router";
import { AuthForm } from "@/components/auth-form";

export default function SignIn() {
  return <AuthForm mode="login" onSwitch={() => router.replace("/sign-up")} />;
}
