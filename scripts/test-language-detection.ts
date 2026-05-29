import { detectLanguageAndTone } from "../src/lib/ai/prompts/language-detector";

const tests: [string, string][] = [
  ["Price kya hai?", "hinglish/friendly"],
  ["How much does it cost?", "english/friendly"],
  ["bhai appointment booking bhi hoga?", "hinglish/casual"],
  ["Can this work for my salon?", "english/friendly"],
  ["Sir, kindly share the pricing details", "hinglish/formal"],
  ["मुझे प्राइस बताओ", "hindi/friendly"],
  ["urgent hai bhai, jaldi batao", "hinglish/urgent"],
  ["tumhara gym kab khulta hai?", "hinglish/friendly"],
  ["Hello, good morning", "english/formal"],
  ["hey bro whats up", "hinglish/casual"],
  ["haan bilkul chahiye mujhe", "hinglish/friendly"],
  ["কত দাম?", "bengali/friendly"],
  ["আমি জানতে চাই", "bengali/friendly"],
];

console.log("\n🔍 Language & Tone Detection Test Results\n");
console.log("─".repeat(80));

let passed = 0;
let failed = 0;

for (const [message, expected] of tests) {
  const result = detectLanguageAndTone(message);
  const actual = `${result.language}/${result.tone}`;
  const ok = actual === expected;

  if (ok) passed++;
  else failed++;

  const icon = ok ? "✅" : "❌";
  console.log(
    `${icon} "${message}"`.padEnd(55),
    `→ ${actual}`.padEnd(25),
    ok ? "" : `(expected: ${expected})`
  );
}

console.log("─".repeat(80));
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${tests.length} tests`);

if (failed === 0) {
  console.log("✅ All language detection tests passed!\n");
} else {
  console.log("⚠️  Some tests failed — review detection logic\n");
}
