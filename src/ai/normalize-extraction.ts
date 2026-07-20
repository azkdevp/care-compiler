import { CarePlanExtractionSchema, type CarePlanExtraction } from "./schemas";
import type { CareDependency, CareObligation, PatientCapacity } from "@/domain/models";
import { mariaDependencies, mariaObligations } from "@/demo/maria/obligations";
import { mariaCapacity } from "@/demo/maria/patient";
import { mariaSources } from "@/demo/maria/sources";
import { expandRecurrence } from "@/domain/expand-recurrence";
import type { DurationScope } from "@/domain/models";
import {
  parseClockPhrase,
  parseSourceBackedDateTime,
  validateTemporalEvidence,
} from "./temporal-grounding";

export interface NormalizedCareInput {
  obligations: CareObligation[];
  dependencies: CareDependency[];
  capacity: PatientCapacity;
}

const LOCATION_ALIASES: Record<string, string> = {
  "Lakeshore Cardiology": "lakeshore_cardiology",
  "Midwest Kidney Group": "midwest_kidney",
  "Westside Diabetes Center": "westside_diabetes",
  "Westside laboratory": "westside_lab",
  pharmacy: "community_pharmacy",
  home: "home",
};

const OBLIGATION_DISCRIMINATORS: Partial<Record<string, RegExp>> = {
  daily_weight: /\bweight\b/i,
  daily_blood_pressure: /\bblood pressure\b|\bbp\b/i,
};

function normalizedText(value: string): string {
  return value.toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

function assertEvidenceRef(
  evidence: { sourceDocumentId: string; quote: string },
  sourceTextById: Map<string, string>,
): void {
  const sourceText = sourceTextById.get(evidence.sourceDocumentId);
  if (!sourceText) throw new Error(`Unknown evidence source ${evidence.sourceDocumentId}.`);
  if (!normalizedText(sourceText).includes(normalizedText(evidence.quote))) {
    throw new Error(`Evidence quote is not present in source ${evidence.sourceDocumentId}.`);
  }
}

function assertEvidence(extraction: CarePlanExtraction): void {
  const sourceTextById = new Map(mariaSources.map((source) => [source.id, source.text]));
  for (const evidence of extraction.patient.evidence) {
    assertEvidenceRef(evidence, sourceTextById);
  }
  for (const obligation of extraction.obligations) {
    for (const item of obligation.evidence) {
      assertEvidenceRef(item, sourceTextById);
    }
    const eligibility = obligation.scenarioEligibility;
    if (
      (eligibility.telehealth ||
        eligibility.labConsolidation ||
        eligibility.prescriptionDelivery) &&
      eligibility.evidence.length === 0
    ) {
      throw new Error(`Scenario eligibility for ${obligation.sourceKey} lacks evidence.`);
    }
    for (const item of eligibility.evidence) {
      assertEvidenceRef(item, sourceTextById);
    }
    if (obligation.recurrence.type === "unknown") {
      assertEvidenceRef(obligation.recurrence.evidence, sourceTextById);
    } else if (obligation.recurrence.type === "one_time") {
      if (obligation.recurrence.temporal) {
        assertEvidenceRef(obligation.recurrence.temporal.evidence, sourceTextById);
        validateTemporalEvidence(obligation.recurrence.temporal);
      }
    } else {
      for (const temporal of obligation.recurrence.temporalWindows) {
        assertEvidenceRef(temporal.evidence, sourceTextById);
        validateTemporalEvidence(temporal);
      }
    }
  }
  for (const unresolved of extraction.unresolvedStatements) {
    assertEvidenceRef(unresolved.evidence, sourceTextById);
  }
}

function resolveDurationScope(
  item: CarePlanExtraction["obligations"][number],
): DurationScope {
  const recurrenceEvidence = item.recurrence.type === "unknown"
    ? [item.recurrence.evidence]
    : item.recurrence.type === "one_time"
      ? item.recurrence.temporal ? [item.recurrence.temporal.evidence] : []
      : item.recurrence.temporalWindows.map((window) => window.evidence);
  const evidenceText = normalizedText(
    [...item.evidence, ...recurrenceEvidence].map((entry) => entry.quote).join(" "),
  );
  const explicitCombinedDay = /\bcombined\b.*\bper day\b/.test(evidenceText);
  const explicitCombinedWeek = /\bcombined\b.*\bper week\b/.test(evidenceText);
  if (explicitCombinedDay && item.durationScope !== "combined_per_day") {
    throw new Error(`Duration scope for ${item.sourceKey} contradicts combined-per-day evidence.`);
  }
  if (explicitCombinedWeek && item.durationScope !== "combined_per_week") {
    throw new Error(`Duration scope for ${item.sourceKey} contradicts combined-per-week evidence.`);
  }
  if (item.durationScope === "combined_per_day" && !explicitCombinedDay) {
    throw new Error(`Combined-per-day duration for ${item.sourceKey} lacks explicit evidence.`);
  }
  if (item.durationScope === "combined_per_week" && !explicitCombinedWeek) {
    throw new Error(`Combined-per-week duration for ${item.sourceKey} lacks explicit evidence.`);
  }
  if (item.durationScope === "unknown" && item.documentedActiveMinutes !== null) {
    throw new Error(`Documented duration for ${item.sourceKey} has unresolved scope.`);
  }
  return item.durationScope;
}

function normalizeRecurrence(
  extracted: CarePlanExtraction["obligations"][number]["recurrence"],
  template: CareObligation,
  durationScope: DurationScope,
  patientTimezone: string,
): { recurrence: CareObligation["recurrence"]; fixedStart: string | null } {
  if (extracted.type === "unknown") {
    throw new Error(`Unresolved recurrence for ${template.id}: ${extracted.reason}`);
  }
  if (extracted.type === "one_time") {
    const fixedStart = extracted.temporal
      ? parseSourceBackedDateTime(extracted.temporal, template.fixedStart, patientTimezone)
      : template.fixedStart;
    if (!fixedStart) {
      throw new Error(`One-time obligation ${template.id} has no executable schedule.`);
    }
    return {
      recurrence: {
        frequency: "once",
        occurrencesInHorizon: 1,
        daysOfWeek: [],
        timesOfDay: [fixedStart.slice(11, 16)],
        scheduleBasis: extracted.temporal
          ? "source_explicit"
          : "deterministic_default",
        clinicalOccurrencesInHorizon: 1,
        qualitativeTimeLabels: extracted.temporal?.qualitativeTimeLabels ?? [],
      },
      fixedStart,
    };
  }

  if (extracted.type === "daily") {
    const clinicalOccurrences = extracted.occurrencesPerDay * 7;
    const workloadOccurrences = durationScope === "combined_per_day"
      ? 7
      : durationScope === "combined_per_week"
        ? 1
        : clinicalOccurrences;
    const explicitClockTimes = extracted.temporalWindows
      .filter((window) => window.rawTimePhrase !== null)
      .map((window) => parseClockPhrase(window.rawTimePhrase!));
    const workloadOccurrencesPerDay = workloadOccurrences / 7;
    if (
      explicitClockTimes.length > 0 &&
      durationScope === "per_occurrence" &&
      explicitClockTimes.length !== extracted.occurrencesPerDay
    ) throw new Error(`Daily recurrence for ${template.id} has incomplete source times.`);
    const useExplicitTimes = durationScope === "per_occurrence" && explicitClockTimes.length > 0;
    const timesOfDay = useExplicitTimes ? explicitClockTimes : template.recurrence.timesOfDay;
    if (!Number.isInteger(workloadOccurrencesPerDay) || timesOfDay.length !== workloadOccurrencesPerDay) {
      throw new Error(`Daily recurrence for ${template.id} cannot be allocated deterministically.`);
    }
    const qualitativeTimeLabels = extracted.temporalWindows.flatMap(
      (window) => window.qualitativeTimeLabels,
    );
    return {
      recurrence: {
        frequency: "daily",
        occurrencesInHorizon: workloadOccurrences,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
        timesOfDay: structuredClone(timesOfDay),
        scheduleBasis: useExplicitTimes ? "source_explicit" : "deterministic_default",
        clinicalOccurrencesInHorizon: clinicalOccurrences,
        qualitativeTimeLabels,
      },
      fixedStart: null,
    };
  }

  const clinicalOccurrences =
    extracted.type === "weekly"
      ? extracted.occurrencesPerWeek
      : extracted.occurrencesPerDay * extracted.daysOfWeek.length;
  const occurrences = durationScope === "combined_per_week" ? 1 : clinicalOccurrences;
  const extractedDays = extracted.daysOfWeek;
  const daysOfWeek =
    extractedDays.length > 0
      ? extractedDays
      : template.recurrence.daysOfWeek;
  const explicitClockTimes = extracted.temporalWindows
    .filter((window) => window.rawTimePhrase !== null)
    .map((window) => parseClockPhrase(window.rawTimePhrase!));
  const timesOfDay = explicitClockTimes.length > 0
    ? explicitClockTimes
    : template.recurrence.timesOfDay;
  if (daysOfWeek.length * timesOfDay.length !== occurrences) {
    throw new Error(`Weekly recurrence for ${template.id} cannot be allocated deterministically.`);
  }
  return {
    recurrence: {
      frequency: "weekly",
      occurrencesInHorizon: occurrences,
      daysOfWeek: structuredClone(daysOfWeek),
      timesOfDay: structuredClone(timesOfDay),
      scheduleBasis:
        extractedDays.length > 0 && explicitClockTimes.length > 0
          ? "source_explicit"
          : "deterministic_default",
      clinicalOccurrencesInHorizon: clinicalOccurrences,
      qualitativeTimeLabels: extracted.temporalWindows.flatMap(
        (window) => window.qualitativeTimeLabels,
      ),
    },
    fixedStart: null,
  };
}

function resolveTemplate(
  item: CarePlanExtraction["obligations"][number],
  templates: Map<string, CareObligation>,
): CareObligation {
  const exact = templates.get(item.sourceKey);
  if (exact) return exact;

  const candidates = [...templates.values()].filter(
    (template) =>
      template.carePlanId === item.carePlanId && template.kind === item.kind,
  );
  if (candidates.length === 1) return candidates[0];

  const semanticText = [
    item.sourceKey,
    item.title,
    ...item.evidence.map((evidence) => evidence.quote),
  ].join(" ");
  const discriminated = candidates.filter((candidate) =>
    OBLIGATION_DISCRIMINATORS[candidate.id]?.test(semanticText),
  );
  if (discriminated.length === 1) return discriminated[0];
  if (discriminated.length > 1) {
    throw new Error(`Ambiguous obligation ${item.sourceKey}.`);
  }
  throw new Error(`Unsupported obligation ${item.sourceKey}.`);
}

function resolveLocation(label: string | null, template: CareObligation): string | null {
  if (label === null) return template.locationId;
  const normalizedLabel = normalizedText(label);
  const alias = Object.entries(LOCATION_ALIASES).find(
    ([candidate]) => normalizedText(candidate) === normalizedLabel,
  );
  return alias?.[1] ?? label;
}

export function normalizeExtraction(input: unknown): NormalizedCareInput {
  const extraction = CarePlanExtractionSchema.parse(input);
  assertEvidence(extraction);
  const templates = new Map(mariaObligations.map((item) => [item.id, item]));
  const seen = new Set<string>();

  const obligations = extraction.obligations.map((item) => {
    const template = resolveTemplate(item, templates);
    if (seen.has(template.id)) throw new Error(`Duplicate obligation ${template.id}.`);
    seen.add(template.id);
    if (template.kind !== item.kind || template.carePlanId !== item.carePlanId) {
      throw new Error(`Unsupported classification for ${item.sourceKey}.`);
    }
    if (
      item.documentedActiveMinutes === null &&
      template.burden.active.basis === "documented"
    ) {
      throw new Error(`Missing documented active duration for ${item.sourceKey}.`);
    }

    const durationScope = resolveDurationScope(item);
    const normalized = structuredClone(template);
    const normalizedSchedule = normalizeRecurrence(
      item.recurrence,
      template,
      durationScope,
      extraction.patient.timezone ?? "America/Chicago",
    );
    normalized.recurrence = normalizedSchedule.recurrence;
    normalized.fixedStart = normalizedSchedule.fixedStart;
    normalized.locationId = resolveLocation(item.locationLabel, template);
    normalized.transportRequirement = item.transportRequirement;
    normalized.routeWalkingMinutes =
      item.routeWalkingMinutes ?? template.routeWalkingMinutes;
    normalized.evidence = structuredClone(item.evidence);
    if (item.documentedActiveMinutes !== null) {
      normalized.burden.active = {
        minutesPerOccurrence: item.documentedActiveMinutes,
        durationScope,
        basis: "documented",
        rationale: "Explicitly documented active duration.",
        evidence: structuredClone(item.evidence),
      };
    }
    const expanded = expandRecurrence(normalized);
    if (
      expanded.length === 0 ||
      expanded.length !== normalized.recurrence.occurrencesInHorizon
    ) {
      throw new Error(`Recurrence for ${normalized.id} did not expand to its declared workload.`);
    }
    return normalized;
  });

  if (obligations.length !== mariaObligations.length) {
    throw new Error("Extraction is missing one or more required Maria obligations.");
  }

  const capacity = structuredClone(mariaCapacity);
  capacity.weeklyHealthcareCapacityMinutes =
    extraction.patient.weeklyHealthcareCapacityMinutes ??
    capacity.weeklyHealthcareCapacityMinutes;
  capacity.transportationMode =
    extraction.patient.transportationMode ?? capacity.transportationMode;
  capacity.mobilityConstraints.maximumContinuousWalkingMinutes =
    extraction.patient.maximumContinuousWalkingMinutes ??
    capacity.mobilityConstraints.maximumContinuousWalkingMinutes;
  capacity.maximumHealthcareTripsPerWeek =
    extraction.patient.maximumHealthcareTripsPerWeek ??
    capacity.maximumHealthcareTripsPerWeek;

  return {
    obligations,
    dependencies: structuredClone(mariaDependencies),
    capacity,
  };
}
