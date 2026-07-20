export type DateTime = string;
export type Minutes = number;

export type BurdenBasis =
  | "documented"
  | "patient_reported"
  | "deterministic_default"
  | "gpt_inferred";

export type DurationScope =
  | "per_occurrence"
  | "combined_per_day"
  | "combined_per_week"
  | "unknown";

export interface EvidenceRef {
  sourceDocumentId: string;
  quote: string;
}

export interface BurdenComponent {
  minutesPerOccurrence: Minutes;
  durationScope: DurationScope;
  basis: BurdenBasis;
  rationale: string;
  evidence: EvidenceRef[];
}

export interface CareBurden {
  active: BurdenComponent;
  travel: BurdenComponent;
  waiting: BurdenComponent;
  preparation: BurdenComponent;
  administrative: BurdenComponent;
}

export type SourceKind =
  | "cardiology_plan"
  | "nephrology_plan"
  | "diabetes_plan"
  | "patient_interview";

export interface SourceDocument {
  id: string;
  kind: SourceKind;
  title: string;
  author: string;
  recordedAt: DateTime;
  text: string;
}

export interface Patient {
  id: string;
  displayName: string;
  age: number;
  timezone: string;
  conditions: string[];
}

export interface DailyWindow {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

export interface AvailabilityWindow {
  start: DateTime;
  end: DateTime;
}

export interface PatientCapacity {
  patientId: string;
  weeklyHealthcareCapacityMinutes: Minutes;
  workSchedule: DailyWindow[];
  availableHealthcareWindows: DailyWindow[];
  transportationMode: "public_transit";
  transportationAvailability: AvailabilityWindow[];
  caregiverAvailability: Array<{
    caregiverId: string;
    windows: AvailabilityWindow[];
  }>;
  mobilityConstraints: {
    maximumContinuousWalkingMinutes: Minutes;
    requiresStepFreeRoute: boolean;
  };
  financialConstraint: { weeklyOutOfPocketLimitCents: number } | null;
  maximumHealthcareTripsPerWeek: number | null;
  evidence: EvidenceRef[];
}

export interface Recurrence {
  frequency: "once" | "daily" | "weekly";
  occurrencesInHorizon: number;
  daysOfWeek: number[];
  timesOfDay: string[];
  scheduleBasis?: "source_explicit" | "deterministic_default";
  clinicalOccurrencesInHorizon?: number;
  qualitativeTimeLabels?: Array<"morning" | "afternoon" | "evening" | "night" | "before_breakfast">;
}

export type ObligationKind =
  | "appointment"
  | "lab"
  | "medication_management"
  | "home_monitoring"
  | "exercise"
  | "self_examination"
  | "care_coordination"
  | "prescription_pickup";

export interface CareObligation {
  id: string;
  carePlanId: string;
  kind: ObligationKind;
  title: string;
  burden: CareBurden;
  recurrence: Recurrence;
  deadline: DateTime | null;
  fixedStart: DateTime | null;
  allowedWindows: AvailabilityWindow[];
  locationId: string | null;
  attendanceMode: "in_person" | "telehealth" | "home";
  transportRequirement: "none" | "public_transit";
  caregiverRequirement: {
    required: boolean;
    caregiverId: string | null;
  };
  routeWalkingMinutes: Minutes | null;
  dependencyIds: string[];
  evidence: EvidenceRef[];
}

export interface CareDependency {
  id: string;
  predecessorObligationId: string;
  successorObligationId: string;
  type: "must_complete_before" | "result_required_before";
  minimumGapMinutes: Minutes;
  evidence: EvidenceRef[];
}

export interface CareDependencyGraph {
  nodes: string[];
  edges: CareDependency[];
  topologicalOrder: string[];
  cycles: string[][];
}

export interface ObligationOccurrence {
  id: string;
  obligationId: string;
  start: DateTime | null;
  end: DateTime | null;
  visibleMinutes: Minutes;
  invisibleMinutes: Minutes;
  tripId: string | null;
}

export type FeasibilityFailureType =
  | "workload_exceeds_capacity"
  | "outside_healthcare_window"
  | "work_conflict"
  | "schedule_collision"
  | "insufficient_travel_time"
  | "transportation_unavailable"
  | "caregiver_unavailable"
  | "mobility_mismatch"
  | "dependency_failure"
  | "deadline_failure"
  | "trip_limit"
  | "trip_fragmentation";

export interface FeasibilityFailure {
  id: string;
  problemKey: string;
  type: FeasibilityFailureType;
  severity: "blocking" | "warning";
  occurredAt: DateTime | null;
  involvedObligationIds: string[];
  lostMinutes: Minutes;
  blockedDependentOccurrences: number;
  missedDeadline: boolean;
  addedTrips: number;
  explanation: string;
  supportingReasons: FeasibilityFailureType[];
}

export interface Breakpoint {
  failureId: string;
  explanation: string;
  impactScore: number;
}

export interface WorkloadSummary {
  visibleMedicalWorkMinutes: Minutes;
  invisibleCareWorkMinutes: Minutes;
  totalCareLoadMinutes: Minutes;
  capacityMinutes: Minutes;
  overloadMinutes: Minutes;
  utilizationPercent: number;
  trips: number;
  byComponent: {
    active: Minutes;
    travel: Minutes;
    waiting: Minutes;
    preparation: Minutes;
    administrative: Minutes;
  };
}

export interface WeeklyStressTest {
  workload: WorkloadSummary;
  occurrences: ObligationOccurrence[];
  dependencyGraph: CareDependencyGraph;
  allFailures: FeasibilityFailure[];
  primaryHardFailures: FeasibilityFailure[];
  warnings: FeasibilityFailure[];
  chronologicalBreakpoint: Breakpoint | null;
  highestImpactBreakpoint: Breakpoint | null;
}
