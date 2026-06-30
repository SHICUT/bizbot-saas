import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Knowledge API — Generic Section-Based Architecture
 *
 * STORAGE MODEL:
 *   knowledge_sections table:
 *     - business_id (UUID)
 *     - section_key (TEXT) — e.g. "admissions", "transport", "services", "plans"
 *     - items (JSONB) — array of structured items
 *
 * This single table supports ALL business types (School, Gym, Clinic, etc.)
 * without schema changes. Adding a new business type = adding UI config only.
 *
 * FALLBACK CHAIN (for backward compatibility):
 *   1. knowledge_sections table (new, preferred)
 *   2. business_services / business_plans / business_faqs (legacy tables)
 *   3. businesses.knowledge_json (JSONB column fallback)
 *   4. businesses.business_context (text fallback)
 */

// ─── GET: Load all knowledge sections for a business ─────────────────────────

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business, error: bizErr } = await admin
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (bizErr || !business) {
    const { data: minBiz } = await admin.from("businesses")
      .select("id, name, type, phone, email, address, city, state, business_hours, business_context")
      .eq("owner_id", user.id).single();
    if (!minBiz) {
      return NextResponse.json({ error: "No business found", business: null }, { status: 404 });
    }
    return NextResponse.json({
      business: buildBusinessResponse(minBiz),
      sections: {},
    });
  }

  // Try loading from knowledge_sections table (new architecture)
  const sections = await loadSections(admin, business.id);

  // If no sections found, try legacy tables
  if (Object.keys(sections).length === 0) {
    const legacySections = await loadLegacySections(admin, business);
    return NextResponse.json({
      business: buildBusinessResponse(business),
      sections: legacySections,
    });
  }

  return NextResponse.json({
    business: buildBusinessResponse(business),
    sections,
  });
}

// ─── POST: Save a knowledge section ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business, error: bizErr } = await admin
    .from("businesses")
    .select("id, knowledge_json")
    .eq("owner_id", user.id)
    .single();

  if (bizErr || !business) {
    return NextResponse.json({ error: "Unable to save. Please refresh and try again." }, { status: 404 });
  }

  const body = await request.json();
  const { section, data } = body;

  console.log("[Knowledge POST] section:", section, "| biz:", business.id.substring(0, 8));

  // Handle profile/hours separately (they go to the businesses table directly)
  if (section === "profile") {
    await saveProfileFields(admin, business.id, data);
  } else if (section === "hours") {
    const { error } = await admin.from("businesses").update({ business_hours: data }).eq("id", business.id);
    if (error) return NextResponse.json({ error: "Failed to save hours: " + error.message }, { status: 500 });
  } else if (section === "notes") {
    // Save notes as a section too
    await saveSection(admin, business.id, "notes", [{ content: String(data || "") }]);
  } else {
    // All other sections use the generic storage
    const items = Array.isArray(data) ? data.filter((item: Record<string, unknown>) => {
      // Keep items that have at least a name or question
      return (item.name && String(item.name).trim()) || (item.question && String(item.question).trim());
    }) : [];
    await saveSection(admin, business.id, section, items);
  }

  // Rebuild AI context
  try {
    await rebuildBusinessContext(admin, business.id);
  } catch (e) {
    console.warn("[Knowledge POST] Context rebuild failed (non-fatal):", e);
  }

  return NextResponse.json({ success: true });
}

// ─── Generic Section Storage ─────────────────────────────────────────────────

/**
 * Save items for a section. Uses knowledge_sections table with JSONB fallback.
 */
async function saveSection(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  sectionKey: string,
  items: unknown[]
): Promise<void> {
  // Try the knowledge_sections table first (new architecture)
  try {
    const { error } = await admin.from("knowledge_sections").upsert(
      {
        business_id: businessId,
        section_key: sectionKey,
        items: JSON.stringify(items),
      },
      { onConflict: "business_id,section_key" }
    );

    if (!error) return; // Success

    // If table doesn't exist or column mismatch, fall through to legacy
    console.warn(`[Knowledge] knowledge_sections upsert failed: ${error.message} — using fallback`);
  } catch {
    // Table doesn't exist yet
  }

  // Fallback: legacy tables
  await saveSectionLegacy(admin, businessId, sectionKey, items);
}

/**
 * Load all sections for a business from knowledge_sections table.
 */
async function loadSections(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string
): Promise<Record<string, unknown[]>> {
  try {
    const { data, error } = await admin
      .from("knowledge_sections")
      .select("section_key, items")
      .eq("business_id", businessId);

    if (error || !data) return {};

    const sections: Record<string, unknown[]> = {};
    for (const row of data) {
      const items = typeof row.items === "string" ? JSON.parse(row.items) : row.items;
      sections[row.section_key] = Array.isArray(items) ? items : [];
    }
    return sections;
  } catch {
    return {};
  }
}

// ─── Legacy Support ──────────────────────────────────────────────────────────

/**
 * Load sections from legacy storage (businesses table JSONB fields)
 * Used when knowledge_sections table has no data yet.
 */
async function loadLegacySections(
  admin: ReturnType<typeof createAdminClient>,
  business: Record<string, unknown>
): Promise<Record<string, unknown[]>> {
  const sections: Record<string, unknown[]> = {};

  // Try knowledge_json column first
  const kj = business.knowledge_json as Record<string, unknown> | null;
  if (kj) {
    for (const [key, value] of Object.entries(kj)) {
      if (Array.isArray(value) && value.length > 0) sections[key] = value;
    }
    if (Object.keys(sections).length > 0) return sections;
  }

  // Try parsing business_context as JSON (some businesses store structured data here)
  const ctx = business.business_context as string | null;
  if (ctx) {
    try {
      if (ctx.startsWith("{")) {
        const parsed = JSON.parse(ctx);
        for (const [key, value] of Object.entries(parsed)) {
          if (Array.isArray(value) && value.length > 0) sections[key] = value;
        }
      }
    } catch { /* not JSON — it's plain text AI context, ignore */ }
  }

  return sections;
}

/**
 * Save to legacy storage when knowledge_sections table isn't available.
 * Uses the businesses.knowledge_json JSONB column.
 */
async function saveSectionLegacy(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  sectionKey: string,
  items: unknown[]
): Promise<void> {
  // Store in knowledge_json column on the businesses table
  const { data: biz } = await admin.from("businesses").select("knowledge_json").eq("id", businessId).single();
  const existing = (biz?.knowledge_json as Record<string, unknown>) || {};
  const updated = { ...existing, [sectionKey]: items };

  const { error } = await admin.from("businesses").update({ knowledge_json: updated }).eq("id", businessId);

  if (error) {
    // knowledge_json column doesn't exist — use business_context as JSON
    console.warn(`[Knowledge] knowledge_json save failed: ${error.message} — using business_context`);
    const { data: ctxBiz } = await admin.from("businesses").select("business_context").eq("id", businessId).single();
    let contextJson: Record<string, unknown> = {};
    try {
      if (ctxBiz?.business_context?.startsWith("{")) contextJson = JSON.parse(ctxBiz.business_context);
    } catch { /* not JSON */ }

    contextJson[sectionKey] = items;
    await admin.from("businesses").update({ business_context: JSON.stringify(contextJson) }).eq("id", businessId);
  }
}

// ─── Profile Save ────────────────────────────────────────────────────────────

async function saveProfileFields(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  data: Record<string, unknown>
) {
  const safe: Record<string, unknown> = {};
  if (data.name !== undefined) safe.name = String(data.name || "").trim() || null;
  if (data.type !== undefined) safe.type = data.type || "other";
  if (data.phone !== undefined) safe.phone = String(data.phone || "").trim() || null;
  if (data.address !== undefined) safe.address = String(data.address || "").trim() || null;
  if (data.city !== undefined) safe.city = String(data.city || "").trim() || null;
  if (data.state !== undefined) safe.state = String(data.state || "").trim() || null;

  const extended: Record<string, unknown> = {};
  if (data.owner_name !== undefined) extended.owner_name = String(data.owner_name || "").trim() || null;
  if (data.whatsapp_number !== undefined) extended.whatsapp_number = String(data.whatsapp_number || "").trim() || null;
  if (data.website !== undefined) extended.website = String(data.website || "").trim() || null;
  if (data.google_maps_link !== undefined) extended.google_maps_link = String(data.google_maps_link || "").trim() || null;
  if (data.description !== undefined) extended.description = String(data.description || "").trim() || null;
  if (data.email !== undefined) {
    const emailVal = String(data.email || "").trim() || null;
    extended.contact_email = emailVal;
    safe.email = emailVal;
  }

  const { error } = await admin.from("businesses").update({ ...safe, ...extended }).eq("id", businessId);
  if (error) {
    const { error: safeErr } = await admin.from("businesses").update(safe).eq("id", businessId);
    if (safeErr) throw new Error("Failed to save profile: " + safeErr.message);
  }
}

// ─── Business Response Builder ───────────────────────────────────────────────

function buildBusinessResponse(business: Record<string, unknown>) {
  return {
    name: business.name || "",
    owner_name: business.owner_name || "",
    type: business.type || "other",
    description: business.description || "",
    phone: business.phone || "",
    whatsapp_number: business.whatsapp_number || "",
    email: business.contact_email || business.email || "",
    website: business.website || "",
    address: business.address || "",
    city: business.city || "",
    state: business.state || "",
    google_maps_link: business.google_maps_link || "",
    business_hours: business.business_hours || null,
  };
}

// ─── Context Rebuild ─────────────────────────────────────────────────────────

async function rebuildBusinessContext(admin: ReturnType<typeof createAdminClient>, businessId: string) {
  const { data: biz } = await admin.from("businesses").select("*").eq("id", businessId).single();
  if (!biz) return;

  // Load all sections (tries new table first, falls back to legacy)
  let sections = await loadSections(admin, businessId);
  if (Object.keys(sections).length === 0) {
    sections = await loadLegacySections(admin, biz);
  }

  const lines: string[] = [];

  lines.push(`Business: ${biz.name || "Unknown"}`);
  if (biz.owner_name) lines.push(`Owner: ${biz.owner_name}`);
  if (biz.type && biz.type !== "other") lines.push(`Type: ${biz.type}`);
  if (biz.description) lines.push(`About: ${biz.description}`);
  lines.push("");

  // Contact
  const email = biz.contact_email || biz.email;
  if (biz.phone || biz.whatsapp_number || email || biz.website) {
    lines.push("Contact:");
    if (biz.phone) lines.push(`- Phone: ${biz.phone}`);
    if (biz.whatsapp_number) lines.push(`- WhatsApp: ${biz.whatsapp_number}`);
    if (email) lines.push(`- Email: ${email}`);
    if (biz.website) lines.push(`- Website: ${biz.website}`);
    lines.push("");
  }

  // Location
  if (biz.address || biz.city) {
    lines.push("Location:");
    if (biz.address) lines.push(`- Address: ${biz.address}`);
    if (biz.city) lines.push(`- City: ${biz.city}${biz.state ? ", " + biz.state : ""}`);
    if (biz.google_maps_link) lines.push(`- Google Maps: ${biz.google_maps_link}`);
    lines.push("");
  }

  // Hours
  if (biz.business_hours) {
    lines.push("Hours:");
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const h = biz.business_hours as Record<string, { open: string; close: string; closed: boolean }>;
    days.forEach((d, i) => {
      const day = h[d];
      lines.push(`- ${names[i]}: ${day?.closed ? "Closed" : `${day?.open || "09:00"} - ${day?.close || "21:00"}`}`);
    });
    lines.push("");
  }

  // Render each section with a readable label
  const sectionLabels: Record<string, string> = {
    services: "Services",
    plans: "Pricing/Plans",
    trainers: "Team/Faculty",
    facilities: "Facilities",
    admissions: "Admissions",
    documents: "Documents Required",
    transport: "Transport",
    uniform: "Uniform",
    faqs: "FAQs",
    notes: "Additional Notes",
  };

  for (const [key, items] of Object.entries(sections)) {
    if (!items || items.length === 0) continue;
    const label = sectionLabels[key] || key.charAt(0).toUpperCase() + key.slice(1);

    if (key === "faqs") {
      lines.push(`${label}:`);
      for (const item of items as Array<Record<string, unknown>>) {
        if (item.question) {
          lines.push(`Q: ${item.question}`);
          lines.push(`A: ${item.answer || ""}`);
          lines.push("");
        }
      }
    } else if (key === "notes") {
      const noteItem = (items as Array<Record<string, unknown>>)[0];
      if (noteItem?.content) {
        lines.push(`Additional Notes: ${noteItem.content}`);
        lines.push("");
      }
    } else if (key === "plans") {
      lines.push(`${label}:`);
      for (const item of items as Array<Record<string, unknown>>) {
        let line = `- ${item.name}`;
        if (item.price) line += `: ${item.price}`;
        if (item.duration) line += `/${item.duration}`;
        const feats = item.features as string[] | undefined;
        if (feats?.length) line += ` (${feats.join(", ")})`;
        if (item.is_popular) line += " ⭐";
        lines.push(line);
      }
      lines.push("");
    } else {
      lines.push(`${label}:`);
      for (const item of items as Array<Record<string, unknown>>) {
        let line = `- ${item.name}`;
        if (item.price) line += ` — ${item.price}`;
        if (item.duration) line += ` (${item.duration})`;
        if (item.description) line += ` — ${item.description}`;
        lines.push(line);
      }
      lines.push("");
    }
  }

  lines.push("Note: If information is unavailable, say so honestly. Never make up details.");

  await admin.from("businesses").update({ business_context: lines.join("\n").trim() }).eq("id", businessId);
}
