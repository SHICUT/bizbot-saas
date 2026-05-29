/**
 * OpenAI Function Calling Definitions
 *
 * These "tools" let the AI take actions beyond just replying:
 * - Book appointments
 * - Update lead information
 * - Escalate to human
 * - Schedule follow-ups
 *
 * The AI decides when to call these based on conversation context.
 * We execute the actions server-side after receiving the function call.
 */

export const AI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "book_appointment",
      description:
        "Book an appointment when the customer confirms a date/time. Only call this when the customer has explicitly agreed to a specific time.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short title for the appointment (e.g., 'Free Trial Class', 'Haircut', 'Consultation')",
          },
          service: {
            type: "string",
            description: "The service being booked",
          },
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format",
          },
          time: {
            type: "string",
            description: "Time in HH:MM format (24-hour)",
          },
          duration_minutes: {
            type: "number",
            description: "Duration in minutes (default 60)",
          },
          notes: {
            type: "string",
            description: "Any special notes or requests from the customer",
          },
        },
        required: ["title", "service", "date", "time"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "collect_customer_info",
      description:
        "Store customer information that was naturally shared during conversation. Call this whenever the customer shares their name, email, or preferences.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Customer's name if they shared it",
          },
          email: {
            type: "string",
            description: "Customer's email if they shared it",
          },
          preferred_service: {
            type: "string",
            description: "Service they're interested in",
          },
          budget: {
            type: "string",
            description: "Their budget or price sensitivity",
          },
          notes: {
            type: "string",
            description: "Any other relevant info they shared",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "escalate_to_human",
      description:
        "Hand off the conversation to the business owner. Use when: customer explicitly asks for human, is very angry, needs specialized help, or wants to negotiate beyond standard pricing.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Why the conversation is being escalated",
          },
          urgency: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "How urgently the owner should respond",
          },
          summary: {
            type: "string",
            description: "Brief summary of the conversation for the owner",
          },
        },
        required: ["reason", "urgency"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "schedule_follow_up",
      description:
        "Schedule an automated follow-up message if the customer goes quiet. Only use when the customer showed interest but didn't commit.",
      parameters: {
        type: "object",
        properties: {
          delay_hours: {
            type: "number",
            description: "Hours to wait before sending follow-up (typically 24)",
          },
          message_type: {
            type: "string",
            enum: ["gentle_reminder", "offer", "check_in"],
            description: "Type of follow-up to send",
          },
          context: {
            type: "string",
            description: "What to reference in the follow-up (e.g., 'they were interested in Pro plan')",
          },
        },
        required: ["delay_hours", "message_type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "qualify_lead",
      description:
        "Update the lead's qualification score based on conversation signals. Call this when you detect buying intent or disinterest.",
      parameters: {
        type: "object",
        properties: {
          score: {
            type: "number",
            description: "Lead score 0-100. 0=cold, 50=warm, 80+=hot",
          },
          status: {
            type: "string",
            enum: ["new", "contacted", "qualified", "converted", "lost"],
            description: "Updated lead status",
          },
          reasoning: {
            type: "string",
            description: "Why this score/status (for owner's reference)",
          },
        },
        required: ["score", "status", "reasoning"],
      },
    },
  },
];
