import { describe, it, expect } from "vitest";
import { generateMockExplanation } from "../../src/services/ai/providers/mockExplainProvider.js";

describe("generateMockExplanation", () => {
  it("returns identical structured output for the same question block", () => {
    const row = {
      prompt: "Which option is correct under Article 14?",
      option_a: "Alpha",
      option_b: "Bravo",
      option_c: "Charlie",
      option_d: "Delta",
      correct_option: "B",
    };
    const block = `STEM:\n${row.prompt}\nOPTS...`;
    const a = generateMockExplanation(row, block);
    const b = generateMockExplanation(row, block);
    expect(a).toEqual(b);
    expect(a.answer).toContain("B");
    expect(a.explanation.length).toBeGreaterThan(20);
    expect(a.concept.length).toBeGreaterThan(5);
    expect(a.example.length).toBeGreaterThan(10);
  });

  it("varies output when the question block changes", () => {
    const row = {
      prompt: "Q1",
      option_a: "1",
      option_b: "2",
      option_c: "3",
      option_d: "4",
      correct_option: "A",
    };
    const x = generateMockExplanation(row, "block-one");
    const y = generateMockExplanation(row, "block-two");
    expect(x.explanation).not.toBe(y.explanation);
  });
});
