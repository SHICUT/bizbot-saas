/**
 * Response Formatter & Validator
 *
 * Production-grade post-processing layer for AI responses.
 * Every AI reply passes through this BEFORE being sent to WhatsApp.
 *
 * CRITICAL: This formatter PRESERVES \n characters.
 * WhatsApp Cloud API renders \n as line breaks in the chat.
 * No step in this pipeline may collapse newlines into spaces.
 *
 * Problems this solves:
 * - Long ChatGPT-style paragraphs → short, mobile-friendly messages
 * - No spacing/formatting → clean WhatsApp structure with line breaks
 * - Multiple questions → single follow-up question
 * - Marketing language → natural receptionist tone
 * - Repeated information → deduplication
 * - Wrong terminology → business-type vocabulary enforcement
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FormatOptions {
  businessType: string;
  maxWords?: number;
  maxLines?: number;
  maxQuestions?: number;
}

export interface ValidationResult {
  isValid: boolean;
  wordCount: number;
  questionCount: number;
  lineCount: number;
  hasProperSpacing: boolean;
  hasBannedTerms: boolean;
  bannedTermsFound: string[];
  isMobileFriendly: boolean;
  hasNewlines: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_WORDS = 80;
const MAX_QUESTIONS = 1;
const MOBILE_MAX_LINE_LENGTH = 70; // chars — WhatsApp wraps beyond this anyway

// Banned ChatGPT-style phrases (any business type)
const BANNED_PHRASES = [
  "absolutely",
  "great question",
  "i understand your concern",
  "i'd be happy to help",
  "that's a wonderful",
  "certainly",
  "i appreciate your",
  "let me explain",
  "thank you for reaching out",
  "i hope this helps",
  "feel free to ask",
  "don't hesitate to",
  "i'm here to help",
  "is there anything else i can assist",
  "i'd be delighted",
  "it's my pleasure",
  "wonderful question",
  "excellent choice",
  "that's fantastic",
  "no worries at all",
  "sounds great",
  "perfect choice",
  "as a matter of fact",
  "in conclusion",
  "furthermore",
  "moreover",
  "additionally",
  "it is important to note",
  "please note that",
  "i would like to inform you",
  "allow me to",
  "rest assured",
];

// Business-type specific banned terms (cross-contamination prevention)
const BANNED_TERMS_BY_TYPE: Record<string, string[]> = {
  school: [
    "course package", "demo class", "batch timing", "trainer",
    "membership", "weight loss", "workout", "styling",
    "menu", "reservation", "property", "emi option",
    "package", "module", "coaching class",
  ],
  gym: [
    "admission", "principal", "uniform", "student",
    "parent", "section", "transfer certificate",
    "menu", "property", "styling",
  ],
  salon: [
    "admission", "principal", "student", "batch",
    "membership plan", "workout", "property", "emi",
    "menu", "reservation",
  ],
  clinic: [
    "admission", "batch", "demo class", "trainer",
    "membership", "workout", "styling", "menu",
    "property", "emi",
  ],
  restaurant: [
    "admission", "principal", "batch", "demo class",
    "membership", "workout", "property", "emi",
    "student", "uniform",
  ],
  coaching: [
    "principal", "uniform", "transport", "school visit",
    "membership", "workout", "styling", "menu",
    "property", "emi", "reservation",
  ],
  real_estate: [
    "admission", "principal", "batch", "demo class",
    "trainer", "membership", "workout", "styling",
    "menu", "uniform",
  ],
};

// Emoji labels that indicate "this is a structured info line" — must stay on its own line
const EMOJI_LINE_PATTERN = /^[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}✅❌📅📍📚💰🕘⏰🏫🏋️💇🏥🍽️🏠📞📋🎓👨‍🏫🚌👕❓📝✓•●]/u;

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Format and validate an AI response for WhatsApp delivery.
 * This is the MANDATORY post-processing step before sending.
 *
 * GUARANTEES:
 * - Output contains \n for line breaks (WhatsApp renders these)
 * - Structured info fields are on separate lines
 * - Blank lines (\n\n) separate logical sections
 * - Max 80 words, max 1 follow-up question
 *
 * @param rawResponse - Raw LLM output text
 * @param options - Formatting options (businessType required)
 * @returns Formatted, validated response ready for WhatsApp
 */
export function formatResponse(rawResponse: string, options: FormatOptions): string {
  if (!rawResponse || !rawResponse.trim()) return "";

  const maxWords = options.maxWords || MAX_WORDS;

  let text = rawResponse.trim();

  // Step 1: Remove AI artifacts and meta-text
  text = removeArtifacts(text);

  // Step 2: Remove banned ChatGPT phrases
  text = removeBannedPhrases(text);

  // Step 3: Enforce business vocabulary (remove cross-contamination)
  text = enforceBusinessVocabulary(text, options.businessType);

  // Step 4: Structural formatting — ensure proper line breaks
  text = formatStructure(text);

  // Step 5: Trim to word limit (preserving line structure)
  text = trimToWordLimit(text, maxWords);

  // Step 6: Limit to one follow-up question
  text = limitQuestions(text);

  // Step 7: Final cleanup — normalize spacing, preserve \n
  text = finalCleanup(text);

  return text;
}

/**
 * Validate a response without modifying it.
 * Use for monitoring/logging quality metrics.
 */
export function validateResponse(text: string, businessType: string): ValidationResult {
  const words = text.split(/\s+/).filter(Boolean);
  const questions = (text.match(/\?/g) || []).length;
  const lines = text.split("\n");
  const contentLines = lines.filter((l) => l.trim());
  const longestLine = Math.max(...contentLines.map((l) => l.length), 0);
  const bannedFound = findBannedTerms(text, businessType);

  return {
    isValid: words.length <= MAX_WORDS && questions <= MAX_QUESTIONS && bannedFound.length === 0,
    wordCount: words.length,
    questionCount: questions,
    lineCount: contentLines.length,
    hasProperSpacing: text.includes("\n"),
    hasBannedTerms: bannedFound.length > 0,
    bannedTermsFound: bannedFound,
    isMobileFriendly: longestLine <= MOBILE_MAX_LINE_LENGTH + 20,
    hasNewlines: text.includes("\n"),
  };
}

// ─── Step 1: Remove AI Artifacts ────────────────────────────────────────────

function removeArtifacts(text: string): string {
  // Remove thinking/reasoning markers (only at start of message)
  text = text.replace(/^(Here's|Here is|Sure,|Of course,|Let me)\s*/i, "");

  // Remove "As a/an [role]" prefixes
  text = text.replace(/^As (a|an|your|the)\s+[\w\s]+,\s*/i, "");

  // Remove trailing disclaimers
  text = text.replace(/\n*(Please note|Note:|Disclaimer:|P\.S\.|N\.B\.)[\s\S]*$/i, "");

  // Remove "Hope this helps!" type endings
  text = text.replace(/\n*(Hope this helps|I hope|Happy to help|Looking forward)[\s\S]*$/i, "");

  // Remove labels like "Response:" or "Reply:"
  text = text.replace(/^(Response|Reply|Answer|Message):\s*/i, "");

  return text.trim();
}

// ─── Step 2: Remove Banned Phrases ──────────────────────────────────────────

function removeBannedPhrases(text: string): string {
  let result = text;

  for (const phrase of BANNED_PHRASES) {
    // Case-insensitive removal — only remove the phrase itself, keep surrounding structure
    const regex = new RegExp(`\\b${escapeRegex(phrase)}[!.,]*\\s*`, "gi");
    result = result.replace(regex, "");
  }

  // Clean up: collapse multiple spaces on the SAME line (never touch \n)
  result = result.replace(/[^\S\n]{2,}/g, " ");

  // Collapse 3+ consecutive newlines to 2 (preserve blank line separators)
  result = result.replace(/\n{3,}/g, "\n\n");

  return result.trim();
}

// ─── Step 3: Business Vocabulary Enforcement ────────────────────────────────

function enforceBusinessVocabulary(text: string, businessType: string): string {
  const banned = BANNED_TERMS_BY_TYPE[businessType] || [];
  if (banned.length === 0) return text;

  let result = text;

  for (const term of banned) {
    const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, "gi");
    result = result.replace(regex, "");
  }

  // Clean up: collapse multiple spaces on the SAME line only (preserve \n)
  result = result.replace(/[^\S\n]{2,}/g, " ");

  // Remove lines that are now empty (only whitespace after term removal)
  result = result.split("\n").map((line) => line.trim()).filter((line, i, arr) => {
    // Keep blank lines that serve as separators (between non-blank lines)
    if (line === "") {
      const prev = arr[i - 1];
      const next = arr[i + 1];
      return prev && prev !== "" && next && next !== "";
    }
    return true;
  }).join("\n");

  return result.trim();
}

// ─── Step 4: Structural Formatting ──────────────────────────────────────────

function formatStructure(text: string): string {
  const lines = text.split("\n");
  const formatted: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Preserve blank lines as section separators
    if (trimmed === "") {
      formatted.push("");
      continue;
    }

    // Convert dash/hyphen lists to bullet points
    const bulletLine = trimmed.replace(/^[-–—]\s*/, "• ");

    // If line is a long paragraph (>120 chars, no emoji prefix, not a list item)
    if (bulletLine.length > 120 && !EMOJI_LINE_PATTERN.test(bulletLine) && !bulletLine.startsWith("•")) {
      // Split at sentence boundaries
      const sentences = bulletLine.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 1) {
        for (const sentence of sentences) {
          formatted.push(sentence.trim());
        }
      } else {
        formatted.push(bulletLine);
      }
    } else {
      formatted.push(bulletLine);
    }
  }

  // Now ensure logical section spacing:
  // If we have emoji-prefixed lines without blank lines between sections, insert them
  const result: string[] = [];
  for (let i = 0; i < formatted.length; i++) {
    const line = formatted[i];
    const prevLine = result[result.length - 1];

    // Insert a blank line before a question if there isn't one already
    if (line.includes("?") && prevLine && prevLine !== "" && !prevLine.includes("?")) {
      result.push("");
    }

    result.push(line);
  }

  return result.join("\n");
}

// ─── Step 5: Word Limit Enforcement ─────────────────────────────────────────

function trimToWordLimit(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;

  // Cut at line boundaries to preserve structure
  const lines = text.split("\n");
  let wordCount = 0;
  const keptLines: string[] = [];

  for (const line of lines) {
    const lineWords = line.split(/\s+/).filter(Boolean).length;

    // Blank lines don't contribute words
    if (line.trim() === "") {
      if (keptLines.length > 0) keptLines.push(line);
      continue;
    }

    if (wordCount + lineWords > maxWords && keptLines.length > 0) {
      break;
    }

    // If this single line itself exceeds the limit, hard-cut it
    if (wordCount + lineWords > maxWords && keptLines.length === 0) {
      const lineWordsArr = line.split(/\s+/);
      keptLines.push(lineWordsArr.slice(0, maxWords).join(" "));
      wordCount = maxWords;
      break;
    }

    keptLines.push(line);
    wordCount += lineWords;
  }

  let result = keptLines.join("\n");

  // Remove trailing blank lines
  result = result.replace(/\n+$/, "");

  // Try to end at a sentence boundary for cleaner cut
  const totalWords = result.split(/\s+/).filter(Boolean).length;
  if (totalWords > maxWords) {
    const allWords = result.split(/\s+/);
    result = allWords.slice(0, maxWords).join(" ");

    const lastPeriod = result.lastIndexOf(".");
    const lastQuestion = result.lastIndexOf("?");
    const lastExcl = result.lastIndexOf("!");
    const cutPoint = Math.max(lastPeriod, lastQuestion, lastExcl);

    if (cutPoint > result.length * 0.5) {
      result = result.substring(0, cutPoint + 1);
    }
  }

  return result;
}

// ─── Step 6: Limit Questions ────────────────────────────────────────────────

function limitQuestions(text: string): string {
  const lines = text.split("\n");
  let questionCount = 0;
  const result: string[] = [];

  for (const line of lines) {
    if (line.includes("?")) {
      questionCount++;
      if (questionCount > MAX_QUESTIONS) {
        // Drop the extra question line entirely
        continue;
      }
    }
    result.push(line);
  }

  return result.join("\n");
}

// ─── Step 7: Final Cleanup ──────────────────────────────────────────────────

function finalCleanup(text: string): string {
  // Normalize: trim each line but PRESERVE the \n characters
  const lines = text.split("\n").map((l) => l.trim());

  // Remove leading blank lines
  while (lines.length > 0 && lines[0] === "") lines.shift();

  // Remove trailing blank lines
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

  // Collapse 3+ consecutive blank lines into exactly 1 blank line
  const final: string[] = [];
  let consecutiveBlanks = 0;

  for (const line of lines) {
    if (line === "") {
      consecutiveBlanks++;
      if (consecutiveBlanks <= 1) {
        final.push(line);
      }
    } else {
      consecutiveBlanks = 0;
      final.push(line);
    }
  }

  // Wrap any single line exceeding mobile width (but only non-structured lines)
  const wrapped: string[] = [];
  for (const line of final) {
    if (line.length > MOBILE_MAX_LINE_LENGTH && !EMOJI_LINE_PATTERN.test(line) && !line.startsWith("•")) {
      // Soft wrap at word boundary
      const words = line.split(" ");
      let current = "";
      for (const word of words) {
        if (current && (current + " " + word).length > MOBILE_MAX_LINE_LENGTH) {
          wrapped.push(current);
          current = word;
        } else {
          current += (current ? " " : "") + word;
        }
      }
      if (current) wrapped.push(current);
    } else {
      wrapped.push(line);
    }
  }

  return wrapped.join("\n");
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function findBannedTerms(text: string, businessType: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();

  const banned = BANNED_TERMS_BY_TYPE[businessType] || [];
  for (const term of banned) {
    if (lower.includes(term.toLowerCase())) {
      found.push(term);
    }
  }

  return found;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
