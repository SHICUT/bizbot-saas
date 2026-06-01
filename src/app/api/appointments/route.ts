import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/appointments — Fetch all appointments for the business
 * Query params: status, date, month, limit
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

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const url = request.nextUrl;
    const status = url.searchParams.get("status");
    const date = url.searchParams.get("date"); // YYYY-MM-DD
    const month = url.searchParams.get("month"); // YYYY-MM
    const limit = parseInt(url.searchParams.get("limit") || "100");

    let query = admin
      .from("appointments")
      .select("*, leads(name, phone, email, lead_temperature)")
      .eq("business_id", business.id)
      .order("appointment_date", { ascending: true, nullsFirst: false })
      .order("appointment_time", { ascending: true, nullsFirst: false })
      .limit(limit);

    if (status && status !== "all") query = query.eq("status", status);
    if (date) query = query.eq("appointment_date", date);
    if (month) {
      const start = `${month}-01`;
      const endMonth = parseInt(month.split("-")[1]);
      const endYear = parseInt(month.split("-")[0]);
      const lastDay = new Date(endYear, endMonth, 0).getDate();
      const end = `${month}-${String(lastDay).padStart(2, "0")}`;
      query = query.gte("appointment_date", start).lte("appointment_date", end);
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.error("[Appointments GET] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
    }

    // Stats
    const today = new Date().toISOString().split("T")[0];
    const { data: allApts } = await admin
      .from("appointments")
      .select("status, service_price, appointment_date")
      .eq("business_id", business.id);

    const stats = {
      total: allApts?.length || 0,
      today: allApts?.filter((a) => a.appointment_date === today).length || 0,
      confirmed: allApts?.filter((a) => a.status === "confirmed").length || 0,
      pending: allApts?.filter((a) => a.status === "pending").length || 0,
      completed: allApts?.filter((a) => a.status === "completed").length || 0,
      cancelled: allApts?.filter((a) => a.status === "cancelled").length || 0,
      noShow: allApts?.filter((a) => a.status === "no_show").length || 0,
      revenue: allApts?.filter((a) => a.status === "completed").reduce((sum, a) => sum + (a.service_price || 0), 0) || 0,
    };

    return NextResponse.json({ appointments: appointments || [], stats });
  } catch (err) {
    console.error("[Appointments GET] Unexpected:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/**
 * POST /api/appointments — Create a new appointment
 */
export async function POST(request: NextRequest) {
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

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const body = await request.json();
    const { lead_id, customer_name, customer_phone, service, appointment_date, appointment_time, service_price, staff_assigned, notes } = body;

    if (!customer_name || !appointment_date || !appointment_time || !service) {
      return NextResponse.json({ error: "Name, service, date, and time are required" }, { status: 400 });
    }

    const { data: appointment, error } = await admin
      .from("appointments")
      .insert({
        business_id: business.id,
        lead_id: lead_id || null,
        customer_name,
        customer_phone: customer_phone || null,
        service,
        appointment_date,
        appointment_time,
        service_price: service_price || 0,
        staff_assigned: staff_assigned || null,
        notes: notes || null,
        status: "pending",
        source: "manual",
      })
      .select()
      .single();

    if (error) {
      console.error("[Appointments POST] Error:", error.message);
      return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
    }

    // Add timeline event if linked to a lead
    if (lead_id) {
      await admin.from("lead_timeline").insert({
        business_id: business.id,
        lead_id,
        event_type: "appointment_booked",
        description: `Appointment booked: ${service} on ${appointment_date} at ${appointment_time}`,
      });
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    console.error("[Appointments POST] Unexpected:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/**
 * PATCH /api/appointments — Update appointment status or reschedule
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

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Appointment ID required" }, { status: 400 });

    // Verify ownership
    const { data: apt } = await admin
      .from("appointments")
      .select("id, lead_id, status")
      .eq("id", id)
      .eq("business_id", business.id)
      .single();

    if (!apt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    const allowedFields = ["status", "appointment_date", "appointment_time", "service", "service_price", "staff_assigned", "notes"];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }

    // Handle reschedule
    if (updates.appointment_date && updates.appointment_date !== apt.status) {
      safeUpdates.status = "pending"; // Reset to pending on reschedule
    }

    const { error } = await admin
      .from("appointments")
      .update(safeUpdates)
      .eq("id", id);

    if (error) {
      console.error("[Appointments PATCH] Error:", error.message);
      return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
    }

    // Timeline event for status changes
    if (safeUpdates.status && apt.lead_id) {
      const eventType = safeUpdates.status === "completed" ? "appointment_completed" : "status_change";
      await admin.from("lead_timeline").insert({
        business_id: business.id,
        lead_id: apt.lead_id,
        event_type: eventType,
        description: `Appointment ${safeUpdates.status}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Appointments PATCH] Unexpected:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
