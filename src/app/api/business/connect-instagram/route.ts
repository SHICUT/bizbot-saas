import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/business/connect-instagram
 *
 * Connect an Instagram Business account.
 * Requires: Facebook Page ID + Page Access Token (long-lived).
 *
 * The Page must be linked to an Instagram Business/Creator account.
 * Token needs: instagram_manage_messages, pages_messaging permissions.
 *
 * Body: {
 *   page_id: string,
 *   access_token: string,
 *   instagram_account_id?: string
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { page_id, access_token, instagram_account_id } = body;

  if (!page_id || !access_token) {
    return NextResponse.json({ error: "page_id and access_token are required" }, { status: 400 });
  }

  // Verify token by fetching the page's Instagram account
  let igAccountId = instagram_account_id;
  let igUsername = "";

  try {
    // Get Instagram account linked to this Page
    const pageRes = await fetch(
      `https://graph.facebook.com/v21.0/${page_id}?fields=instagram_business_account{id,username,name}&access_token=${access_token}`
    );
    const pageData = await pageRes.json();

    if (!pageRes.ok || !pageData.instagram_business_account) {
      return NextResponse.json({
        error: "No Instagram Business account linked to this Page. Link your Instagram account in Facebook Page settings first.",
        details: pageData.error?.message,
      }, { status: 400 });
    }

    igAccountId = pageData.instagram_business_account.id;
    igUsername = pageData.instagram_business_account.username || "";
  } catch (error) {
    return NextResponse.json({ error: "Failed to verify Instagram connection", details: String(error) }, { status: 500 });
  }

  // Subscribe to webhooks for this page
  try {
    await fetch(
      `https://graph.facebook.com/v21.0/${page_id}/subscribed_apps`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token,
          subscribed_fields: ["messages", "messaging_postbacks"],
        }),
      }
    );
  } catch {
    // Non-fatal — webhook subscription can be done manually
  }

  // Save to database
  const { error: updateError } = await supabase
    .from("businesses")
    .update({
      instagram_account_id: igAccountId,
      instagram_page_id: page_id,
      instagram_access_token: access_token,
      instagram_username: igUsername,
      instagram_connected: true,
      instagram_connected_at: new Date().toISOString(),
    })
    .eq("owner_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    instagram_account_id: igAccountId,
    username: igUsername,
    webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/instagram`,
    instructions: [
      "1. Go to Meta Developer Dashboard → Your App → Instagram → Webhooks",
      "2. Set Callback URL to the webhook_url above",
      "3. Set Verify Token (same as WhatsApp)",
      "4. Subscribe to 'messages' field",
      "5. Send a test DM to your Instagram account",
    ],
  });
}

/**
 * DELETE /api/business/connect-instagram
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(_request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await supabase
    .from("businesses")
    .update({
      instagram_account_id: null,
      instagram_page_id: null,
      instagram_access_token: null,
      instagram_username: null,
      instagram_connected: false,
      instagram_connected_at: null,
    })
    .eq("owner_id", user.id);

  return NextResponse.json({ success: true });
}
