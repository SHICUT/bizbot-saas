import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

/**
 * API Key Management — Create and list API keys for website lead integration
 */

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const { data: keys } = await admin.from("api_keys")
    .select("id, key_prefix, name, is_active, last_used_at, requests_today, rate_limit, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: keys || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const name = (body.name as string)?.trim() || "Website";

  // Generate a secure API key: fn_ + 32 random hex chars
  const rawKey = `fn_${crypto.randomBytes(16).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 11); // "fn_xxxxxxxx"

  const { error } = await admin.from("api_keys").insert({
    business_id: business.id,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    name,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return the FULL key only once (it's never stored in plain text)
  return NextResponse.json({ key: rawKey, prefix: keyPrefix, name }, { status: 201 });
}
