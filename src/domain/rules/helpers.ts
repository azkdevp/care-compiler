import type {
  FeasibilityFailure,
  FeasibilityFailureType,
} from "../models";

export function failure(input: {
  id: string;
  problemKey: string;
  type: FeasibilityFailureType;
  severity: "blocking" | "warning";
  occurredAt?: string | null;
  involvedObligationIds?: string[];
  lostMinutes?: number;
  blockedDependentOccurrences?: number;
  missedDeadline?: boolean;
  addedTrips?: number;
  explanation: string;
}): FeasibilityFailure {
  return {
    occurredAt: null,
    involvedObligationIds: [],
    lostMinutes: 0,
    blockedDependentOccurrences: 0,
    missedDeadline: false,
    addedTrips: 0,
    supportingReasons: [],
    ...input,
  };
}
