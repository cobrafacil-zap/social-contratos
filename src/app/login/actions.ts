"use server";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string };

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const next = String(formData.get("next") || "/dashboard");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  try {
    await signIn("credentials", {
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      redirectTo: safeNext,
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "E-mail ou senha incorretos. Após 5 tentativas, aguarde 15 minutos." };
    throw e; // redirect do Next
  }
  return {};
}
