"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthResult = { error?: string; success?: boolean };

// ─── Signup (sends verification email) ──────────────────────────────────────

export async function registerWithEmail(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const businessName = formData.get("businessName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!email || !password || !name) return { error: "Name, email, and password are required" };
  if (password.length < 6) return { error: "Password must be at least 6 characters" };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, business_name: businessName || "My Business", phone: phone || null },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
    },
  });

  if (error) {
    if (error.message.includes("already registered")) return { error: "An account with this email already exists." };
    return { error: error.message };
  }

  redirect("/verify-email?email=" + encodeURIComponent(email));
}

// ─── Login ──────────────────────────────────────────────────────────────────

export async function loginWithEmail(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Email and password are required" };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes("Email not confirmed")) {
      return { error: "EMAIL_NOT_VERIFIED" };
    }
    if (error.message.includes("Invalid login")) return { error: "Invalid email or password" };
    return { error: error.message };
  }

  // Check email verification
  if (data.user && !data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    return { error: "EMAIL_NOT_VERIFIED" };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

// ─── Forgot Password ────────────────────────────────────────────────────────

export async function forgotPassword(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  if (!email) return { error: "Email is required" };

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Reset Password ─────────────────────────────────────────────────────────

export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 6) return { error: "Password must be at least 6 characters" };
  if (password !== confirmPassword) return { error: "Passwords do not match" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/login?reset=success");
}

// ─── Resend Verification Email ──────────────────────────────────────────────

export async function resendVerificationEmail(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  if (!email) return { error: "Email is required" };

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback` },
  });

  if (error) return { error: error.message };
  return { success: true };
}

// ─── Logout ─────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
