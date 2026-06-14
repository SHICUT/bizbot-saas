import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth/admin-check";

/**
 * Admin Users API
 * GET    - List all users with business info
 * PATCH  - Update user/business (suspend, restore, edit)
 * DELETE - Soft delete or permanent delete
 */

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const admin = createAdminClient();
  const url = request.nextUrl;
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "all";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  // Get all businesses with owner info
  let query = admin
    .from("businesses")
    .select("*, subscriptions(plan, status, messages_used, message_limit, current_period_end)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status === "active") query = query.eq("status", "active").eq("is_active", true);
  else if (status === "suspended") query = query.eq("status", "suspended");
  else if (status === "deleted") query = query.not("deleted_at", "is", null);

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,owner_email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data: businesses, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get auth users for last sign in
  const ownerIds = businesses?.map((b) => b.owner_id).filter(Boolean) || [];
  const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });

  const usersMap = new Map(authUsers?.users?.map((u) => [u.id, u]) || []);

  const users = businesses?.map((b) => {
    const authUser = usersMap.get(b.owner_id);
    const sub = Array.isArray(b.subscriptions) ? b.subscriptions[0] : b.subscriptions;
    return {
      id: b.owner_id,
      business_id: b.id,
      name: b.name,
      email: b.owner_email || authUser?.email || b.email,
      phone: b.phone,
      business_name: b.name,
      business_type: b.type,
      plan: sub?.plan || b.plan || "trial",
      subscription_status: sub?.status || "none",
      messages_used: sub?.messages_used || 0,
      message_limit: sub?.message_limit || 0,
      whatsapp_connected: b.whatsapp_connected || false,
      whatsapp_phone_number: b.whatsapp_phone_number || null,
      whatsapp_phone_number_id: b.whatsapp_phone_number_id || null,
      whatsapp_verified_name: b.whatsapp_verified_name || null,
      is_active: b.is_active,
      status: b.status || "active",
      deleted_at: b.deleted_at,
      created_at: b.created_at,
      last_sign_in: authUser?.last_sign_in_at || null,
      onboarding_completed: b.onboarding_completed,
    };
  }) || [];

  return NextResponse.json({ users, total: count || 0, page, limit });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const admin = createAdminClient();
  const body = await request.json();
  const { action, business_id, user_id } = body;

  if (!action || !business_id) {
    return NextResponse.json({ error: "action and business_id required" }, { status: 400 });
  }

  // Audit log
  await admin.from("audit_logs").insert({
    admin_id: user.id,
    business_id,
    target_user_id: user_id || null,
    action: `admin_${action}`,
    metadata: body,
    severity: action.includes("delete") ? "critical" : "info",
  });

  switch (action) {
    case "suspend": {
      await admin.from("businesses").update({ status: "suspended", is_active: false }).eq("id", business_id);
      return NextResponse.json({ success: true, message: "Business suspended" });
    }
    case "reactivate": {
      await admin.from("businesses").update({ status: "active", is_active: true, deleted_at: null, deleted_by: null }).eq("id", business_id);
      return NextResponse.json({ success: true, message: "Business reactivated" });
    }
    case "soft_delete": {
      await admin.from("businesses").update({ status: "deleted", is_active: false, deleted_at: new Date().toISOString(), deleted_by: user.id }).eq("id", business_id);
      return NextResponse.json({ success: true, message: "Business soft-deleted (recoverable)" });
    }
    case "restore": {
      await admin.from("businesses").update({ status: "active", is_active: true, deleted_at: null, deleted_by: null }).eq("id", business_id);
      return NextResponse.json({ success: true, message: "Business restored" });
    }
    case "disconnect_whatsapp": {
      await admin.from("businesses").update({ whatsapp_phone_number_id: null, whatsapp_phone_number: null, whatsapp_verified_name: null, whatsapp_access_token: null, whatsapp_connected: false, whatsapp_connected_at: null }).eq("id", business_id);
      return NextResponse.json({ success: true, message: "WhatsApp disconnected" });
    }
    case "update_plan": {
      const { plan } = body;
      if (!plan) return NextResponse.json({ error: "plan required" }, { status: 400 });
      const limits: Record<string, number> = { trial: 100, starter: 1000, growth: 5000, business: 20000 };
      await admin.from("subscriptions").update({ plan, message_limit: limits[plan] || 1000, status: "active" }).eq("business_id", business_id);
      await admin.from("businesses").update({ plan }).eq("id", business_id);
      return NextResponse.json({ success: true, message: `Plan updated to ${plan}` });
    }
    case "reset_usage": {
      await admin.from("subscriptions").update({ messages_used: 0 }).eq("business_id", business_id);
      return NextResponse.json({ success: true, message: "Usage reset to 0" });
    }
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const admin = createAdminClient();
  const url = new URL(request.url);
  const businessId = url.searchParams.get("business_id");
  const confirm = url.searchParams.get("confirm");

  if (!businessId) return NextResponse.json({ error: "business_id required" }, { status: 400 });
  if (confirm !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm permanent deletion" }, { status: 400 });

  // Get business info for audit
  const { data: biz } = await admin.from("businesses").select("id, name, owner_id, owner_email").eq("id", businessId).single();
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // Audit log (critical)
  await admin.from("audit_logs").insert({
    admin_id: user.id,
    business_id: businessId,
    action: "permanent_delete",
    metadata: { business_name: biz.name, owner_email: biz.owner_email },
    severity: "critical",
  });

  // Delete cascade: leads, conversations, messages, appointments, subscriptions
  await admin.from("messages").delete().eq("business_id", businessId);
  await admin.from("conversations").delete().eq("business_id", businessId);
  await admin.from("leads").delete().eq("business_id", businessId);
  await admin.from("appointments").delete().eq("business_id", businessId);
  await admin.from("subscriptions").delete().eq("business_id", businessId);
  await admin.from("payments").delete().eq("business_id", businessId);
  await admin.from("businesses").delete().eq("id", businessId);

  // Optionally delete auth user
  if (biz.owner_id) {
    await admin.auth.admin.deleteUser(biz.owner_id);
  }

  return NextResponse.json({ success: true, message: `Permanently deleted business "${biz.name}" and all related data` });
}
