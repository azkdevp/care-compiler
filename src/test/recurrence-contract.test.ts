import { describe, expect, it } from "vitest";
import { normalizeExtraction } from "@/ai/normalize-extraction";
import { mariaExpectedExtraction } from "@/demo/maria/expected-extraction";
import { compileMariaBaseline } from "@/demo/maria/expected-baseline";
import { expandAllRecurrences, expandRecurrence } from "@/domain/expand-recurrence";
import { stressTestWeek } from "@/domain/stress-test-week";

function normalizedMaria() {
  return normalizeExtraction(structuredClone(mariaExpectedExtraction));
}

describe("executable recurrence contracts", () => {
  it("does not silently compile a daily obligation with empty extracted times to zero", () => {
    const extractedWeight = mariaExpectedExtraction.obligations.find(
      (item) => item.sourceKey === "daily_weight",
    )!;
    expect(extractedWeight.recurrence).toEqual({
      type: "daily",
      occurrencesPerDay: 1,
      temporalWindows: [
        expect.objectContaining({
          rawTimePhrase: null,
          qualitativeTimeLabels: ["morning", "before_breakfast"],
        }),
      ],
    });

    const weight = normalizedMaria().obligations.find(
      (item) => item.id === "daily_weight",
    )!;
    expect(weight.recurrence.scheduleBasis).toBe("deterministic_default");
    expect(expandRecurrence(weight)).toHaveLength(7);
  });

  it("expands a source-backed twice-daily obligation into fourteen occurrences", () => {
    const glucose = normalizedMaria().obligations.find(
      (item) => item.id === "glucose_checks",
    )!;
    expect(glucose.recurrence.occurrencesInHorizon).toBe(14);
    expect(expandRecurrence(glucose)).toHaveLength(14);
  });

  it("expands a source-backed three-times-weekly obligation into three occurrences", () => {
    const walking = normalizedMaria().obligations.find(
      (item) => item.id === "walking_sessions",
    )!;
    expect(walking.recurrence.occurrencesInHorizon).toBe(3);
    expect(expandRecurrence(walking)).toHaveLength(3);
  });

  it("executes a one-time appointment at its source-backed date and time", () => {
    const cardiology = normalizedMaria().obligations.find(
      (item) => item.id === "cardiology_visit",
    )!;
    expect(cardiology.recurrence.scheduleBasis).toBe("source_explicit");
    expect(expandRecurrence(cardiology)).toHaveLength(1);
    expect(expandRecurrence(cardiology)[0].start).toBe(
      "2026-07-20T10:00:00-05:00",
    );
  });

  it("executes a required prescription pickup using its deterministic fixture slot", () => {
    const extractedPickup = mariaExpectedExtraction.obligations.find(
      (item) => item.sourceKey === "prescription_pickup",
    )!;
    expect(extractedPickup.recurrence).toEqual({
      type: "one_time",
      temporal: null,
    });

    const pickup = normalizedMaria().obligations.find(
      (item) => item.id === "prescription_pickup",
    )!;
    expect(pickup.recurrence.scheduleBasis).toBe("deterministic_default");
    expect(expandRecurrence(pickup)).toHaveLength(1);
  });

  it("rejects insufficient recurrence rather than silently omitting workload", () => {
    const invalid = structuredClone(mariaExpectedExtraction);
    const weight = invalid.obligations.find(
      (item) => item.sourceKey === "daily_weight",
    )!;
    weight.recurrence = {
      type: "unknown",
      reason: "Frequency could not be established.",
      evidence: weight.evidence[0],
    };
    expect(() => normalizeExtraction(invalid)).toThrow(
      "Unresolved recurrence for daily_weight",
    );
  });

  it("rejects any positive declared recurrence that expands to zero", () => {
    const weight = structuredClone(
      normalizedMaria().obligations.find((item) => item.id === "daily_weight")!,
    );
    weight.recurrence.daysOfWeek = [];
    weight.recurrence.timesOfDay = [];
    expect(() => expandRecurrence(weight)).toThrow(
      "expanded to zero occurrences",
    );
  });

  it("does not label deterministic allocation weekdays or times as source-explicit", () => {
    for (const item of mariaExpectedExtraction.obligations) {
      if (item.recurrence.type === "daily") {
        expect(
          item.recurrence.temporalWindows.every((window) => window.rawTimePhrase === null),
        ).toBe(true);
      } else if (item.recurrence.type === "weekly") {
        expect(item.recurrence.daysOfWeek).toEqual([]);
        expect(item.recurrence.temporalWindows).toEqual([]);
      }
    }
    const recurring = normalizedMaria().obligations.filter(
      (item) => item.recurrence.frequency !== "once",
    );
    expect(recurring.every((item) => item.recurrence.scheduleBasis === "deterministic_default"))
      .toBe(true);
  });

  it("makes all thirteen Maria obligations executable and preserves the golden output", () => {
    const normalized = normalizedMaria();
    const occurrences = expandAllRecurrences(normalized.obligations);
    expect(normalized.obligations).toHaveLength(13);
    expect(new Set(occurrences.map((item) => item.obligationId))).toHaveLength(13);
    expect(occurrences).toHaveLength(58);

    const result = stressTestWeek(normalized);
    const golden = compileMariaBaseline();
    expect(result).toEqual(golden);
    expect(result.workload).toMatchObject({
      visibleMedicalWorkMinutes: 691,
      invisibleCareWorkMinutes: 570,
      totalCareLoadMinutes: 1_261,
      capacityMinutes: 420,
      overloadMinutes: 841,
    });
    expect(result.primaryHardFailures).toHaveLength(7);
  });
});
