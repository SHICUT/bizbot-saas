/**
 * Multi-Provider AI Client
 *
 * Priority: Groq → Gemini → OpenAI → Fallback
 * Groq is primary (fast, high quota). Gemini is backup.
 */

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const AI_TIMEOUT_MS = 8000; // 8 second timeout for AI calls

export interface AIResponse {
  text: string;
  tokensUsed: number;
  provider: string;
}

/**
 * Call AI with automatic fallback: Groq → Gemini → OpenAI → Fallback
 */
export async function callAI(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
): Promise<AIResponse> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Try Groq FIRST (primary provider — fast, reliable)
  if (groqKey) {
    try {
      console.log("[AI] Using Groq (primary)");
      const result = await callGroq(groqKey, systemPrompt, messages, userMessage);
      console.log("[AI] ✓ Groq Success");
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      console.warn("[AI] ❌ Groq Failed:", msg, "→ switching to Gemini");
    }
  }

  // Fallback: Gemini
  if (geminiKey) {
    try {
      console.log("[AI] Using Gemini (fallback)");
      const result = await callGemini(geminiKey, systemPrompt, messages, userMessage);
      console.log("[AI] ✓ Gemini Success");
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      console.warn("[AI] ❌ Gemini Failed:", msg, "→ switching to OpenAI");
    }
  }

  // Fallback: OpenAI
  if (openaiKey) {
    try {
      console.log("[AI] Using OpenAI (fallback)");
      const result = await callOpenAI(openaiKey, systemPrompt, messages, userMessage);
      console.log("[AI] ✓ OpenAI Success");
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      console.error("[AI] ❌ OpenAI Failed:", msg);
    }
  }

  // Final fallback: return a generic helpful reply
  console.error("[AI] ❌ ALL PROVIDERS FAILED — using static fallback");
  return {
    text: "Thanks for your message! I'm having a brief technical issue. Please try again in a moment, or contact us directly for immediate assistance.",
    tokensUsed: 0,
    provider: "fallback",
  };
}

// ─── Gemini ─────────────────────────────────────────────────────────────────

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
): Promise<AIResponse> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 250 },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini ${res.status}`);
  }

  const data = await res.json();
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "",
    tokensUsed: data.usageMetadata?.totalTokenCount || 0,
    provider: "gemini",
  };
}

// ─── Groq ───────────────────────────────────────────────────────────────────

async function callGroq(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
): Promise<AIResponse> {
  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...messages,
    { role: "user", content: userMessage },
  ];

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: chatMessages,
      max_tokens: 250,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq ${res.status}`);
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content?.trim() || "",
    tokensUsed: data.usage?.total_tokens || 0,
    provider: "groq",
  };
}

// ─── OpenAI ─────────────────────────────────────────────────────────────────

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
): Promise<AIResponse> {
  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...messages,
    { role: "user", content: userMessage },
  ];

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: chatMessages,
      max_tokens: 250,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI ${res.status}`);
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content?.trim() || "",
    tokensUsed: data.usage?.total_tokens || 0,
    provider: "openai",
  };
}
