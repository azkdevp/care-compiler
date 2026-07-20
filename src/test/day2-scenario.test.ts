import { describe, expect, it } from "vitest";
import { mariaObligations } from "@/demo/maria/obligations";
import { mariaCapacity } from "@/demo/maria/patient";
import {
  applyScenario,
  assertProtectedClinicalFieldsUnchanged,
} from "@/scenarios/apply-scenario";
import { mariaLogisticalScenario } from "@/scenarios/maria-scenario";

describe("Day 2 counterfactual scenario", () => {
  it("produces the exact locked Maria comparison", () => {
    const result = applyScenario(
      mariaObligations,
      mariaCapacity,
      mariaLogisticalScenario,
    );
    expect(result.baseline.workload).toMatchObject({
      visibleMedicalWorkMinutes: 691,
      invisibleCareWorkMinutes: 570,
      totalCareLoadMinutes: 1_261,
      capacityMinutes: 420,
      trips: 6,
    });
    expect(result.baseline.primaryHardFailures).toHaveLength(7);
    expect(result.counterfactual.workload).toMatchObject({
      visibleMedicalWorkMinutes: 691,
      invisibleCareWorkMinutes: 90,
      totalCareLoadMinutes: 781,
      capacityMinutes: 420,
      overloadMinutes: 361,
      trips: 1,
    });
    expect(result.counterfactual.workload.utilizationPercent).toBeCloseTo(185.95, 2);
    expect(result.counterfactual.primaryHardFailures).toHaveLength(1);
    expect(result.feasibility).toBe("improved_but_over_capacity");
    expect(result.conclusion).toContain("remains approximately six hours over");
  });

  it("does not mutate the baseline obligations", () => {
    const before = structuredClone(mariaObligations);
    applyScenario(mariaObligations, mariaCapacity, mariaLogisticalScenario);
    expect(mariaObligations).toEqual(before);
  });

  it("rejects ineligible scenario targets", () => {
    const invalid = structuredClone(mariaLogisticalScenario);
    invalid.transformations[0] = {
      type: "change_to_telehealth",
      obligationId: "daily_weight",
      evidence: [{ sourceDocumentId: "cardiology_plan", quote: "unsupported" }],
    };
    expect(() => applyScenario(mariaObligations, mariaCapacity, invalid)).toThrow(
      "not eligible for telehealth",
    );
  });

  it("rejects changes to protected clinical fields", () => {
    const changed = structuredClone(mariaObligations);
    changed.find((item) => item.id === "glucose_checks")!.recurrence.occurrencesInHorizon = 7;
    expect(() =>
      assertProtectedClinicalFieldsUnchanged(mariaObligations, changed),
    ).toThrow("protected clinical fields");
  });

  it("also protects future medication and treatment metadata", () => {
    const changed = structuredClone(mariaObligations) as Array<
      (typeof mariaObligations)[number] & { dosage?: string }
    >;
    changed.find((item) => item.id === "medication_routine")!.dosage = "changed dose";
    expect(() =>
      assertProtectedClinicalFieldsUnchanged(mariaObligations, changed),
    ).toThrow("dosage");
  });
});
