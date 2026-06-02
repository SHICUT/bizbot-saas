import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/conversations/messages?conversationId=xxx
 * Fetch messages for a conversation
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: business } = await admin
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const conversationId = request.nextUrl.searchParams.get("conversationId");
    if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

    // Verify ownership
    const { data: conv } = await admin
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("business_id", business.id)
      .single();

    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: messages, error } = await admin
      .from("messages")
      .select("id, content, direction, message_type, is_ai_generated, status, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("[Messages GET] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    // Mark as read
    await admin
      .from("conversations")
      .update({ unread_count: 0 })
      .eq("id", conversationId);

    return NextResponse.json({ messages: messages || [] });
  } catch (err) {
    console.error("[Messages GET] Unexpected:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
