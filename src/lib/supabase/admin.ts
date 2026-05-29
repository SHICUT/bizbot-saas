import { createClient } from "@supabase/supabase-js";

/**
 * Admin/Service Role client — ONLY for server-side operations that
 * need to bypass Row Level Security.
 *
 * Use cases:
 * - WhatsApp webhook processing (inserting messages for any business)
 * - Razorpay webhook processing (updating subscriptions)
 * - Cron jobs (resetting usage, sending reminders)
 * - Audit logging
 *
 * NEVER expose this client to the browser.
 * NEVER import this file in Client Components.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. This client can only be used server-side."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
