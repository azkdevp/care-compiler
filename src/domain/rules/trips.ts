import type {
  CareObligation,
  FeasibilityFailure,
  PatientCapacity,
  WorkloadSummary,
} from "../models";
import { failure } from "./helpers";

export function tripRules(
  obligations: CareObligation[],
  workload: WorkloadSummary,
  capacity: PatientCapacity,
): FeasibilityFailure[] {
  const failures: FeasibilityFailure[] = [];
  const maximum = capacity.maximumHealthcareTripsPerWeek;
  if (maximum !== null && workload.trips > maximum) {
    failures.push(
      failure({
        id: "warning:trip-limit",
        problemKey: "weekly-trip-limit",
        type: "trip_limit",
        severity: "warning",
        addedTrips: workload.trips - maximum,
        explanation: `${workload.trips} healthcare trips exceed Maria's preferred maximum of ${maximum}.`,
      }),
    );
  }
  const labTrips = obligations.filter(
    (item) => item.kind === "lab" && item.burden.travel.minutesPerOccurrence > 0,
  );
  if (labTrips.length > 1) {
    failures.push(
      failure({
        id: "warning:lab-fragmentation",
        problemKey: "lab-trip-fragmentation",
        type: "trip_fragmentation",
        severity: "warning",
        involvedObligationIds: labTrips.map((item) => item.id),
        addedTrips: labTrips.length - 1,
        explanation: "Two compatible blood draws create duplicate travel and waiting burden.",
      }),
    );
  }
  return failures;
}
