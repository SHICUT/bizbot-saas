/**
 * FlowNex Demo Data Generator
 *
 * Generates a complete, realistic Real Estate demo workspace.
 * All data is isolated via is_demo=true flag.
 * One-click generation and reset from Super Admin.
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ─── Constants ───────────────────────────────────────────────────────────────

const LOCATIONS = ["Golf Course Road", "Sohna Road", "Sector 57", "Sector 65", "Dwarka Expressway", "New Gurgaon", "Sector 82", "Sector 49"];
const PROPERTY_TYPES = ["2 BHK", "3 BHK", "Villa", "Plot", "Commercial"];
const LEAD_SOURCES = ["whatsapp", "instagram", "website", "referral", "facebook"];
const AGENTS = ["Priya Sharma", "Amit Verma", "Rahul Singh", "Neha Gupta"];

const INDIAN_NAMES = [
  "Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sunita Verma", "Vikram Singh",
  "Anjali Gupta", "Rohit Mehta", "Kavita Joshi", "Arun Reddy", "Meera Nair",
  "Suresh Yadav", "Deepika Iyer", "Manish Agarwal", "Pooja Saxena", "Kiran Desai",
  "Sanjay Chopra", "Nisha Kapoor", "Ravi Malhotra", "Anita Bose", "Gaurav Sinha",
  "Swati Tiwari", "Nikhil Jain", "Rekha Pillai", "Vishal Dubey", "Shruti Mishra",
  "Ashok Bansal", "Divya Rao", "Pankaj Arora", "Savita Khanna", "Manoj Pandey",
  "Pallavi Chauhan", "Saurabh Goel", "Ritu Choudhary", "Ajay Bhatt", "Megha Thakur",
  "Rajeev Tandon", "Seema Agnihotri", "Dhruv Kohli", "Nandini Menon", "Vinod Kulkarni",
];

const CONVERSATION_TOPICS = [
  "pricing", "floor_plans", "site_visit", "amenities", "possession",
  "home_loan", "location", "payment_plans", "resale", "rental_yield",
];

function randomFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomBetween(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomPhone(): string { return `+91${randomBetween(70, 99)}${randomBetween(10000000, 99999999)}`; }
function randomDate(daysBack: number): string {
  const d = new Date(Date.now() - randomBetween(0, daysBack) * 86400000);
  return d.toISOString();
}
function randomFutureDate(daysAhead: number): string {
  const d = new Date(Date.now() + randomBetween(1, daysAhead) * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Main Generator ──────────────────────────────────────────────────────────

export interface DemoResult {
  success: boolean;
  businessId: string;
  stats: { leads: number; conversations: number; appointments: number; messages: number };
  duration: number;
}

export async function generateCompleteDemo(adminUserId: string): Promise<DemoResult> {
  const start = Date.now();
  const supabase = createAdminClient();

  // 1. Delete old demo data
  await resetDemoWorkspace(supabase);

  // 2. Create or get demo business
  const businessId = await getOrCreateDemoBusiness(supabase, adminUserId);

  // 3. Create demo subscription
  await createDemoSubscription(supabase, businessId);

  // 4. Generate leads (127)
  const leadIds = await generateDemoLeads(supabase, businessId, 127);

  // 5. Generate conversations (186) linked to leads
  const { conversationCount, messageCount } = await generateDemoConversations(supabase, businessId, leadIds, 186);

  // 6. Generate appointments (38) linked to leads
  const appointmentCount = await generateDemoAppointments(supabase, businessId, leadIds, 38);

  // 7. Update business context (knowledge base)
  await updateDemoKnowledgeBase(supabase, businessId);

  const duration = Date.now() - start;
  return {
    success: true,
    businessId,
    stats: { leads: leadIds.length, conversations: conversationCount, appointments: appointmentCount, messages: messageCount },
    duration,
  };
}

// ─── Reset ───────────────────────────────────────────────────────────────────

async function resetDemoWorkspace(supabase: ReturnType<typeof createAdminClient>) {
  await supabase.from("messages").delete().eq("is_demo", true);
  await supabase.from("conversations").delete().eq("is_demo", true);
  await supabase.from("appointments").delete().eq("is_demo", true);
  await supabase.from("leads").delete().eq("is_demo", true);
  // Don't delete business — preserve it for re-use
}

export async function resetDemo(): Promise<void> {
  const supabase = createAdminClient();
  await resetDemoWorkspace(supabase);
}

// ─── Business ────────────────────────────────────────────────────────────────

async function getOrCreateDemoBusiness(supabase: ReturnType<typeof createAdminClient>, adminUserId: string): Promise<string> {
  const { data: existing } = await supabase.from("businesses").select("id").eq("is_demo", true).limit(1).single();
  if (existing) return existing.id;

  const { data: biz } = await supabase.from("businesses").insert({
    owner_id: adminUserId,
    name: "Skyline Realty",
    type: "real_estate",
    phone: "+919876543210",
    email: "info@skylinerealty.in",
    address: "Golf Course Road",
    city: "Gurgaon",
    state: "Haryana",
    is_active: true,
    is_demo: true,
    onboarding_completed: true,
    plan: "growth",
    ai_enabled: true,
    ai_tone: "friendly",
    ai_language: "english",
    whatsapp_connected: true,
    whatsapp_phone_number_id: "DEMO_PHONE_ID",
    whatsapp_phone_number: "+91 98765 43210",
    whatsapp_verified_name: "Skyline Realty",
    owner_email: "demo@flownex.in",
  }).select("id").single();

  return biz!.id;
}

// ─── Subscription ────────────────────────────────────────────────────────────

async function createDemoSubscription(supabase: ReturnType<typeof createAdminClient>, businessId: string) {
  await supabase.from("subscriptions").upsert({
    business_id: businessId,
    plan: "growth",
    status: "active",
    message_limit: 1000,
    messages_used: 764,
    current_period_start: new Date(Date.now() - 15 * 86400000).toISOString(),
    current_period_end: new Date(Date.now() + 15 * 86400000).toISOString(),
  }, { onConflict: "business_id" });
}

// ─── Leads ───────────────────────────────────────────────────────────────────

async function generateDemoLeads(supabase: ReturnType<typeof createAdminClient>, businessId: string, count: number): Promise<string[]> {
  const statuses = [
    ...Array(18).fill("new"),
    ...Array(41).fill("contacted"),
    ...Array(33).fill("qualified"),
    ...Array(21).fill("qualified"), // site visit scheduled (tagged)
    ...Array(8).fill("qualified"),  // negotiation (tagged)
    ...Array(6).fill("converted"),
  ];

  const leads = Array.from({ length: count }, (_, i) => {
    const name = INDIAN_NAMES[i % INDIAN_NAMES.length];
    const status = statuses[i] || "new";
    const budget = randomBetween(80, 400) * 100000;
    const score = status === "converted" ? randomBetween(85, 100) : status === "qualified" ? randomBetween(55, 84) : status === "contacted" ? randomBetween(30, 54) : randomBetween(5, 29);
    const temp = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";

    return {
      business_id: businessId,
      wa_id: randomPhone(),
      phone: randomPhone(),
      name,
      email: `${name.toLowerCase().replace(/\s/g, ".")}@gmail.com`,
      status,
      score,
      lead_temperature: temp,
      source: randomFrom(LEAD_SOURCES),
      estimated_value: budget,
      message_count: randomBetween(3, 45),
      is_demo: true,
      metadata: {
        budget: `₹${(budget / 100000).toFixed(0)} Lakh`,
        property_type: randomFrom(PROPERTY_TYPES),
        location: randomFrom(LOCATIONS),
        assigned_agent: randomFrom(AGENTS),
      },
      first_message_at: randomDate(60),
      last_message_at: randomDate(7),
      created_at: randomDate(60),
    };
  });

  const { data } = await supabase.from("leads").insert(leads).select("id");
  return data?.map((l) => l.id) || [];
}

// ─── Conversations ───────────────────────────────────────────────────────────

async function generateDemoConversations(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  leadIds: string[],
  count: number
): Promise<{ conversationCount: number; messageCount: number }> {
  let totalMessages = 0;
  const conversations = Array.from({ length: Math.min(count, leadIds.length) }, (_, i) => {
    const isActive = i < 28;
    const channel = Math.random() < 0.75 ? "whatsapp" : "instagram";
    return {
      business_id: businessId,
      lead_id: leadIds[i],
      channel,
      status: isActive ? "active" : "archived",
      is_ai_active: true,
      unread_count: isActive ? randomBetween(0, 3) : 0,
      last_message_text: getLastMessage(i),
      last_message_at: randomDate(3),
      is_demo: true,
    };
  });

  const { data: convs } = await supabase.from("conversations").insert(conversations).select("id, lead_id");

  // Generate messages for each conversation
  if (convs) {
    for (const conv of convs.slice(0, 50)) { // Messages for first 50 conversations
      const msgCount = randomBetween(8, 25);
      const messages = Array.from({ length: msgCount }, (_, j) => ({
        business_id: businessId,
        conversation_id: conv.id,
        lead_id: conv.lead_id,
        wa_message_id: `demo_${conv.id}_${j}`,
        direction: j % 2 === 0 ? "inbound" : "outbound",
        content: j % 2 === 0 ? getCustomerMessage(j) : getAIReply(j),
        message_type: "text",
        is_ai_generated: j % 2 !== 0,
        status: "delivered",
        is_demo: true,
        created_at: new Date(Date.now() - (msgCount - j) * 300000).toISOString(),
      }));
      await supabase.from("messages").insert(messages);
      totalMessages += msgCount;
    }
  }

  return { conversationCount: convs?.length || 0, messageCount: totalMessages };
}

// ─── Appointments ────────────────────────────────────────────────────────────

async function generateDemoAppointments(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  leadIds: string[],
  count: number
): Promise<number> {
  const statuses = [...Array(24).fill("confirmed"), ...Array(8).fill("pending"), ...Array(4).fill("completed"), ...Array(2).fill("no_show")];
  const types = ["Site Visit", "Virtual Tour", "Phone Consultation", "Site Visit", "Site Visit"];

  const appointments = Array.from({ length: count }, (_, i) => {
    const date = randomFutureDate(14);
    const hour = randomBetween(10, 18);
    const time = `${String(hour).padStart(2, "0")}:00`;
    return {
      business_id: businessId,
      lead_id: leadIds[i % leadIds.length],
      customer_name: INDIAN_NAMES[i % INDIAN_NAMES.length],
      customer_phone: randomPhone(),
      title: randomFrom(types),
      service: randomFrom(types),
      appointment_date: date,
      appointment_time: time,
      scheduled_at: `${date}T${time}:00`,
      duration_minutes: 60,
      status: statuses[i] || "pending",
      source: "whatsapp",
      booked_by: "ai",
      booked_via: "whatsapp",
      is_demo: true,
    };
  });

  const { data } = await supabase.from("appointments").insert(appointments).select("id");
  return data?.length || 0;
}

// ─── Knowledge Base ──────────────────────────────────────────────────────────

async function updateDemoKnowledgeBase(supabase: ReturnType<typeof createAdminClient>, businessId: string) {
  const context = `Skyline Realty - Premium Real Estate in Gurgaon

About: Skyline Realty helps customers discover premium residential and commercial properties across Gurgaon. Established 2018.

Owner: Ram Sagar Verma
Location: Golf Course Road, Gurgaon, Haryana
Contact: +91 98765 43210 | info@skylinerealty.in
Website: https://flownex.in
Hours: Monday–Saturday 10:00 AM – 7:00 PM

Properties Available:
- 2 BHK apartments: ₹85 lakh onwards (Sector 57, 65, 82)
- 3 BHK apartments: ₹1.4 crore onwards (Golf Course Road, Sohna Road)
- Villas: ₹2.8 crore onwards (Sohna Road, New Gurgaon)
- Plots: ₹45 lakh onwards (Dwarka Expressway)
- Commercial: ₹1.2 crore onwards (Sector 49, Golf Course Extension)

Services: Residential Sales, Commercial Leasing, Property Investment Advisory, Home Loan Assistance, Site Visit Coordination

Amenities (in most projects): Swimming Pool, Gym, Club House, Children's Play Area, 24/7 Security, Power Backup, Parking, Landscaped Gardens

Payment Options: Bank loans up to 90%, EMI from ₹45,000/month, Flexi payment plans, Subvention schemes available

Possession: Ready to move (select units), Under construction (2025-2027)

Why Skyline Realty: RERA registered, 200+ happy families, Transparent dealings, No hidden charges, Free site visits`;

  await supabase.from("businesses").update({ business_context: context }).eq("id", businessId);
}

// ─── Message Templates ───────────────────────────────────────────────────────

function getLastMessage(i: number): string {
  const msgs = [
    "What is the price for 3BHK in Sector 65?",
    "Can I visit the property this weekend?",
    "Do you have ready-to-move flats?",
    "What about home loan assistance?",
    "Send me the floor plan please",
    "Is there a swimming pool?",
    "What is the possession date?",
    "Any festive offers running?",
    "I'm looking for a villa in Sohna Road",
    "What's the EMI for 2BHK?",
  ];
  return msgs[i % msgs.length];
}

function getCustomerMessage(i: number): string {
  const msgs = [
    "Hi, I'm interested in properties in Gurgaon",
    "What's the price range for 2BHK?",
    "Do you have anything near Golf Course Road?",
    "I need a 3BHK for my family",
    "What amenities are included?",
    "Can you arrange a site visit?",
    "Is home loan available?",
    "What's the possession timeline?",
    "Any payment plan options?",
    "Send me brochure please",
    "How much is the down payment?",
    "Is it RERA registered?",
    "What about parking?",
    "Any ready to move options?",
    "What's the per sq ft rate?",
  ];
  return msgs[i % msgs.length];
}

function getAIReply(i: number): string {
  const replies = [
    "Hi! 👋 Welcome to Skyline Realty. We have premium properties across Gurgaon starting from ₹85 lakh. What type of property are you looking for?",
    "Our 2BHK apartments start from ₹85 lakh in Sector 57 and 65. Would you like to know about a specific location?",
    "Yes! We have several options near Golf Course Road. 3BHK starts at ₹1.4 crore with world-class amenities. Shall I share the floor plans?",
    "For families, I'd recommend our 3BHK in Sector 65 — spacious, great school nearby, and possession by Dec 2026. Budget range?",
    "All our projects include: Swimming Pool, Gym, Club House, Children's Play Area, 24/7 Security, Power Backup, and Landscaped Gardens! 🏊",
    "Absolutely! I can arrange a site visit this weekend. Would Saturday morning or Sunday afternoon work better for you?",
    "Yes, we assist with home loans from all major banks. Up to 90% financing available with EMI starting ₹45,000/month.",
    "Sector 57 project: Ready to move. Sector 65: Possession by March 2027. Golf Course Road: Dec 2026. Which interests you?",
    "We offer flexible payment plans: 10-30-30-30, Subvention (no EMI till possession), and Construction-linked. Which suits you?",
    "I'll send the brochure right away! 📄 Meanwhile, what's your budget range so I can highlight the best options?",
    "Down payment is typically 10-20% of the property value. For a ₹1 crore property, that's ₹10-20 lakh. We can help with loan pre-approval too!",
    "All our projects are RERA registered. I can share the RERA numbers for specific projects you're interested in.",
    "Each unit comes with 1-2 covered parking spaces. Visitor parking is also available in all projects.",
    "Yes! We have ready-to-move units in Sector 57 — 2BHK at ₹92 lakh and 3BHK at ₹1.45 crore. Want to visit?",
    "The rate varies by project: Sector 57 is ₹8,500/sq ft, Golf Course Road is ₹14,000/sq ft. What's your preferred area?",
  ];
  return replies[i % replies.length];
}
