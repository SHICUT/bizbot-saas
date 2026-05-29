import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/dashboard
 *
 * Returns the authenticated user's dashboard data:
 * - User profile
 * - Business info
 * - Stats (leads count, messages count, etc.)
 * - Recent conversations
 *
 * All data is scoped to the user's business (multi-tenant).
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get business
    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    // Get subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("business_id", business?.id || "")
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get stats
    let leadsCount = 0;
    let messagesCount = 0;
    let conversationsCount = 0;
    let appointmentsCount = 0;

    if (business) {
      const { count: lc } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id);
      leadsCount = lc || 0;

      const { count: mc } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id);
      messagesCount = mc || 0;

      const { count: cc } = await supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("status", "active");
      conversationsCount = cc || 0;

      const { count: ac } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .in("status", ["confirmed", "pending"]);
      appointmentsCount = ac || 0;
    }

    // Get recent conversations
    let recentConversations: unknown[] = [];
    if (business) {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, last_message_text, last_message_at, unread_count, channel, is_ai_active, leads(name, phone)")
        .eq("business_id", business.id)
        .eq("status", "active")
        .order("last_message_at", { ascending: false })
        .limit(5);
      recentConversations = convs || [];
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        phone: user.user_metadata?.phone || null,
      },
      business: business || null,
      subscription: subscription || null,
      stats: {
        leads: leadsCount,
        messages: messagesCount,
        conversations: conversationsCount,
        appointments: appointmentsCount,
        messagesUsed: subscription?.messages_used || 0,
        messageLimit: subscription?.message_limit || 0,
      },
      recentConversations,
    });
  } catch (error) {
    console.error("[Dashboard API] Error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
