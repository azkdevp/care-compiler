import type { CarePlanExtraction } from "@/ai/schemas";
import { mariaObligations } from "./obligations";

const scenarioEvidence: Record<string, CarePlanExtraction["obligations"][number]["scenarioEligibility"]> = {
  cardiology_visit: {
    telehealth: true,
    labConsolidation: false,
    prescriptionDelivery: false,
    evidence: [{ sourceDocumentId: "cardiology_plan", quote: "A video visit is an acceptable alternative" }],
  },
  nephrology_visit: {
    telehealth: true,
    labConsolidation: false,
    prescriptionDelivery: false,
    evidence: [{ sourceDocumentId: "nephrology_plan", quote: "Telehealth is acceptable for this follow-up" }],
  },
  diabetes_visit: {
    telehealth: true,
    labConsolidation: false,
    prescriptionDelivery: false,
    evidence: [{ sourceDocumentId: "diabetes_plan", quote: "A video visit is acceptable when travel is difficult" }],
  },
  renal_panel: {
    telehealth: false,
    labConsolidation: true,
    prescriptionDelivery: false,
    evidence: [{ sourceDocumentId: "nephrology_plan", quote: "completed Tuesday, July 21 at 7:30 AM together with the A1c draw" }],
  },
  a1c_draw: {
    telehealth: false,
    labConsolidation: true,
    prescriptionDelivery: false,
    evidence: [{ sourceDocumentId: "diabetes_plan", quote: "may combine this draw with other blood work" }],
  },
  prescription_pickup: {
    telehealth: false,
    labConsolidation: false,
    prescriptionDelivery: true,
    evidence: [{ sourceDocumentId: "cardiology_plan", quote: "The pharmacy offers delivery if requested" }],
  },
};

export const mariaExpectedExtraction: CarePlanExtraction = {
  patient: {
    displayName: "Maria Lopez",
    timezone: "America/Chicago",
    weeklyHealthcareCapacityMinutes: 420,
    transportationMode: "public_transit",
    maximumContinuousWalkingMinutes: 10,
    maximumHealthcareTripsPerWeek: 4,
    evidence: [
      { sourceDocumentId: "maria_interview", quote: "no more than seven hours per week to healthcare" },
    ],
  },
  obligations: mariaObligations.map((obligation) => ({
    sourceKey: obligation.id,
    carePlanId: obligation.carePlanId as "cardiology" | "nephrology" | "diabetes",
    kind: obligation.kind,
    title: obligation.title,
    documentedActiveMinutes:
      obligation.burden.active.basis === "documented"
        ? obligation.burden.active.minutesPerOccurrence
        : null,
    durationScope: obligation.burden.active.durationScope,
    recurrence:
      obligation.recurrence.frequency === "once"
        ? {
            type: "one_time" as const,
            temporal: (() => {
              const temporalById: Record<string, {
                rawDatePhrase: string;
                rawTimePhrase: string;
                qualitativeTimeLabels: [];
                evidence: { sourceDocumentId: string; quote: string };
              }> = {
                cardiology_visit: { rawDatePhrase: "Monday, July 20", rawTimePhrase: "10:00 AM", qualitativeTimeLabels: [], evidence: obligation.evidence[0] },
                nephrology_visit: { rawDatePhrase: "Wednesday, July 22", rawTimePhrase: "1:30 PM", qualitativeTimeLabels: [], evidence: obligation.evidence[0] },
                renal_panel: { rawDatePhrase: "Thursday, July 23", rawTimePhrase: "7:30 AM", qualitativeTimeLabels: [], evidence: { sourceDocumentId: "nephrology_plan", quote: "Thursday, July 23 at 7:30 AM" } },
                diabetes_visit: { rawDatePhrase: "Friday, July 24", rawTimePhrase: "3:00 PM", qualitativeTimeLabels: [], evidence: obligation.evidence[0] },
                a1c_draw: { rawDatePhrase: "Tuesday, July 21", rawTimePhrase: "7:30 AM", qualitativeTimeLabels: [], evidence: obligation.evidence[0] },
              };
              return temporalById[obligation.id] ?? null;
            })(),
          }
        : obligation.recurrence.frequency === "daily"
          ? {
              type: "daily" as const,
              occurrencesPerDay: obligation.id === "medication_routine"
                ? 2
                : obligation.recurrence.occurrencesInHorizon / 7,
              temporalWindows: obligation.id === "daily_weight"
                ? [{ rawDatePhrase: null, rawTimePhrase: null, qualitativeTimeLabels: ["morning" as const, "before_breakfast" as const], evidence: { sourceDocumentId: "cardiology_plan", quote: "Record morning weight daily before breakfast; allow 10 minutes." } }]
                : obligation.id === "medication_routine"
                  ? [
                      { rawDatePhrase: null, rawTimePhrase: null, qualitativeTimeLabels: ["morning" as const], evidence: { sourceDocumentId: "diabetes_plan", quote: "Continue the morning and evening medication routine. The combined hands-on time is about 8 minutes per day." } },
                      { rawDatePhrase: null, rawTimePhrase: null, qualitativeTimeLabels: ["evening" as const], evidence: { sourceDocumentId: "diabetes_plan", quote: "Continue the morning and evening medication routine. The combined hands-on time is about 8 minutes per day." } },
                    ]
                  : [],
            }
          : {
              type: "weekly" as const,
              occurrencesPerWeek:
                obligation.recurrence.occurrencesInHorizon,
              daysOfWeek: [],
              temporalWindows: [],
            },
    locationLabel: obligation.locationId,
    transportRequirement: obligation.transportRequirement,
    routeWalkingMinutes: obligation.routeWalkingMinutes,
    prerequisiteSourceKeys: obligation.dependencyIds.map(() => "renal_panel"),
    scenarioEligibility: scenarioEvidence[obligation.id] ?? {
      telehealth: false,
      labConsolidation: false,
      prescriptionDelivery: false,
      evidence: [],
    },
    evidence: obligation.evidence,
  })),
  unresolvedStatements: [],
};
