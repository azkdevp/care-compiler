import { describe, expect, it } from "vitest";
import { extractCarePlans } from "@/ai/extract-care-plans";
import { normalizeExtraction } from "@/ai/normalize-extraction";
import { CarePlanExtractionSchema } from "@/ai/schemas";
import { mariaExpectedExtraction } from "@/demo/maria/expected-extraction";
import { compileMariaBaseline } from "@/demo/maria/expected-baseline";
import { mariaSources } from "@/demo/maria/sources";
import { stressTestWeek } from "@/domain/stress-test-week";

describe("Day 2 structured extraction", () => {
  it("validates the expected extraction with the strict Zod schema", () => {
    expect(CarePlanExtractionSchema.parse(mariaExpectedExtraction)).toEqual(
      mariaExpectedExtraction,
    );
  });

  it("rejects unknown fields", () => {
    expect(() =>
      CarePlanExtractionSchema.parse({
        ...mariaExpectedExtraction,
        inventedFeasibilityScore: 100,
      }),
    ).toThrow();
  });

  it("requires evidence on every obligation", () => {
    const invalid = structuredClone(mariaExpectedExtraction);
    invalid.obligations[0].evidence = [];
    expect(() => CarePlanExtractionSchema.parse(invalid)).toThrow();
  });

  it("normalizes fallback extraction to the exact deterministic baseline", () => {
    const normalized = normalizeExtraction(mariaExpectedExtraction);
    const normalizedResult = stressTestWeek(normalized);
    const fixtureResult = compileMariaBaseline();
    expect(normalizedResult.workload).toEqual(fixtureResult.workload);
    expect(normalizedResult.primaryHardFailures).toEqual(
      fixtureResult.primaryHardFailures,
    );
    expect(normalizedResult.warnings).toEqual(fixtureResult.warnings);
  });

  it("applies only deterministic defaults for undocumented hero burden", () => {
    const normalized = normalizeExtraction(mariaExpectedExtraction);
    for (const obligation of normalized.obligations) {
      for (const [name, component] of Object.entries(obligation.burden)) {
        expect(component.basis).not.toBe("gpt_inferred");
        if (name !== "active" || component.basis !== "documented") {
          expect(["documented", "patient_reported", "deterministic_default"]).toContain(
            component.basis,
          );
        }
      }
    }
  });

  it("uses expected extraction when live extraction fails", async () => {
    const result = await extractCarePlans(mariaSources, async () => {
      throw new Error("simulated timeout");
    });
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe("simulated timeout");
    const compiled = stressTestWeek(normalizeExtraction(result.extraction));
    expect(compiled.workload.totalCareLoadMinutes).toBe(1_261);
  });

  it("rejects unsupported obligations during normalization", () => {
    const invalid = structuredClone(mariaExpectedExtraction);
    invalid.obligations[0].sourceKey = "invented_treatment";
    invalid.obligations[0].kind = "lab";
    expect(() => normalizeExtraction(invalid)).toThrow("Unsupported obligation");
  });

  it("rejects scenario eligibility without evidence", () => {
    const invalid = structuredClone(mariaExpectedExtraction);
    invalid.obligations[0].scenarioEligibility.evidence = [];
    expect(() => normalizeExtraction(invalid)).toThrow("lacks evidence");
  });

  it("resolves schema-valid free-form source keys to stable canonical IDs", () => {
    const liveShaped = structuredClone(mariaExpectedExtraction);
    liveShaped.obligations.forEach((obligation, index) => {
      obligation.sourceKey = `extracted_item_${index + 1}`;
    });
    const normalized = normalizeExtraction(liveShaped);
    expect(normalized.obligations.map((item) => item.id)).toEqual(
      mariaExpectedExtraction.obligations.map((item) => item.sourceKey),
    );
    expect(stressTestWeek(normalized).workload.totalCareLoadMinutes).toBe(1_261);
  });

  it("preserves deterministic route defaults when extraction leaves them unknown", () => {
    const liveShaped = structuredClone(mariaExpectedExtraction);
    liveShaped.obligations.forEach((obligation) => {
      if (obligation.sourceKey !== "nephrology_visit") {
        obligation.routeWalkingMinutes = null;
      }
    });
    const normalized = normalizeExtraction(liveShaped);
    expect(
      normalized.obligations.find((item) => item.id === "cardiology_visit")
        ?.routeWalkingMinutes,
    ).toBe(7);
    expect(stressTestWeek(normalized).primaryHardFailures).toHaveLength(7);
  });

  it("rejects evidence text that is not present in its claimed source", () => {
    const invalid = structuredClone(mariaExpectedExtraction);
    invalid.obligations[0].evidence[0].quote = "An invented clinical instruction";
    expect(() => normalizeExtraction(invalid)).toThrow(
      "Evidence quote is not present",
    );
  });

  it("rejects ambiguous free-form keys rather than guessing", () => {
    const invalid = structuredClone(mariaExpectedExtraction);
    const weight = invalid.obligations.find((item) => item.sourceKey === "daily_weight")!;
    weight.sourceKey = "daily_check";
    weight.title = "Daily check";
    weight.evidence = [
      { sourceDocumentId: "cardiology_plan", quote: "allow 10 minutes" },
    ];
    expect(() => normalizeExtraction(invalid)).toThrow("Unsupported obligation");
  });
});
