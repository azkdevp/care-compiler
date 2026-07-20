import { describe, expect, it } from "vitest";
import { CarePlanExtractionSchema } from "@/ai/schemas";
import { normalizeExtraction } from "@/ai/normalize-extraction";
import { parseSourceBackedDateTime } from "@/ai/temporal-grounding";
import { mariaExpectedExtraction } from "@/demo/maria/expected-extraction";
import { expandAllRecurrences, expandRecurrence } from "@/domain/expand-recurrence";
import { stressTestWeek } from "@/domain/stress-test-week";

const clone = () => structuredClone(mariaExpectedExtraction);

describe("temporal grounding and duration scope", () => {
  it("rejects an invented 07:00 clock time for a qualitative morning instruction", () => {
    const extraction = clone();
    const weight = extraction.obligations.find((item) => item.sourceKey === "daily_weight")!;
    if (weight.recurrence.type !== "daily") throw new Error("Unexpected fixture recurrence.");
    weight.recurrence.temporalWindows[0].rawTimePhrase = "07:00";
    expect(() => normalizeExtraction(extraction)).toThrow(
      'Temporal phrase "07:00" is not present',
    );
  });

  it("rejects an invented 19:00 clock time for an evening instruction", () => {
    const extraction = clone();
    const medication = extraction.obligations.find(
      (item) => item.sourceKey === "medication_routine",
    )!;
    if (medication.recurrence.type !== "daily") throw new Error("Unexpected fixture recurrence.");
    medication.recurrence.temporalWindows[1].rawTimePhrase = "19:00";
    expect(() => normalizeExtraction(extraction)).toThrow(
      'Temporal phrase "19:00" is not present',
    );
  });

  it("rejects the legacy model-normalized malformed ISO field even with valid evidence", () => {
    const extraction = clone() as unknown as Record<string, unknown>;
    const obligations = extraction.obligations as Array<Record<string, unknown>>;
    const recurrence = obligations[0].recurrence as Record<string, unknown>;
    recurrence.scheduledAt = "0720-10-07T10:00:00-04:00";
    expect(() => CarePlanExtractionSchema.parse(extraction)).toThrow();
  });

  it("deterministically parses an explicit source-backed appointment date and time", () => {
    expect(parseSourceBackedDateTime(
      {
        rawDatePhrase: "Monday, July 20",
        rawTimePhrase: "10:00 AM",
        qualitativeTimeLabels: [],
        evidence: {
          sourceDocumentId: "cardiology_plan",
          quote: "Monday, July 20 at 10:00 AM",
        },
      },
      "2026-07-20T10:00:00-05:00",
      "America/Chicago",
    )).toBe("2026-07-20T10:00:00-05:00");
  });

  it("keeps morning qualitative and labels its simulator placement as a default", () => {
    const weight = normalizeExtraction(clone()).obligations.find(
      (item) => item.id === "daily_weight",
    )!;
    expect(weight.recurrence.qualitativeTimeLabels).toEqual([
      "morning",
      "before_breakfast",
    ]);
    expect(weight.recurrence.scheduleBasis).toBe("deterministic_default");
    expect(weight.recurrence.timesOfDay).toEqual(["06:30"]);
  });

  it("compiles morning and evening with eight combined daily minutes as eight minutes per day", () => {
    const medication = normalizeExtraction(clone()).obligations.find(
      (item) => item.id === "medication_routine",
    )!;
    expect(medication.burden.active.durationScope).toBe("combined_per_day");
    expect(medication.recurrence.clinicalOccurrencesInHorizon).toBe(14);
    expect(medication.recurrence.qualitativeTimeLabels).toEqual(["morning", "evening"]);
    expect(expandRecurrence(medication)).toHaveLength(7);
    expect(expandRecurrence(medication).reduce((sum, item) => sum + item.visibleMinutes, 0))
      .toBe(56);
  });

  it("does not invent a four-minute morning/evening duration split", () => {
    const medication = normalizeExtraction(clone()).obligations.find(
      (item) => item.id === "medication_routine",
    )!;
    expect(medication.burden.active.minutesPerOccurrence).toBe(8);
    expect(expandRecurrence(medication).every((item) => item.visibleMinutes === 8)).toBe(true);
  });

  it("keeps a true twice-daily per-occurrence duration at fourteen workload occurrences", () => {
    const glucose = normalizeExtraction(clone()).obligations.find(
      (item) => item.id === "glucose_checks",
    )!;
    expect(glucose.burden.active.durationScope).toBe("per_occurrence");
    expect(expandRecurrence(glucose)).toHaveLength(14);
  });

  it("preserves Maria's 58 occurrences and exact golden workload", () => {
    const normalized = normalizeExtraction(clone());
    expect(expandAllRecurrences(normalized.obligations)).toHaveLength(58);
    const result = stressTestWeek(normalized);
    expect(result.workload).toMatchObject({
      visibleMedicalWorkMinutes: 691,
      invisibleCareWorkMinutes: 570,
      totalCareLoadMinutes: 1_261,
      capacityMinutes: 420,
      overloadMinutes: 841,
      trips: 6,
    });
    expect(result.primaryHardFailures).toHaveLength(7);
    expect(result.warnings).toHaveLength(2);
  });
});
