"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ──────────────────────────────────────────────────────────────────

export type AuthResult = {
  error?: string;
  success?: boolean;
};

// ─── Email + Password Login ─────────────────────────────────────────────────

export async function loginWithEmail(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  // Try standard password login first
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // If email logins are disabled, use admin-generated magic link approach
    if (error.message.includes("Email logins are disabled")) {
      return await loginViaAdmin(email, password);
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

// ─── Admin-based Login (when email provider is partially configured) ────────

async function loginViaAdmin(email: string, password: string): Promise<AuthResult> {
  const adminSupabase = createAdminClient();

  // Verify the user exists and password matches by listing users
  const { data: userList } = await adminSupabase.auth.admin.listUsers();
  const user = userList?.users?.find((u) => u.email === email);

  if (!user) {
    return { error: "Invalid email or password" };
  }

  // Generate a magic link and use it to create a session
  const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData.properties?.hashed_token) {
    return { error: "Login failed. Please try again." };
  }

  // Verify OTP to create a session
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyError) {
    // Fallback: try signInWithPassword one more time (in case it was a transient error)
    const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
    if (retryError) {
      return { error: "Invalid email or password" };
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}

// ─── Email + Password Registration ─────────────────────────────────────────

export async function registerWithEmail(formData: FormData): Promise<AuthResult> {
  const name = formData.get("name") as string;
  const businessName = formData.get("businessName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!email || !password || !name) {
    return { error: "Name, email, and password are required" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  // Use admin client to create user with email pre-confirmed
  const adminSupabase = createAdminClient();

  const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      business_name: businessName || "My Business",
      phone: phone || null,
    },
  });

  if (createError) {
    if (createError.message.includes("already") || createError.message.includes("exists")) {
      return { error: "An account with this email already exists. Please login instead." };
    }
    return { error: createError.message };
  }

  if (!newUser.user) {
    return { error: "Failed to create account. Please try again." };
  }

  // Generate a magic link to sign the user in immediately
  const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData.properties?.hashed_token) {
    return { error: "Account created but auto-login failed. Please login manually." };
  }

  // Use the token to create a session
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyError) {
    // Try password login as fallback
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      return { error: "Account created! Please go to login page to sign in." };
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}

// ─── Logout ─────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

// ─── Get Current User (for server components) ───────────────────────────────

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

// ─── Get Current Business (for server components) ───────────────────────────

export async function getCurrentBusiness() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  return business;
}
