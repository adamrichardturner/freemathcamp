import { router } from "expo-router";
import { AuthForm } from "@/components/auth-form";

export default function SignUp() {
  return <AuthForm mode="register" onSwitch={() => router.replace("/sign-in")} />;
}
