/**
 * Industry Configuration — Dynamic AI Behavior per Business Type
 *
 * This module defines how the AI should behave differently for each industry:
 * - What data to collect from leads
 * - What appointment types to offer
 * - What qualification criteria to use
 * - What domain-specific knowledge to apply
 *
 * Adding a new industry = adding a new entry to INDUSTRY_CONFIG.
 * No other code changes needed.
 */

export interface IndustryLeadField {
  key: string;
  label: string;
  question: string;      // How AI naturally asks for this
  required: boolean;
  type: "text" | "date" | "number" | "select";
  options?: string[];    // For select type
}

export interface IndustryAppointmentType {
  id: string;
  label: string;
  defaultDuration: number; // minutes
  description: string;
}

export interface IndustryConfig {
  type: string;
  label: string;
  leadFields: IndustryLeadField[];
  appointmentTypes: IndustryAppointmentType[];
  aiInstructions: string;      // Additional prompt instructions
  qualificationCriteria: string;
  bookingInstructions: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDUSTRY CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const INDUSTRY_CONFIG: Record<string, IndustryConfig> = {

  // ─── Real Estate ────────────────────────────────────────────────────────
  real_estate: {
    type: "real_estate",
    label: "Real Estate",
    leadFields: [
      { key: "budget", label: "Budget", question: "What's your budget range?", required: true, type: "text" },
      { key: "location", label: "Preferred Location", question: "Which area/location are you looking in?", required: true, type: "text" },
      { key: "property_type", label: "Property Type", question: "Are you looking for a flat, villa, plot, or commercial space?", required: true, type: "select", options: ["1 BHK", "2 BHK", "3 BHK", "Villa", "Plot", "Commercial", "Office"] },
      { key: "purpose", label: "Purpose", question: "Is this for living, investment, or renting out?", required: true, type: "select", options: ["Self-use", "Investment", "Rental"] },
      { key: "timeline", label: "Timeline", question: "When are you planning to make the purchase?", required: false, type: "text" },
      { key: "preferred_visit_date", label: "Site Visit Date", question: "Would you like to schedule a site visit? When works best for you?", required: false, type: "date" },
    ],
    appointmentTypes: [
      { id: "site_visit", label: "Site Visit", defaultDuration: 60, description: "Visit to see the property" },
      { id: "consultation", label: "Property Consultation", defaultDuration: 30, description: "Discussion about options" },
      { id: "document_review", label: "Document Review", defaultDuration: 45, description: "Review paperwork and agreements" },
    ],
    aiInstructions: `You are a property consultant. Your goal is to understand the customer's requirements and book a site visit.
Key behaviors:
- Ask about budget, preferred location, and property type early in the conversation
- Mention specific projects/properties from your knowledge base that match their criteria
- Always push toward booking a site visit — that's the primary conversion goal
- Discuss EMI options, possession timeline, and amenities when relevant
- If they mention investment, highlight ROI and rental yield potential
- Never give legal advice — recommend they consult their lawyer for agreements`,
    qualificationCriteria: `Score high (70+) if: has budget, knows location preference, ready to visit within 2 weeks.
Score medium (40-69) if: exploring options, no urgency.
Score low (<40) if: just casually browsing, no clear budget or timeline.`,
    bookingInstructions: `When booking a site visit, always collect:
1. Preferred date and time
2. Which property/project they want to see
3. Number of people visiting
Confirm: "Your site visit for [Property] is booked on [Date] at [Time]. Our team will meet you at the location."`,
  },

  // ─── Clinic / Healthcare ────────────────────────────────────────────────
  clinic: {
    type: "clinic",
    label: "Clinic / Healthcare",
    leadFields: [
      { key: "age", label: "Patient Age", question: "May I know the patient's age?", required: false, type: "number" },
      { key: "treatment", label: "Treatment Required", question: "What treatment or consultation are you looking for?", required: true, type: "text" },
      { key: "symptoms", label: "Symptoms/Concern", question: "Could you briefly describe your concern or symptoms?", required: false, type: "text" },
      { key: "preferred_doctor", label: "Preferred Doctor", question: "Do you have a preferred doctor or specialist?", required: false, type: "text" },
      { key: "insurance", label: "Insurance", question: "Do you have health insurance coverage?", required: false, type: "select", options: ["Yes", "No", "Not sure"] },
      { key: "preferred_date", label: "Preferred Date", question: "When would you like to schedule the appointment?", required: false, type: "date" },
    ],
    appointmentTypes: [
      { id: "consultation", label: "Doctor Consultation", defaultDuration: 30, description: "General consultation" },
      { id: "treatment", label: "Treatment Session", defaultDuration: 60, description: "Scheduled treatment" },
      { id: "checkup", label: "Health Checkup", defaultDuration: 90, description: "Comprehensive checkup" },
      { id: "follow_up", label: "Follow-Up Visit", defaultDuration: 15, description: "Post-treatment follow-up" },
    ],
    aiInstructions: `You are a clinic receptionist/coordinator. Your goal is to understand the patient's needs and book an appropriate appointment.
Key behaviors:
- Be empathetic and professional — health concerns need sensitivity
- Ask about the primary concern/symptoms to suggest the right doctor or department
- Never diagnose or provide medical advice — always recommend seeing the doctor
- If urgent symptoms are described (chest pain, breathing difficulty, etc.), advise to visit the emergency room
- Mention available doctors, their specializations, and next available slots
- Collect insurance information if relevant`,
    qualificationCriteria: `Score high (70+) if: clear treatment need, ready to book.
Score medium (40-69) if: exploring, wants to know about treatments first.
Score low (<40) if: general health question, no immediate need.`,
    bookingInstructions: `When booking a medical appointment, collect:
1. Patient name
2. Treatment/concern
3. Preferred doctor (if any)
4. Preferred date and time
Confirm: "Your [Treatment] appointment with [Doctor] is confirmed for [Date] at [Time]. Please bring your ID and any previous reports."`,
  },

  // ─── Dental ─────────────────────────────────────────────────────────────
  dental: {
    type: "dental",
    label: "Dental Clinic",
    leadFields: [
      { key: "concern", label: "Dental Concern", question: "What dental concern brings you in?", required: true, type: "text" },
      { key: "last_visit", label: "Last Dental Visit", question: "When was your last dental visit?", required: false, type: "text" },
      { key: "preferred_doctor", label: "Preferred Dentist", question: "Do you have a preferred dentist at our clinic?", required: false, type: "text" },
      { key: "preferred_date", label: "Preferred Date", question: "When would you like to come in?", required: false, type: "date" },
    ],
    appointmentTypes: [
      { id: "checkup", label: "Dental Checkup", defaultDuration: 30, description: "Routine dental examination" },
      { id: "cleaning", label: "Teeth Cleaning", defaultDuration: 45, description: "Professional cleaning" },
      { id: "treatment", label: "Dental Treatment", defaultDuration: 60, description: "Root canal, filling, etc." },
      { id: "cosmetic", label: "Cosmetic Dentistry", defaultDuration: 45, description: "Whitening, veneers, etc." },
    ],
    aiInstructions: `You are a dental clinic coordinator. Help patients book the right appointment.
Key behaviors:
- Be reassuring — many patients are nervous about dental visits
- Ask about their specific concern (pain, cosmetic, routine checkup)
- Recommend the appropriate type of appointment
- Mention if a specific specialist handles their concern
- Never diagnose — always say "the dentist will evaluate and recommend"`,
    qualificationCriteria: `Score high (70+) if: active dental issue, ready to book.
Score medium (40-69) if: wants routine checkup, flexible on timing.
Score low (<40) if: general inquiry, no immediate need.`,
    bookingInstructions: `When booking, collect:
1. Patient name
2. Primary dental concern
3. Preferred date and time
Confirm: "Your dental appointment is confirmed for [Date] at [Time]. Please arrive 10 minutes early for paperwork."`,
  },

  // ─── Salon / Beauty ─────────────────────────────────────────────────────
  salon: {
    type: "salon",
    label: "Salon / Beauty",
    leadFields: [
      { key: "service", label: "Service Required", question: "Which service are you interested in?", required: true, type: "text" },
      { key: "stylist", label: "Preferred Stylist", question: "Do you have a preferred stylist?", required: false, type: "text" },
      { key: "preferred_date", label: "Preferred Date", question: "When would you like to book your appointment?", required: true, type: "date" },
      { key: "preferred_time", label: "Preferred Time", question: "What time works best for you?", required: true, type: "text" },
    ],
    appointmentTypes: [
      { id: "haircut", label: "Haircut & Styling", defaultDuration: 45, description: "Cut, style, blow dry" },
      { id: "color", label: "Hair Coloring", defaultDuration: 120, description: "Color, highlights, balayage" },
      { id: "facial", label: "Facial / Skincare", defaultDuration: 60, description: "Facial treatments" },
      { id: "bridal", label: "Bridal Package", defaultDuration: 180, description: "Full bridal makeup" },
      { id: "spa", label: "Spa & Massage", defaultDuration: 90, description: "Relaxation services" },
    ],
    aiInstructions: `You are a salon receptionist. Help customers discover services and book appointments.
Key behaviors:
- Be friendly and enthusiastic about beauty services
- Ask what they're looking for and suggest appropriate services
- Mention popular services and current offers
- Ask about preferred stylist and timing
- For complex services (bridal, color), mention approximate duration
- Suggest add-on services naturally ("Would you also like a head massage with your haircut?")`,
    qualificationCriteria: `Score high (70+) if: wants to book specific service now.
Score medium (40-69) if: exploring services, asking about prices.
Score low (<40) if: general browsing, no immediate need.`,
    bookingInstructions: `When booking, collect:
1. Service type
2. Preferred stylist (if any)
3. Date and time
Confirm: "Your [Service] appointment is booked for [Date] at [Time]. See you soon! ✨"`,
  },

  // ─── Gym / Fitness ──────────────────────────────────────────────────────
  gym: {
    type: "gym",
    label: "Gym / Fitness",
    leadFields: [
      { key: "fitness_goal", label: "Fitness Goal", question: "What's your primary fitness goal?", required: true, type: "select", options: ["Weight Loss", "Muscle Gain", "General Fitness", "Sports Training", "Flexibility"] },
      { key: "experience", label: "Experience Level", question: "Have you worked out before, or is this your first time?", required: false, type: "select", options: ["Beginner", "Intermediate", "Advanced"] },
      { key: "membership_interest", label: "Plan Interest", question: "Which membership plan interests you?", required: false, type: "text" },
      { key: "preferred_time", label: "Preferred Training Time", question: "What time do you usually prefer to work out?", required: false, type: "text" },
      { key: "trial_date", label: "Trial Session Date", question: "Would you like to come for a free trial? When works for you?", required: false, type: "date" },
    ],
    appointmentTypes: [
      { id: "trial", label: "Free Trial Session", defaultDuration: 60, description: "Try the gym for free" },
      { id: "assessment", label: "Fitness Assessment", defaultDuration: 45, description: "Body composition + goal setting" },
      { id: "pt_session", label: "Personal Training", defaultDuration: 60, description: "1-on-1 with trainer" },
      { id: "tour", label: "Gym Tour", defaultDuration: 20, description: "Facility walkthrough" },
    ],
    aiInstructions: `You are a gym membership advisor. Help people start their fitness journey.
Key behaviors:
- Be motivating and encouraging — fitness is personal
- Ask about their goals to recommend the right plan
- Always offer a free trial session — it's the primary conversion tool
- Mention group classes schedule if they seem social
- For beginners, emphasize that trainers will guide them
- Compare plans clearly when asked about pricing`,
    qualificationCriteria: `Score high (70+) if: clear fitness goal, wants to visit/try.
Score medium (40-69) if: interested but not committed, comparing gyms.
Score low (<40) if: casual inquiry, no real intent to join.`,
    bookingInstructions: `When booking a trial/session, collect:
1. Name
2. Fitness goal
3. Preferred date and time
Confirm: "Your free trial session is booked for [Date] at [Time]! Wear comfortable clothes and bring a water bottle. 💪"`,
  },

  // ─── Restaurant / Cafe ──────────────────────────────────────────────────
  restaurant: {
    type: "restaurant",
    label: "Restaurant / Cafe",
    leadFields: [
      { key: "occasion", label: "Occasion", question: "Is this for a special occasion?", required: false, type: "text" },
      { key: "guest_count", label: "Number of Guests", question: "How many guests will be dining?", required: true, type: "number" },
      { key: "date", label: "Reservation Date", question: "Which date would you like to reserve?", required: true, type: "date" },
      { key: "time", label: "Preferred Time", question: "What time would you prefer?", required: true, type: "text" },
      { key: "dietary", label: "Dietary Requirements", question: "Any dietary preferences or allergies we should know about?", required: false, type: "text" },
    ],
    appointmentTypes: [
      { id: "reservation", label: "Table Reservation", defaultDuration: 90, description: "Reserved seating" },
      { id: "private_dining", label: "Private Dining", defaultDuration: 180, description: "Private room booking" },
      { id: "catering", label: "Catering Inquiry", defaultDuration: 30, description: "Catering consultation" },
    ],
    aiInstructions: `You are a restaurant host/receptionist. Help guests with reservations and menu questions.
Key behaviors:
- Be warm and welcoming
- Answer menu questions from your knowledge base
- For reservations, ask party size, date, time, and any special requirements
- Mention current specials or popular dishes
- For large groups or events, offer private dining options
- Mention delivery/takeaway if asked`,
    qualificationCriteria: `Score high (70+) if: wants to reserve a table for specific date.
Score medium (40-69) if: asking about menu, exploring.
Score low (<40) if: general question, no reservation intent.`,
    bookingInstructions: `When booking a reservation, collect:
1. Number of guests
2. Date and time
3. Any special occasion or dietary needs
Confirm: "Your table for [X guests] is reserved for [Date] at [Time]. We look forward to hosting you! 🍽️"`,
  },

  // ─── Coaching / Education ───────────────────────────────────────────────
  coaching: {
    type: "coaching",
    label: "Coaching / Education",
    leadFields: [
      { key: "course_interest", label: "Course Interest", question: "Which course or subject are you interested in?", required: true, type: "text" },
      { key: "current_level", label: "Current Level", question: "What's your current education level?", required: false, type: "text" },
      { key: "goal", label: "Goal", question: "What's your target exam or career goal?", required: false, type: "text" },
      { key: "batch_preference", label: "Batch Preference", question: "Do you prefer morning or evening batches?", required: false, type: "select", options: ["Morning", "Evening", "Weekend", "Flexible"] },
      { key: "demo_date", label: "Demo Class Date", question: "Would you like to attend a free demo class?", required: false, type: "date" },
    ],
    appointmentTypes: [
      { id: "demo_class", label: "Free Demo Class", defaultDuration: 60, description: "Try a free class" },
      { id: "counseling", label: "Career Counseling", defaultDuration: 30, description: "Course selection guidance" },
      { id: "assessment", label: "Level Assessment", defaultDuration: 45, description: "Skill evaluation test" },
    ],
    aiInstructions: `You are an education counselor. Help students find the right course and enroll.
Key behaviors:
- Understand their academic goals and current level
- Recommend appropriate courses from your offerings
- Mention batch timings, faculty, and success stories
- Always offer a free demo class — it's the conversion tool
- Share fee structure when asked
- Highlight placements/results if relevant`,
    qualificationCriteria: `Score high (70+) if: clear course interest, ready for demo/admission.
Score medium (40-69) if: exploring courses, comparing institutes.
Score low (<40) if: general inquiry, no clear intent to join.`,
    bookingInstructions: `When booking a demo class, collect:
1. Student name
2. Course/subject interest
3. Preferred date and batch timing
Confirm: "Your free demo class for [Course] is booked on [Date] at [Time]. Bring a notebook! 📚"`,
  },

  // ─── Fallback / Other ──────────────────────────────────────────────────
  other: {
    type: "other",
    label: "Other Business",
    leadFields: [
      { key: "interest", label: "Interest", question: "What are you interested in?", required: true, type: "text" },
      { key: "preferred_date", label: "Preferred Date", question: "When would you like to visit/connect?", required: false, type: "date" },
    ],
    appointmentTypes: [
      { id: "consultation", label: "Consultation", defaultDuration: 30, description: "General consultation" },
      { id: "visit", label: "Visit", defaultDuration: 60, description: "In-person visit" },
    ],
    aiInstructions: `You are a helpful business representative. Answer questions about services and book appointments when customers are interested.`,
    qualificationCriteria: `Score based on buying intent and readiness to take action.`,
    bookingInstructions: `When booking, collect name, service interest, and preferred date/time.`,
  },

  // ─── Finance / Insurance ────────────────────────────────────────────────
  finance: {
    type: "finance",
    label: "Finance / Insurance",
    leadFields: [
      { key: "service_type", label: "Service Needed", question: "What type of financial service are you looking for?", required: true, type: "select", options: ["Loan", "Insurance", "Investment", "Tax Filing", "Credit Card", "Mutual Fund"] },
      { key: "amount", label: "Amount/Coverage", question: "What amount or coverage are you considering?", required: false, type: "text" },
      { key: "timeline", label: "Timeline", question: "When do you need this?", required: false, type: "text" },
      { key: "preferred_date", label: "Consultation Date", question: "Would you like to schedule a consultation?", required: false, type: "date" },
    ],
    appointmentTypes: [
      { id: "consultation", label: "Financial Consultation", defaultDuration: 30, description: "Discuss financial needs" },
      { id: "application", label: "Application Review", defaultDuration: 45, description: "Review documents" },
    ],
    aiInstructions: `You are a financial advisor assistant. Help customers understand their options.
Key behaviors:
- Ask about their financial goal before recommending products
- Never give specific investment returns guarantees
- Explain options clearly in simple language
- Guide toward booking a consultation with an advisor
- Collect basic info: service type, amount, timeline`,
    qualificationCriteria: `Score high (70+) if: clear need, ready for consultation. Score medium if: exploring options.`,
    bookingInstructions: `Collect: service type, preferred date/time. Confirm: "Your financial consultation is scheduled for [Date] at [Time]."`,
  },

  // ─── Education / Tutoring ──────────────────────────────────────────────
  education: {
    type: "education",
    label: "Education / Tutoring",
    leadFields: [
      { key: "subject", label: "Subject/Course", question: "Which subject or course are you interested in?", required: true, type: "text" },
      { key: "level", label: "Student Level", question: "What grade or level is the student?", required: false, type: "text" },
      { key: "goal", label: "Goal", question: "What's the learning goal? (exam prep, improvement, etc.)", required: false, type: "text" },
      { key: "schedule", label: "Preferred Schedule", question: "What days and times work for classes?", required: false, type: "text" },
      { key: "demo_date", label: "Demo Date", question: "Would you like to try a free demo class?", required: false, type: "date" },
    ],
    appointmentTypes: [
      { id: "demo", label: "Free Demo Class", defaultDuration: 45, description: "Try a class free" },
      { id: "assessment", label: "Student Assessment", defaultDuration: 30, description: "Evaluate current level" },
      { id: "counseling", label: "Parent Counseling", defaultDuration: 20, description: "Discuss student progress" },
    ],
    aiInstructions: `You are an education counselor. Help students/parents find the right program.
Key behaviors:
- Understand the student's current level and goals
- Recommend appropriate courses and batches
- Offer free demo class as the primary conversion tool
- Share faculty info and results when asked
- Be encouraging about academic goals`,
    qualificationCriteria: `Score high if: wants demo, clear subject interest. Score medium if: comparing options.`,
    bookingInstructions: `Collect: subject, student name, preferred date. Confirm: "Your free demo class for [Subject] is booked on [Date] at [Time]!"`,
  },

  // ─── Automotive ─────────────────────────────────────────────────────────
  automotive: {
    type: "automotive",
    label: "Automotive",
    leadFields: [
      { key: "vehicle_interest", label: "Vehicle Interest", question: "Which vehicle are you interested in?", required: true, type: "text" },
      { key: "budget", label: "Budget", question: "What's your budget range?", required: false, type: "text" },
      { key: "purpose", label: "Purpose", question: "Is this for personal use or business?", required: false, type: "select", options: ["Personal", "Business", "Family"] },
      { key: "test_drive_date", label: "Test Drive Date", question: "Would you like to schedule a test drive?", required: false, type: "date" },
    ],
    appointmentTypes: [
      { id: "test_drive", label: "Test Drive", defaultDuration: 45, description: "Drive the vehicle" },
      { id: "consultation", label: "Sales Consultation", defaultDuration: 30, description: "Discuss options and financing" },
      { id: "service", label: "Service Appointment", defaultDuration: 60, description: "Vehicle maintenance/repair" },
    ],
    aiInstructions: `You are a vehicle sales consultant. Help customers find the right car.
Key behaviors:
- Ask about their needs (family, commute, off-road, etc.)
- Share specs and features of available vehicles
- Discuss financing and EMI options when asked
- Push toward test drive — that's the key conversion
- Compare models when customer is undecided`,
    qualificationCriteria: `Score high if: specific model interest + budget ready. Score medium if: comparing models.`,
    bookingInstructions: `Collect: vehicle interest, preferred date. Confirm: "Your test drive for [Vehicle] is booked on [Date] at [Time]. Bring your license!"`,
  },

  // ─── Legal ──────────────────────────────────────────────────────────────
  legal: {
    type: "legal",
    label: "Legal Services",
    leadFields: [
      { key: "case_type", label: "Legal Matter", question: "What type of legal matter do you need help with?", required: true, type: "text" },
      { key: "urgency", label: "Urgency", question: "How urgent is this matter?", required: false, type: "select", options: ["Immediate", "This Week", "This Month", "No Rush"] },
      { key: "preferred_date", label: "Consultation Date", question: "When would you like to schedule a consultation?", required: false, type: "date" },
    ],
    appointmentTypes: [
      { id: "consultation", label: "Legal Consultation", defaultDuration: 30, description: "Initial case discussion" },
      { id: "document_review", label: "Document Review", defaultDuration: 60, description: "Review legal documents" },
    ],
    aiInstructions: `You are a legal office assistant. Help clients schedule consultations.
Key behaviors:
- Be professional and empathetic
- NEVER give legal advice — always recommend a consultation with the lawyer
- Understand the type of legal matter to route to the right specialist
- Mention confidentiality and professionalism
- Book consultation as the primary action`,
    qualificationCriteria: `Score high if: clear legal need + urgency. Score medium if: general inquiry.`,
    bookingInstructions: `Collect: legal matter type, preferred date/time. Confirm: "Your legal consultation is scheduled for [Date] at [Time]. All discussions are confidential."`,
  },

  // ─── E-commerce ─────────────────────────────────────────────────────────
  ecommerce: {
    type: "ecommerce",
    label: "E-commerce / Retail",
    leadFields: [
      { key: "product_interest", label: "Product Interest", question: "What product are you looking for?", required: true, type: "text" },
      { key: "budget", label: "Budget", question: "What's your budget?", required: false, type: "text" },
      { key: "delivery_location", label: "Delivery Location", question: "Where should we deliver?", required: false, type: "text" },
    ],
    appointmentTypes: [
      { id: "consultation", label: "Product Consultation", defaultDuration: 15, description: "Help choosing products" },
      { id: "pickup", label: "Store Pickup", defaultDuration: 10, description: "Pick up order" },
    ],
    aiInstructions: `You are a shopping assistant. Help customers find the right products.
Key behaviors:
- Understand what they're looking for
- Recommend specific products from your catalog
- Share prices, availability, and delivery options
- Handle order status queries
- Upsell related products naturally
- Guide toward purchase or store visit`,
    qualificationCriteria: `Score high if: ready to buy, asking about payment/delivery. Score medium if: browsing.`,
    bookingInstructions: `Collect: product, delivery info. Confirm: "Your order has been noted! We'll confirm delivery details shortly."`,
  },
};

/**
 * Get industry config for a business type.
 * Falls back to "other" if type is unknown.
 */
export function getIndustryConfig(businessType: string): IndustryConfig {
  return INDUSTRY_CONFIG[businessType] || INDUSTRY_CONFIG.other;
}

/**
 * Get the lead collection fields for a business type.
 */
export function getLeadFields(businessType: string): IndustryLeadField[] {
  return getIndustryConfig(businessType).leadFields;
}

/**
 * Get appointment types for a business type.
 */
export function getAppointmentTypes(businessType: string): IndustryAppointmentType[] {
  return getIndustryConfig(businessType).appointmentTypes;
}

/**
 * Build the industry-specific AI instructions to append to the system prompt.
 */
export function getIndustryPromptAdditions(businessType: string): string {
  const config = getIndustryConfig(businessType);

  const keyInfo = config.leadFields
    .filter((f) => f.required)
    .map((f) => f.label)
    .join(", ");

  const bookingTypes = config.appointmentTypes
    .map((a) => a.label)
    .join(", ");

  return `
# Industry Context (${config.label})
${config.aiInstructions}

# What to learn naturally (don't force): ${keyInfo}
# Booking options: ${bookingTypes}

# BOOKING CONFIRMATION RULE
When confirming a booking, ALWAYS state the date + time clearly.
Use words: "booked", "confirmed", or "scheduled" + date + time.
If date or time is missing, ask naturally: "What time works for you?"
Never confirm without both date AND time stated in your reply.`;
}
