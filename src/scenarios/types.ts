import type { EvidenceRef, WeeklyStressTest } from "@/domain/models";

export type ScenarioTransformation =
  | { type: "change_to_telehealth"; obligationId: string; evidence: EvidenceRef[] }
  | { type: "consolidate_labs"; primaryId: string; mergedId: string; evidence: EvidenceRef[] }
  | { type: "replace_pickup_with_delivery"; obligationId: string; evidence: EvidenceRef[] };

export interface CounterfactualScenario {
  id: string;
  title: string;
  framing: "Potential logistical changes to discuss with Maria's care team";
  transformations: ScenarioTransformation[];
}

export interface ScenarioResult {
  scenario: CounterfactualScenario;
  baseline: WeeklyStressTest;
  counterfactual: WeeklyStressTest;
  feasibility: "within_capacity" | "improved_but_over_capacity" | "no_material_improvement";
  conclusion: string;
}
