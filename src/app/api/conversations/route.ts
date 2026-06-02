import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/conversations — Unified inbox
 * Query params: channel, status, search
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

    const url = request.nextUrl;
    const channel = url.searchParams.get("channel");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    let query = admin
      .from("conversations")
      .select("id, channel, status, is_ai_active, unread_count, last_message_text, last_message_at, created_at, leads(id, name, phone, email, status, lead_temperature, source, score)")
      .eq("business_id", business.id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(50);

    if (channel && channel !== "all") query = query.eq("channel", channel);
    if (status && status !== "all") query = query.eq("status", status);

    const { data: conversations, error } = await query;

    if (error) {
      console.error("[Conversations GET] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    // Client-side search filter (name/phone)
    let filtered = conversations || [];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((c) => {
        const lead = c.leads as unknown as { name: string | null; phone: string } | null;
        return (lead?.name || "").toLowerCase().includes(s) || (lead?.phone || "").includes(s);
      });
    }

    // Stats
    const allConvs = conversations || [];
    const stats = {
      total: allConvs.length,
      unread: allConvs.filter((c) => (c.unread_count || 0) > 0).length,
      aiActive: allConvs.filter((c) => c.is_ai_active).length,
      whatsapp: allConvs.filter((c) => c.channel === "whatsapp").length,
      instagram: allConvs.filter((c) => c.channel === "instagram").length,
    };

    return NextResponse.json({ conversations: filtered, stats });
  } catch (err) {
    console.error("[Conversations GET] Unexpected:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/**
 * PATCH /api/conversations — Update conversation (assign AI/human, resolve, etc.)
 */
export async function PATCH(request: NextRequest) {
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

    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });

    // Verify ownership
    const { data: conv } = await admin
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("business_id", business.id)
      .single();

    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const allowed = ["is_ai_active", "status", "unread_count"];
    const safe: Record<string, unknown> = {};
    for (const k of allowed) {
      if (updates[k] !== undefined) safe[k] = updates[k];
    }

    if (Object.keys(safe).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    await admin.from("conversations").update(safe).eq("id", id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Conversations PATCH] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
