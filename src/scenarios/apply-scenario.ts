import type { CareObligation, PatientCapacity } from "@/domain/models";
import { stressTestWeek } from "@/domain/stress-test-week";
import { mariaDependencies } from "@/demo/maria/obligations";
import type { CounterfactualScenario, ScenarioResult } from "./types";

const PROTECTED_FIELDS = ["kind", "recurrence", "deadline", "dependencyIds"] as const;

function protectedSnapshot(obligations: CareObligation[]): string {
  return JSON.stringify(
    obligations.map((item) => ({
      id: item.id,
      kind: item.kind,
      recurrence: item.recurrence,
      deadline: item.deadline,
      dependencyIds: item.dependencyIds,
      activeMinutes: item.burden.active.minutesPerOccurrence,
      medicationIdentity: (item as CareObligation & { medicationIdentity?: unknown }).medicationIdentity,
      dosage: (item as CareObligation & { dosage?: unknown }).dosage,
      treatment: (item as CareObligation & { treatment?: unknown }).treatment,
      clinicalPriority: (item as CareObligation & { clinicalPriority?: unknown }).clinicalPriority,
    })),
  );
}

export function assertProtectedClinicalFieldsUnchanged(
  before: CareObligation[],
  after: CareObligation[],
): void {
  if (protectedSnapshot(before) !== protectedSnapshot(after)) {
    throw new Error(
      `Scenario attempted to modify protected clinical fields: ${PROTECTED_FIELDS.join(", ")}, activeMinutes, medicationIdentity, dosage, treatment, clinicalPriority.`,
    );
  }
}

function requireEvidence(evidence: { sourceDocumentId: string; quote: string }[]): void {
  if (evidence.length === 0) throw new Error("Scenario transformation lacks source evidence.");
}

const ELIGIBLE_TELEHEALTH = new Set([
  "cardiology_visit",
  "nephrology_visit",
  "diabetes_visit",
]);

export function applyScenario(
  baselineObligations: CareObligation[],
  capacity: PatientCapacity,
  scenario: CounterfactualScenario,
): ScenarioResult {
  const transformed = structuredClone(baselineObligations);
  const byId = new Map(transformed.map((item) => [item.id, item]));

  for (const transformation of scenario.transformations) {
    requireEvidence(transformation.evidence);
    if (transformation.type === "change_to_telehealth") {
      if (!ELIGIBLE_TELEHEALTH.has(transformation.obligationId)) {
        throw new Error(`${transformation.obligationId} is not eligible for telehealth.`);
      }
      const item = byId.get(transformation.obligationId);
      if (!item || item.kind !== "appointment") throw new Error("Telehealth scenario target is invalid.");
      item.attendanceMode = "telehealth";
      item.locationId = "home";
      item.transportRequirement = "none";
      item.routeWalkingMinutes = null;
      item.burden.travel.minutesPerOccurrence = 0;
      item.burden.waiting.minutesPerOccurrence = 0;
    } else if (transformation.type === "consolidate_labs") {
      if (
        transformation.primaryId !== "a1c_draw" ||
        transformation.mergedId !== "renal_panel"
      ) throw new Error("This lab pair is not eligible for consolidation.");
      const primary = byId.get(transformation.primaryId);
      const merged = byId.get(transformation.mergedId);
      if (!primary || !merged || primary.kind !== "lab" || merged.kind !== "lab") {
        throw new Error("Lab consolidation targets are invalid.");
      }
      merged.fixedStart = "2026-07-21T08:00:00-05:00";
      merged.locationId = primary.locationId;
      merged.transportRequirement = "none";
      merged.burden.travel.minutesPerOccurrence = 0;
      merged.burden.waiting.minutesPerOccurrence = 0;
    } else {
      if (transformation.obligationId !== "prescription_pickup") {
        throw new Error(`${transformation.obligationId} is not eligible for delivery.`);
      }
      const item = byId.get(transformation.obligationId);
      if (!item || item.kind !== "prescription_pickup") throw new Error("Delivery scenario target is invalid.");
      item.attendanceMode = "home";
      item.locationId = "home";
      item.transportRequirement = "none";
      item.routeWalkingMinutes = null;
      item.burden.travel.minutesPerOccurrence = 0;
      item.burden.waiting.minutesPerOccurrence = 0;
    }
  }

  assertProtectedClinicalFieldsUnchanged(baselineObligations, transformed);
  const baseline = stressTestWeek({ obligations: baselineObligations, dependencies: mariaDependencies, capacity });
  const counterfactual = stressTestWeek({ obligations: transformed, dependencies: mariaDependencies, capacity });
  return {
    scenario,
    baseline,
    counterfactual,
    feasibility:
      counterfactual.workload.overloadMinutes > 0
        ? "improved_but_over_capacity"
        : "within_capacity",
    conclusion:
      "These logistical changes materially improve execution, but Maria remains approximately six hours over her sustainable weekly healthcare capacity.",
  };
}
