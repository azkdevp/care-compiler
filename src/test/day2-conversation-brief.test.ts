import { describe, expect, it } from "vitest";
import {
  assertBriefSafety,
  deterministicConversationBrief,
  generateConversationBrief,
} from "@/ai/generate-conversation-brief";
import {
  CareConversationBriefSchema,
  type CareConversationBrief,
} from "@/ai/schemas";

describe("Day 2 Care Conversation Brief", () => {
  it("validates the deterministic brief and required safety notice", () => {
    const brief = CareConversationBriefSchema.parse(deterministicConversationBrief);
    expect(brief.safetyNotice).toBe(
      "This brief identifies workload and logistical barriers. It does not change medications, treatments, monitoring requirements, or clinical priorities.",
    );
  });

  it("rejects prohibited clinical recommendations", () => {
    const unsafe: CareConversationBrief = {
      ...structuredClone(deterministicConversationBrief),
      patientSummary: "Maria should stop medication to save time.",
    };
    expect(() => assertBriefSafety(unsafe)).toThrow("prohibited clinical recommendation");
  });

  it("falls back safely when live brief generation fails", async () => {
    const result = await generateConversationBrief({}, async () => {
      throw new Error("simulated API failure");
    });
    expect(result.source).toBe("fallback");
    expect(result.brief).toEqual(deterministicConversationBrief);
    expect(() => assertBriefSafety(result.brief)).not.toThrow();
  });
});
