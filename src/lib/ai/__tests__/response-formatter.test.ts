/**
 * Response Formatter Tests
 *
 * Verifies that:
 * 1. Line breaks (\n) are preserved through the formatter
 * 2. Blank lines (\n\n) separate logical sections
 * 3. Emoji-prefixed info fields stay on their own line
 * 4. Bullet points start on new lines
 * 5. No step collapses newlines into spaces
 * 6. Word limit doesn't destroy structure
 * 7. Banned phrases are removed without breaking layout
 * 8. WhatsApp API payload preserves formatting
 */

/// <reference types="vitest/globals" />

import { formatResponse, validateResponse } from "../response-formatter";

// ─── Core: Newline Preservation ─────────────────────────────────────────────

describe("Response Formatter — Newline Preservation", () => {
  it("preserves \\n characters in structured responses", () => {
    const input = "🏫 Rajat Public School\n📍 Dwarka, New Delhi\n📚 Classes: Nursery to XII\n🎓 Admissions: Open\n\nHow can I help you?";
    const output = formatResponse(input, { businessType: "school" });

    expect(output).toContain("\n");
    expect(output.split("\n").length).toBeGreaterThan(3);
  });

  it("keeps emoji-prefixed fields on separate lines", () => {
    const input = "🏫 Rajat Public School\n📍 Dwarka, New Delhi\n📚 Classes: Nursery to XII";
    const output = formatResponse(input, { businessType: "school" });

    const lines = output.split("\n").filter((l) => l.trim());
    expect(lines[0]).toMatch(/^🏫/);
    expect(lines[1]).toMatch(/^📍/);
    expect(lines[2]).toMatch(/^📚/);
  });

  it("preserves blank lines between sections", () => {
    const input = "🏫 Rajat Public School\n📍 Dwarka, New Delhi\n\nHow can I help you?";
    const output = formatResponse(input, { businessType: "school" });

    // Should have a blank line (two consecutive \n)
    expect(output).toContain("\n\n");
  });

  it("bullet points start on new lines", () => {
    const input = "Please share:\n• Student name\n• Class applying for\n• Preferred date";
    const output = formatResponse(input, { businessType: "school" });

    const lines = output.split("\n");
    const bulletLines = lines.filter((l) => l.startsWith("•"));
    expect(bulletLines.length).toBe(3);
  });

  it("does NOT collapse multiple lines into a single paragraph", () => {
    const input = "Hello! 👋\nWelcome to ABC School.\n\nHow can I help you today?";
    const output = formatResponse(input, { businessType: "school" });

    // Must NOT be a single line
    expect(output.split("\n").filter((l) => l.trim()).length).toBeGreaterThan(1);
    // Must NOT have all content on one line
    expect(output).not.toMatch(/^[^\n]+$/);
  });

  it("never produces output with \\n replaced by spaces", () => {
    const input = "📅 Date: Monday\n⏰ Time: 10 AM\n📍 Location: Main Campus";
    const output = formatResponse(input, { businessType: "school" });

    // These should be on separate lines, NOT "📅 Date: Monday ⏰ Time: 10 AM..."
    expect(output).not.toContain("Monday ⏰");
    expect(output).not.toContain("AM 📍");
    expect(output).toContain("Monday\n");
    expect(output).toContain("AM\n");
  });
});

// ─── Structure: Formatting Improvements ─────────────────────────────────────

describe("Response Formatter — Structure", () => {
  it("splits a long paragraph into multiple lines", () => {
    const input = "Our school offers excellent education with state-of-the-art facilities. We have classes from Nursery to Class XII with experienced faculty members. The admission process involves filling out an application form.";
    const output = formatResponse(input, { businessType: "school" });

    // Should be split into multiple lines
    expect(output.split("\n").filter((l) => l.trim()).length).toBeGreaterThan(1);
  });

  it("converts dashes to bullet points", () => {
    const input = "Documents needed:\n- Birth certificate\n- Aadhaar card\n- Report card";
    const output = formatResponse(input, { businessType: "school" });

    expect(output).toContain("• Birth certificate");
    expect(output).toContain("• Aadhaar card");
    expect(output).toContain("• Report card");
  });

  it("adds separator before closing question", () => {
    const input = "📚 We offer Class I to XII.\n💰 Fees: ₹25,000/year\nWould you like to visit?";
    const output = formatResponse(input, { businessType: "school" });

    // There should be a blank line before the question
    const questionIndex = output.indexOf("Would you like");
    const beforeQuestion = output.substring(0, questionIndex);
    expect(beforeQuestion.endsWith("\n\n")).toBe(true);
  });
});

// ─── Content: Banned Phrases & Vocabulary ───────────────────────────────────

describe("Response Formatter — Content Filtering", () => {
  it("removes ChatGPT-style phrases without breaking lines", () => {
    const input = "Absolutely! 🏫 Rajat Public School\n📍 Dwarka, New Delhi\n\nI'd be happy to help you with admissions!";
    const output = formatResponse(input, { businessType: "school" });

    expect(output).not.toMatch(/absolutely/i);
    expect(output).not.toMatch(/i'd be happy to help/i);
    // Structure should still have newlines
    expect(output).toContain("\n");
    expect(output).toContain("📍");
  });

  it("removes banned cross-business terms for school", () => {
    const input = "🏫 Our school\n📚 We offer demo class for parents\n💰 Membership: ₹5000";
    const output = formatResponse(input, { businessType: "school" });

    expect(output.toLowerCase()).not.toContain("demo class");
    expect(output.toLowerCase()).not.toContain("membership");
  });

  it("preserves line structure after term removal", () => {
    const input = "🏫 ABC School\n📍 Delhi\n📚 Coaching class available\n\nVisit us!";
    const output = formatResponse(input, { businessType: "school" });

    // Even after removing "coaching class", lines should remain separated
    expect(output).toContain("\n");
    expect(output).toContain("ABC School");
    expect(output).toContain("Delhi");
  });
});

// ─── Limits: Word Count & Questions ─────────────────────────────────────────

describe("Response Formatter — Limits", () => {
  it("respects 80-word maximum", () => {
    const longInput = Array(100).fill("word").join(" ") + "\n\nQuestion?";
    const output = formatResponse(longInput, { businessType: "other" });

    const wordCount = output.split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBeLessThanOrEqual(80);
  });

  it("keeps only 1 question", () => {
    const input = "We have multiple options.\nWhat class are you interested in?\nWhen would you like to visit?\nDo you need transport info?";
    const output = formatResponse(input, { businessType: "school" });

    const questionCount = (output.match(/\?/g) || []).length;
    expect(questionCount).toBeLessThanOrEqual(1);
  });

  it("preserves structure when trimming to word limit", () => {
    const input = "🏫 ABC School\n📍 Delhi\n📚 Classes: Nursery to XII\n💰 Fees: ₹25,000/year\n🕘 Timings: 8 AM – 2 PM\n\nWould you like to schedule a visit?";
    const output = formatResponse(input, { businessType: "school", maxWords: 30 });

    // Even after trimming, should still have newlines
    expect(output).toContain("\n");
    expect(output.split("\n").filter((l) => l.trim()).length).toBeGreaterThan(1);
  });
});

// ─── Validation Function ────────────────────────────────────────────────────

describe("Response Formatter — Validation", () => {
  it("reports hasNewlines correctly", () => {
    const withNewlines = "Hello!\n\nHow can I help?";
    const withoutNewlines = "Hello! How can I help?";

    expect(validateResponse(withNewlines, "school").hasNewlines).toBe(true);
    expect(validateResponse(withoutNewlines, "school").hasNewlines).toBe(false);
  });

  it("detects banned terms", () => {
    const result = validateResponse("We offer demo class for new students", "school");
    expect(result.hasBannedTerms).toBe(true);
    expect(result.bannedTermsFound).toContain("demo class");
  });

  it("validates word count", () => {
    const short = "Hello!\n📍 Delhi\n\nVisit us?";
    const result = validateResponse(short, "school");
    expect(result.wordCount).toBeLessThan(10);
    expect(result.isValid).toBe(true);
  });
});

// ─── WhatsApp API Payload Simulation ────────────────────────────────────────

describe("Response Formatter — WhatsApp API Integration", () => {
  it("output survives JSON.stringify for WhatsApp API", () => {
    const input = "🏫 Rajat Public School\n📍 Dwarka, New Delhi\n\n📚 Classes: Nursery to XII\n🎓 Admissions: Open\n\nHow can I help you?";
    const formatted = formatResponse(input, { businessType: "school" });

    // Simulate WhatsApp API payload construction
    const payload = {
      messaging_product: "whatsapp",
      to: "919876543210",
      type: "text",
      text: { body: formatted },
    };

    const json = JSON.stringify(payload);
    const parsed = JSON.parse(json);

    // The body field should STILL contain \n characters after JSON round-trip
    expect(parsed.text.body).toContain("\n");
    expect(parsed.text.body).toEqual(formatted);

    // Verify the JSON contains escaped newlines (\\n) which is correct
    expect(json).toContain("\\n");
  });

  it("sendTextMessage payload has line breaks in body", () => {
    const formatted = "Hello! 👋\nWelcome to our school.\n\nHow can I help?";

    // Simulate what WhatsAppClient.sendTextMessage does
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "919876543210",
      type: "text",
      text: { preview_url: true, body: formatted },
    };

    // After JSON.stringify → JSON.parse (network round-trip), body is intact
    const serialized = JSON.stringify(payload);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.text.body).toBe(formatted);
    expect(deserialized.text.body.split("\n").length).toBe(4); // 3 line breaks = 4 segments
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────────────

describe("Response Formatter — Edge Cases", () => {
  it("handles empty input", () => {
    expect(formatResponse("", { businessType: "school" })).toBe("");
    expect(formatResponse("   ", { businessType: "school" })).toBe("");
  });

  it("handles single-line short response", () => {
    const input = "Fees are ₹25,000 per year.";
    const output = formatResponse(input, { businessType: "school" });
    expect(output).toBe("Fees are ₹25,000 per year.");
  });

  it("handles already well-formatted input", () => {
    const input = "🏫 ABC School\n📍 Delhi\n\nVisit us anytime!";
    const output = formatResponse(input, { businessType: "school" });

    // Should not mangle already-good formatting
    expect(output).toContain("🏫 ABC School");
    expect(output).toContain("\n");
    expect(output).toContain("📍 Delhi");
  });

  it("does not add extra blank lines to already-spaced content", () => {
    const input = "Hello!\n\nWe're open.\n\nVisit?";
    const output = formatResponse(input, { businessType: "school" });

    // Should not have more than 2 consecutive \n (one blank line)
    expect(output).not.toMatch(/\n{3,}/);
  });
});
