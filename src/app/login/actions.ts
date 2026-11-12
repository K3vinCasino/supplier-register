"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/auth-paths";
import { loginSchema } from "@/lib/validation";
import type { FormState } from "@/lib/forms";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { message: "Enter your email and password.", values: { email: values.email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Deliberately vague: do not reveal whether the email exists.
    return { message: "Incorrect email or password.", values: { email: values.email } };
  }

  redirect(safeRedirectPath(String(formData.get("next") ?? "")));
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
