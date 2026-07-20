import type {
  CareObligation,
  FeasibilityFailure,
  ObligationOccurrence,
  PatientCapacity,
} from "../models";
import { failure } from "./helpers";

export function caregiverRule(
  obligations: CareObligation[],
  occurrences: ObligationOccurrence[],
  capacity: PatientCapacity,
): FeasibilityFailure[] {
  const byId = new Map(obligations.map((item) => [item.id, item]));
  return occurrences.flatMap((occurrence) => {
    const obligation = byId.get(occurrence.obligationId);
    const caregiverId = obligation?.caregiverRequirement.caregiverId;
    if (!obligation?.caregiverRequirement.required || !caregiverId || !occurrence.start || !occurrence.end) {
      return [];
    }
    const caregiver = capacity.caregiverAvailability.find(
      (item) => item.caregiverId === caregiverId,
    );
    const covered = caregiver?.windows.some(
      (window) =>
        new Date(window.start).getTime() <= new Date(occurrence.start!).getTime() &&
        new Date(window.end).getTime() >= new Date(occurrence.end!).getTime(),
    );
    return covered
      ? []
      : [
          failure({
            id: `failure:caregiver:${occurrence.id}`,
            problemKey: `caregiver:${occurrence.id}`,
            type: "caregiver_unavailable",
            severity: "blocking",
            occurredAt: occurrence.start,
            involvedObligationIds: [obligation.id],
            lostMinutes: occurrence.visibleMinutes,
            explanation: `Required caregiver coverage is unavailable for ${obligation.title}.`,
          }),
        ];
  });
}
