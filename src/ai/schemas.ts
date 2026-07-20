import { z } from "zod";

export const EvidenceRefSchema = z
  .object({
    sourceDocumentId: z.string().min(1),
    quote: z.string().min(1).max(400),
  })
  .strict();

const DayOfWeekSchema = z.number().int().min(0).max(6);

const TemporalExpressionSchema = z.object({
  rawDatePhrase: z.string().min(1).max(80).nullable(),
  rawTimePhrase: z.string().min(1).max(80).nullable(),
  qualitativeTimeLabels: z.array(z.enum([
    "morning", "afternoon", "evening", "night", "before_breakfast",
  ])),
  evidence: EvidenceRefSchema,
}).strict();

export const RecurrenceExtractionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("one_time"),
    temporal: TemporalExpressionSchema.nullable(),
  }).strict(),
  z.object({
    type: z.literal("daily"),
    occurrencesPerDay: z.number().int().min(1),
    temporalWindows: z.array(TemporalExpressionSchema),
  }).strict(),
  z.object({
    type: z.literal("weekly"),
    occurrencesPerWeek: z.number().int().min(1),
    daysOfWeek: z.array(DayOfWeekSchema),
    temporalWindows: z.array(TemporalExpressionSchema),
  }).strict(),
  z.object({
    type: z.literal("specific_days"),
    occurrencesPerDay: z.number().int().min(1),
    daysOfWeek: z.array(DayOfWeekSchema).min(1),
    temporalWindows: z.array(TemporalExpressionSchema),
  }).strict(),
  z.object({
    type: z.literal("unknown"),
    reason: z.string().min(1).max(240),
    evidence: EvidenceRefSchema,
  }).strict(),
]);

export const ScenarioEligibilitySchema = z
  .object({
    telehealth: z.boolean(),
    labConsolidation: z.boolean(),
    prescriptionDelivery: z.boolean(),
    evidence: z.array(EvidenceRefSchema),
  })
  .strict();

export const ExtractedObligationSchema = z
  .object({
    sourceKey: z.string().min(1),
    carePlanId: z.enum(["cardiology", "nephrology", "diabetes"]),
    kind: z.enum([
      "appointment",
      "lab",
      "medication_management",
      "home_monitoring",
      "exercise",
      "self_examination",
      "care_coordination",
      "prescription_pickup",
    ]),
    title: z.string().min(1).max(160),
    documentedActiveMinutes: z.number().int().nonnegative().nullable(),
    durationScope: z.enum([
      "per_occurrence", "combined_per_day", "combined_per_week", "unknown",
    ]),
    recurrence: RecurrenceExtractionSchema,
    locationLabel: z.string().nullable(),
    transportRequirement: z.enum(["none", "public_transit"]),
    routeWalkingMinutes: z.number().int().nonnegative().nullable(),
    prerequisiteSourceKeys: z.array(z.string()),
    scenarioEligibility: ScenarioEligibilitySchema,
    evidence: z.array(EvidenceRefSchema).min(1),
  })
  .strict();

export const CarePlanExtractionSchema = z
  .object({
    patient: z
      .object({
        displayName: z.string().min(1),
        timezone: z.string().nullable(),
        weeklyHealthcareCapacityMinutes: z.number().int().positive().nullable(),
        transportationMode: z.enum(["public_transit"]).nullable(),
        maximumContinuousWalkingMinutes: z.number().int().nonnegative().nullable(),
        maximumHealthcareTripsPerWeek: z.number().int().positive().nullable(),
        evidence: z.array(EvidenceRefSchema).min(1),
      })
      .strict(),
    obligations: z.array(ExtractedObligationSchema).min(1),
    unresolvedStatements: z.array(
      z
        .object({
          statement: z.string().min(1),
          reason: z.enum([
            "ambiguous_duration",
            "ambiguous_recurrence",
            "ambiguous_deadline",
            "ambiguous_dependency",
            "ambiguous_location",
            "possible_clinical_judgment",
          ]),
          evidence: EvidenceRefSchema,
        })
        .strict(),
    ),
  })
  .strict();

export type CarePlanExtraction = z.infer<typeof CarePlanExtractionSchema>;

export const CareConversationBriefSchema = z
  .object({
    headline: z.string().min(1).max(140),
    patientSummary: z.string().min(1).max(700),
    questionsByCareTeam: z.array(
      z
        .object({
          audience: z.enum([
            "cardiology",
            "nephrology",
            "diabetes",
            "primary_care",
            "care_coordinator",
          ]),
          questions: z.array(z.string().min(1).max(260)).min(1).max(4),
          relatedFailureIds: z.array(z.string()),
        })
        .strict(),
    ),
    logisticalScenariosToDiscuss: z.array(
      z
        .object({
          scenarioId: z.string().min(1),
          question: z.string().min(1).max(280),
        })
        .strict(),
    ),
    unresolvedClinicalQuestions: z.array(z.string().max(280)),
    safetyNotice: z.literal(
      "This brief identifies workload and logistical barriers. It does not change medications, treatments, monitoring requirements, or clinical priorities.",
    ),
  })
  .strict();

export type CareConversationBrief = z.infer<typeof CareConversationBriefSchema>;
