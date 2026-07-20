import type {
  CareObligation,
  ObligationOccurrence,
  PatientCapacity,
  WorkloadSummary,
} from "./models";

export function calculateVisibleCareWork(occurrences: ObligationOccurrence[]): number {
  return occurrences.reduce((total, item) => total + item.visibleMinutes, 0);
}

export function calculateInvisibleCareWork(occurrences: ObligationOccurrence[]): number {
  return occurrences.reduce((total, item) => total + item.invisibleMinutes, 0);
}

export function calculateCapacity(capacity: PatientCapacity): number {
  const windowMinutes = capacity.availableHealthcareWindows.reduce(
    (total, window) => total + window.endMinute - window.startMinute,
    0,
  );
  return Math.min(capacity.weeklyHealthcareCapacityMinutes, windowMinutes);
}

export function calculateWorkload(
  obligations: CareObligation[],
  occurrences: ObligationOccurrence[],
  patientCapacity: PatientCapacity,
): WorkloadSummary {
  const visible = calculateVisibleCareWork(occurrences);
  const invisible = calculateInvisibleCareWork(occurrences);
  const total = visible + invisible;
  const capacity = calculateCapacity(patientCapacity);
  const multiply = (key: keyof CareObligation["burden"]) =>
    obligations.reduce(
      (sum, obligation) =>
        sum +
        obligation.burden[key].minutesPerOccurrence *
          obligation.recurrence.occurrencesInHorizon,
      0,
    );

  return {
    visibleMedicalWorkMinutes: visible,
    invisibleCareWorkMinutes: invisible,
    totalCareLoadMinutes: total,
    capacityMinutes: capacity,
    overloadMinutes: Math.max(0, total - capacity),
    utilizationPercent: capacity === 0 ? Infinity : (total / capacity) * 100,
    trips: occurrences.filter((item) => item.tripId !== null).length,
    byComponent: {
      active: multiply("active"),
      travel: multiply("travel"),
      waiting: multiply("waiting"),
      preparation: multiply("preparation"),
      administrative: multiply("administrative"),
    },
  };
}
