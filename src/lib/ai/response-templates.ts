/**
 * Dynamic Response Templates
 *
 * Reusable template fragments for common conversation patterns.
 * Templates adapt to business type and language automatically.
 *
 * Used by the AI via system prompt examples, and by the formatter
 * for fallback responses when AI output is too poor.
 *
 * Each template provides a STRUCTURE, not exact words.
 * The AI fills in business-specific details.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface TemplateContext {
  businessName: string;
  businessType: string;
  customerName?: string;
  language?: string;
}

// ─── Template Generators ────────────────────────────────────────────────────

/**
 * Greeting template — First message from a customer
 */
export function getGreetingTemplate(ctx: TemplateContext): string {
  const name = ctx.customerName ? ` ${ctx.customerName}` : "";

  if (ctx.language === "hinglish") {
    return `Hello${name}! 👋\n${ctx.businessName} mein aapka swagat hai.\n\nMain aapki kaise help kar sakta hoon?`;
  }

  return `Hello${name}! 👋\nWelcome to ${ctx.businessName}.\n\nHow can I help you today?`;
}

/**
 * Information response template — When sharing business details
 */
export function getInfoTemplate(ctx: TemplateContext): string {
  // This provides structure examples for the AI
  switch (ctx.businessType) {
    case "school":
      return "🏫 [School Name]\n📍 [Location]\n🕘 [Timings]\n\nWould you like to know about admissions?";
    case "gym":
      return "🏋️ [Gym Name]\n💰 [Plan]: ₹[price]/month\n⏰ [Timings]\n\nWould you like a free trial?";
    case "clinic":
      return "🏥 [Clinic Name]\n👨‍⚕️ [Doctor]: [Specialization]\n🕘 Available: [slots]\n\nShall I book a consultation?";
    case "salon":
      return "💇 [Service]: ₹[price]\n⏱️ Duration: [time]\n\nWould you like to book an appointment?";
    case "restaurant":
      return "🍽️ [Item]: ₹[price]\n⏰ Open: [timing]\n\nShall I reserve a table?";
    case "real_estate":
      return "🏠 [Project]: ₹[price] onwards\n📍 [Location]\n🏗️ Possession: [date]\n\nWant to schedule a site visit?";
    default:
      return "📋 [Service]: ₹[price]\n🕘 Available: [timing]\n\nWould you like to book?";
  }
}

/**
 * Booking request template — When customer wants to schedule
 */
export function getBookingTemplate(ctx: TemplateContext): string {
  switch (ctx.businessType) {
    case "school":
      return "📅 Sure!\n\nPlease share:\n• Student's name\n• Class applying for\n• Preferred visit date\n\nI'll book your school visit.";
    case "gym":
      return "📅 Let's book your free trial!\n\nPlease share:\n• Preferred date\n• Preferred time\n\nI'll confirm your slot.";
    case "clinic":
      return "📅 Let me book your appointment.\n\nPlease share:\n• Preferred date\n• Preferred time\n• Doctor preference (if any)";
    case "salon":
      return "📅 Let me book that for you!\n\nPlease share:\n• Preferred date\n• Preferred time\n\nI'll confirm your appointment.";
    case "restaurant":
      return "📅 Happy to reserve!\n\nPlease share:\n• Date\n• Time\n• Number of guests";
    case "real_estate":
      return "📅 Let me arrange a site visit.\n\nPlease share:\n• Preferred date\n• Preferred time\n• Which project interests you?";
    default:
      return "📅 Sure!\n\nPlease share:\n• Preferred date\n• Preferred time\n\nI'll confirm your booking.";
  }
}

/**
 * Confirmation template — After booking is confirmed
 */
export function getConfirmationTemplate(ctx: TemplateContext): string {
  const label = getBookingLabel(ctx.businessType);
  return `✅ ${label} confirmed!\n\n📅 [Date]\n⏰ [Time]\n📍 [Location]\n\nSee you there!`;
}

/**
 * Clarification template — When AI needs more info
 */
export function getClarificationTemplate(_ctx: TemplateContext): string {
  return "I want to help you with the right information.\n\nCould you please specify what you need?";
}

/**
 * Callback template — When info is not available
 */
export function getCallbackTemplate(ctx: TemplateContext): string {
  if (ctx.language === "hinglish") {
    return "Abhi mere paas ye information nahi hai.\n\nMain team se baat karke aapko callback arrange karta hoon. 🙏";
  }
  return "I don't have that information at the moment.\n\nI can arrange a callback from our team. 🙏";
}

/**
 * Unknown/fallback template — When AI can't understand intent
 */
export function getUnknownTemplate(ctx: TemplateContext): string {
  if (ctx.language === "hinglish") {
    return `Main ${ctx.businessName} ke baare mein help kar sakta hoon.\n\nKya jaanna chahte hain?\n• Pricing\n• Timings\n• Booking`;
  }
  return `I can help you with:\n• Pricing & services\n• Timings & availability\n• Booking & appointments\n\nWhat would you like to know?`;
}

/**
 * Escalation template — Handing off to human
 */
export function getEscalationTemplate(ctx: TemplateContext): string {
  if (ctx.language === "hinglish") {
    return `Main aapko ${ctx.businessName} ki team se connect karta hoon.\n\nWo jaldi aapse baat karenge! 🙏`;
  }
  return `Let me connect you with the ${ctx.businessName} team.\n\nThey'll reach out shortly! 🙏`;
}

/**
 * Closing template — When conversation is ending
 */
export function getClosingTemplate(ctx: TemplateContext): string {
  const name = ctx.customerName ? `, ${ctx.customerName}` : "";
  if (ctx.language === "hinglish") {
    return `Thank you${name}! 🙏\n\nKoi aur sawal ho toh message kar dijiye.`;
  }
  return `Thank you${name}! 🙏\n\nFeel free to message anytime.`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getBookingLabel(type: string): string {
  const labels: Record<string, string> = {
    school: "School visit",
    gym: "Trial session",
    salon: "Appointment",
    clinic: "Appointment",
    dental: "Dental appointment",
    restaurant: "Table reservation",
    real_estate: "Site visit",
    coaching: "Demo class",
    hotel: "Room reservation",
  };
  return labels[type] || "Booking";
}
