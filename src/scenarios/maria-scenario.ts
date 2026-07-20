import type { CounterfactualScenario } from "./types";

export const mariaLogisticalScenario: CounterfactualScenario = {
  id: "maria_logistical_relief",
  title: "Potential logistical changes to discuss with Maria's care team",
  framing: "Potential logistical changes to discuss with Maria's care team",
  transformations: [
    { type: "change_to_telehealth", obligationId: "cardiology_visit", evidence: [{ sourceDocumentId: "cardiology_plan", quote: "A video visit is an acceptable alternative" }] },
    { type: "change_to_telehealth", obligationId: "nephrology_visit", evidence: [{ sourceDocumentId: "nephrology_plan", quote: "Telehealth is acceptable for this follow-up" }] },
    { type: "change_to_telehealth", obligationId: "diabetes_visit", evidence: [{ sourceDocumentId: "diabetes_plan", quote: "A video visit is acceptable when travel is difficult" }] },
    { type: "consolidate_labs", primaryId: "a1c_draw", mergedId: "renal_panel", evidence: [
      { sourceDocumentId: "nephrology_plan", quote: "completed Tuesday, July 21 at 7:30 AM together with the A1c draw" },
      { sourceDocumentId: "diabetes_plan", quote: "may combine this draw with other blood work" },
    ] },
    { type: "replace_pickup_with_delivery", obligationId: "prescription_pickup", evidence: [{ sourceDocumentId: "cardiology_plan", quote: "The pharmacy offers delivery if requested" }] },
  ],
};
