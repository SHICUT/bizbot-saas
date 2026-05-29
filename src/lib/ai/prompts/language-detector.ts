/**
 * Language & Tone Detection
 *
 * Detects the language, script, and communication style of incoming messages.
 * Used to dynamically adapt AI responses to match the customer's style.
 *
 * Supported languages:
 * - English
 * - Hindi (Devanagari)
 * - Hinglish (Hindi in Roman script mixed with English)
 * - Marathi
 * - Bengali
 * - Tamil
 * - Telugu
 * - Mixed (multiple languages in one message)
 */

export type DetectedLanguage =
  | "english"
  | "hindi"
  | "hinglish"
  | "marathi"
  | "bengali"
  | "tamil"
  | "telugu"
  | "mixed";

export type DetectedTone = "formal" | "casual" | "friendly" | "urgent";

export interface LanguageDetectionResult {
  language: DetectedLanguage;
  tone: DetectedTone;
  confidence: number; // 0-1
  shouldUseEmojis: boolean;
  script: "latin" | "devanagari" | "bengali" | "tamil" | "telugu" | "mixed";
}

/**
 * Detect language and tone from a message.
 * Uses pattern matching for speed (no API call needed).
 */
export function detectLanguageAndTone(message: string): LanguageDetectionResult {
  const trimmed = message.trim();
  const language = detectLanguage(trimmed);
  const tone = detectTone(trimmed);
  const script = detectScript(trimmed);
  const shouldUseEmojis = detectEmojiUsage(trimmed, tone);

  return {
    language,
    tone,
    confidence: calculateConfidence(trimmed, language),
    shouldUseEmojis,
    script,
  };
}

// ─── Language Detection ─────────────────────────────────────────────────────

function detectLanguage(message: string): DetectedLanguage {
  const hasDevanagari = /[\u0900-\u097F]/.test(message);
  const hasBengali = /[\u0980-\u09FF]/.test(message);
  const hasTamil = /[\u0B80-\u0BFF]/.test(message);
  const hasTelugu = /[\u0C00-\u0C7F]/.test(message);
  const hasLatin = /[a-zA-Z]/.test(message);

  // Pure script detection
  if (hasTamil && !hasLatin) return "tamil";
  if (hasTelugu && !hasLatin) return "telugu";
  if (hasBengali && !hasLatin) return "bengali";

  // Devanagari-based
  if (hasDevanagari && !hasLatin) return "hindi";
  if (hasDevanagari && hasLatin) return "mixed";

  // Marathi detection (Devanagari + Marathi-specific words)
  if (hasDevanagari) {
    const marathiMarkers = /(?:आहे|नाही|काय|कसे|मला|तुम्ही|होय|करा)/;
    if (marathiMarkers.test(message)) return "marathi";
    return "hindi";
  }

  // Latin script — distinguish English from Hinglish
  if (hasLatin) {
    return detectHinglish(message);
  }

  return "english";
}

/**
 * Detect if a Latin-script message is English or Hinglish.
 * Hinglish = Hindi words written in Roman script, mixed with English.
 */
function detectHinglish(message: string): "english" | "hinglish" {
  const lower = message.toLowerCase();

  // Common Hinglish words/patterns
  const hinglishMarkers = [
    // Pronouns & common words
    /\b(mujhe|mera|meri|mere|tumhara|tumhari|humara|hamara|aapka|aapki)\b/,
    /\b(kya|kaise|kab|kahan|kaun|kitna|kitne|kitni|kyun|kyu)\b/,
    /\b(hai|hain|tha|thi|the|hoga|hogi|hoge)\b/,
    /\b(nahi|nhi|nahin|mat|na)\b/,
    /\b(acha|accha|achha|theek|thik|sahi)\b/,
    /\b(bhai|bro|yaar|dost|sir|ji|sahab)\b/,
    /\b(chahiye|chahte|chahti|chaiye)\b/,
    /\b(karna|karo|kijiye|karenge|karunga|karungi)\b/,
    /\b(batao|bataye|bataiye|batana)\b/,
    /\b(milega|milegi|milenge|dedo|dena|dijiye)\b/,
    /\b(abhi|kal|aaj|parso|subah|shaam|raat)\b/,
    /\b(paisa|paise|rupee|rupaye)\b/,
    /\b(aur|ya|lekin|par|toh|bhi|sirf)\b/,
    /\b(haan|han|ji|bilkul|zaroor)\b/,
    /\b(dekho|dekhiye|suno|suniye)\b/,
    /\b(wala|wali|wale)\b/,
    /\b(bahut|bohot|zyada|kam|thoda)\b/,
  ];

  let hinglishScore = 0;
  for (const pattern of hinglishMarkers) {
    if (pattern.test(lower)) {
      hinglishScore++;
    }
  }

  // If 2+ Hinglish markers found, it's Hinglish
  if (hinglishScore >= 2) return "hinglish";

  // Single marker with short message — likely Hinglish
  if (hinglishScore >= 1 && message.split(" ").length <= 8) return "hinglish";

  return "english";
}

// ─── Tone Detection ─────────────────────────────────────────────────────────

function detectTone(message: string): DetectedTone {
  const lower = message.toLowerCase();

  // Urgent indicators
  const urgentPatterns = /\b(urgent|asap|jaldi|turant|abhi|immediately|emergency)\b|!{2,}/i;
  if (urgentPatterns.test(lower)) return "urgent";

  // Formal indicators
  const formalPatterns = /\b(sir|madam|ma'am|respected|kindly|please|kripya|aapka|aapki|ji$)\b/i;
  const formalStructure = /^(dear|hello|good\s*(morning|afternoon|evening)|namaste)\b/i;
  if (formalPatterns.test(lower) || formalStructure.test(lower)) return "formal";

  // Casual/friendly indicators
  const casualPatterns = /\b(bhai|bro|yaar|dude|hey|yo|sup|dost)\b/i;
  const friendlyEmojis = /[😊😄😁🙂👋🤗❤️💪🔥]/;
  if (casualPatterns.test(lower)) return "casual";
  if (friendlyEmojis.test(message)) return "friendly";

  // Default: friendly (WhatsApp conversations are generally informal)
  return "friendly";
}

// ─── Script Detection ───────────────────────────────────────────────────────

function detectScript(message: string): "latin" | "devanagari" | "bengali" | "tamil" | "telugu" | "mixed" {
  const hasDevanagari = /[\u0900-\u097F]/.test(message);
  const hasBengali = /[\u0980-\u09FF]/.test(message);
  const hasTamil = /[\u0B80-\u0BFF]/.test(message);
  const hasTelugu = /[\u0C00-\u0C7F]/.test(message);
  const hasLatin = /[a-zA-Z]/.test(message);

  const scripts = [hasDevanagari, hasBengali, hasTamil, hasTelugu, hasLatin].filter(Boolean).length;
  if (scripts > 1) return "mixed";

  if (hasTamil) return "tamil";
  if (hasTelugu) return "telugu";
  if (hasBengali) return "bengali";
  if (hasDevanagari) return "devanagari";
  return "latin";
}

// ─── Emoji Usage Detection ──────────────────────────────────────────────────

function detectEmojiUsage(message: string, tone: DetectedTone): boolean {
  // If user uses emojis, mirror that
  const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(message);
  if (hasEmoji) return true;

  // Formal tone = no emojis
  if (tone === "formal") return false;

  // Casual/friendly = light emojis ok
  return tone === "casual" || tone === "friendly";
}

// ─── Confidence Calculation ─────────────────────────────────────────────────

function calculateConfidence(message: string, language: DetectedLanguage): number {
  const wordCount = message.split(/\s+/).length;

  // Very short messages = lower confidence
  if (wordCount <= 2) return 0.6;

  // Script-based detection is high confidence
  if (["hindi", "tamil", "telugu", "bengali", "marathi"].includes(language)) return 0.95;

  // Hinglish detection depends on marker count
  if (language === "hinglish") return 0.85;

  // English is default fallback
  return 0.8;
}
