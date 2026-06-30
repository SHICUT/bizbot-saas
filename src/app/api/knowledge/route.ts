import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Knowledge API — Generic Section-Based Architecture
 *
 * STORAGE: knowledge_sections table
 *   - business_id (UUID) — which business owns this
 *   - section_key (TEXT) — "admissions", "transport", "services", "plans", etc.
 *   - items (JSONB) — array of structured items
 *
 * One table supports ALL business types. No schema changes for new types.
 *
 * Profile data (name, type, phone, etc.) stays in the businesses table.
 * Section data (services, plans, trainers, etc.) goes to knowledge_sections.
 */

// ─── GET ─────────────────────────────────────────────────────────────────────

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
    return NextResponse.json({ error: "No business found", business: null }, { status: 404 });
  }

  // Load all sections from knowledge_sections table
  const sections = await loadSections(admin, business.id as string);

  return NextResponse.json({
    business: buildBusinessResponse(business),
    sections,
  });
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business, error: bizErr } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (bizErr || !business) {
    return NextResponse.json({ error: "Unable to save. Please refresh and try again." }, { status: 404 });
  }

  const body = await request.json();
  const { section, data } = body;

  console.log("[Knowledge POST] section:", section, "| biz:", business.id.substring(0, 8));

  // Profile and hours go directly to the businesses table
  if (section === "profile") {
    await saveProfileFields(admin, business.id, data);
  } else if (section === "hours") {
    const { error } = await admin.from("businesses").update({ business_hours: data }).eq("id", business.id);
    if (error) return NextResponse.json({ error: "Failed to save hours: " + error.message }, { status: 500 });
  } else if (section === "notes") {
    await saveSection(admin, business.id, "notes", [{ content: String(data || "") }]);
  } else {
    // All other sections: services, plans, trainers, facilities, admissions, etc.
    const items = Array.isArray(data) ? data.filter((item: Record<string, unknown>) => {
      return (item.name && String(item.name).trim()) || (item.question && String(item.question).trim());
    }) : [];
    await saveSection(admin, business.id, section, items);
  }

  // Rebuild AI context from all sections
  try {
    await rebuildBusinessContext(admin, business.id);
  } catch (e) {
    console.warn("[Knowledge POST] Context rebuild failed (non-fatal):", e);
  }

  return NextResponse.json({ success: true });
}

// ─── Section CRUD ────────────────────────────────────────────────────────────

/**
 * Save items for a section using UPSERT on knowledge_sections.
 * If section exists → update items. If not → insert.
 */
async function saveSection(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  sectionKey: string,
  items: unknown[]
): Promise<void> {
  const { error } = await admin.from("knowledge_sections").upsert(
    {
      business_id: businessId,
      section_key: sectionKey,
      items, // JSONB — Supabase handles array → jsonb natively
    },
    { onConflict: "business_id,section_key" }
  );

  if (error) {
    console.error(`[Knowledge] Failed to save section "${sectionKey}":`, error.message);
    throw new Error(`Failed to save ${sectionKey}: ${error.message}`);
  }
}

/**
 * Load all sections for a business.
 * Returns {section_key: items[]} map.
 */
async function loadSections(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string
): Promise<Record<string, unknown[]>> {
  const { data, error } = await admin
    .from("knowledge_sections")
    .select("section_key, items")
    .eq("business_id", businessId);

  if (error) {
    console.error("[Knowledge] Failed to load sections:", error.message);
    return {};
  }

  if (!data || data.length === 0) return {};

  const sections: Record<string, unknown[]> = {};
  for (const row of data) {
    // items is already a JSONB array from Supabase — no parsing needed
    sections[row.section_key] = Array.isArray(row.items) ? row.items : [];
  }
  return sections;
}

// ─── Profile Save ────────────────────────────────────────────────────────────

async function saveProfileFields(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  data: Record<string, unknown>
) {
  const fields: Record<string, unknown> = {};

  if (data.name !== undefined) fields.name = String(data.name || "").trim() || null;
  if (data.type !== undefined) fields.type = data.type || "other";
  if (data.phone !== undefined) fields.phone = String(data.phone || "").trim() || null;
  if (data.address !== undefined) fields.address = String(data.address || "").trim() || null;
  if (data.city !== undefined) fields.city = String(data.city || "").trim() || null;
  if (data.state !== undefined) fields.state = String(data.state || "").trim() || null;
  if (data.email !== undefined) fields.email = String(data.email || "").trim() || null;
  if (data.description !== undefined) fields.description = String(data.description || "").trim() || null;

  // Extended columns (may not exist on older schemas — try them, ignore failures)
  const extended: Record<string, unknown> = {};
  if (data.owner_name !== undefined) extended.owner_name = String(data.owner_name || "").trim() || null;
  if (data.whatsapp_number !== undefined) extended.whatsapp_number = String(data.whatsapp_number || "").trim() || null;
  if (data.website !== undefined) extended.website = String(data.website || "").trim() || null;
  if (data.google_maps_link !== undefined) extended.google_maps_link = String(data.google_maps_link || "").trim() || null;
  if (data.email !== undefined) extended.contact_email = String(data.email || "").trim() || null;

  // Try full update with extended columns
  const { error } = await admin.from("businesses").update({ ...fields, ...extended }).eq("id", businessId);
  if (error) {
    // Fallback: only core columns
    console.warn("[Knowledge] Full profile save failed, trying core-only:", error.message);
    const { error: coreErr } = await admin.from("businesses").update(fields).eq("id", businessId);
    if (coreErr) throw new Error("Failed to save profile: " + coreErr.message);
  }
}

// ─── Business Response Builder ───────────────────────────────────────────────

function buildBusinessResponse(biz: Record<string, unknown>) {
  return {
    name: biz.name || "",
    owner_name: biz.owner_name || "",
    type: biz.type || "other",
    description: biz.description || "",
    phone: biz.phone || "",
    whatsapp_number: biz.whatsapp_number || "",
    email: biz.contact_email || biz.email || "",
    website: biz.website || "",
    address: biz.address || "",
    city: biz.city || "",
    state: biz.state || "",
    google_maps_link: biz.google_maps_link || "",
    business_hours: biz.business_hours || null,
  };
}

// ─── AI Context Rebuild ──────────────────────────────────────────────────────

/**
 * Rebuilds the businesses.business_context field (plain text)
 * from all knowledge_sections data. This text is injected into
 * the AI system prompt as the "source of truth" for responses.
 */
async function rebuildBusinessContext(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string
) {
  const { data: biz } = await admin.from("businesses").select("*").eq("id", businessId).single();
  if (!biz) return;

  const sections = await loadSections(admin, businessId);
  const lines: string[] = [];

  // Business info
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
      if (day) lines.push(`- ${names[i]}: ${day.closed ? "Closed" : `${day.open || "09:00"} - ${day.close || "21:00"}`}`);
    });
    lines.push("");
  }

  // All knowledge sections
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
        let line = `- ${item.name || ""}`;
        if (item.price) line += ` — ${item.price}`;
        if (item.duration) line += ` (${item.duration})`;
        if (item.description) line += ` — ${item.description}`;
        lines.push(line);
      }
      lines.push("");
    }
  }

  lines.push("Note: If information is unavailable, say so honestly. Never make up details.");

  await admin.from("businesses").update({
    business_context: lines.join("\n").trim(),
  }).eq("id", businessId);
}
