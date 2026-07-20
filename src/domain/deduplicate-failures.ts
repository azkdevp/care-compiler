import type { FeasibilityFailure, FeasibilityFailureType } from "./models";

const PRECEDENCE: FeasibilityFailureType[] = [
  "work_conflict",
  "schedule_collision",
  "outside_healthcare_window",
  "insufficient_travel_time",
  "transportation_unavailable",
  "caregiver_unavailable",
  "mobility_mismatch",
  "dependency_failure",
  "deadline_failure",
  "workload_exceeds_capacity",
  "trip_limit",
  "trip_fragmentation",
];

export function deduplicatePrimaryFailures(
  failures: FeasibilityFailure[],
): FeasibilityFailure[] {
  const groups = new Map<string, FeasibilityFailure[]>();
  for (const item of failures) {
    groups.set(item.problemKey, [...(groups.get(item.problemKey) ?? []), item]);
  }
  return [...groups.values()].map((items) => {
    const sorted = [...items].sort(
      (a, b) => PRECEDENCE.indexOf(a.type) - PRECEDENCE.indexOf(b.type),
    );
    return {
      ...sorted[0],
      supportingReasons: sorted.slice(1).map((item) => item.type),
    };
  });
}
