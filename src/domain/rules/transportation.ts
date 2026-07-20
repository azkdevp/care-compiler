import type {
  CareObligation,
  FeasibilityFailure,
  ObligationOccurrence,
  PatientCapacity,
} from "../models";
import { failure } from "./helpers";

export function transportationRule(
  obligations: CareObligation[],
  occurrences: ObligationOccurrence[],
  capacity: PatientCapacity,
): FeasibilityFailure[] {
  const byId = new Map(obligations.map((item) => [item.id, item]));
  return occurrences.flatMap((occurrence) => {
    const obligation = byId.get(occurrence.obligationId);
    if (
      !obligation ||
      obligation.transportRequirement === "none" ||
      !occurrence.start ||
      !occurrence.end
    ) return [];
    const halfTravel = obligation.burden.travel.minutesPerOccurrence / 2;
    const tripStart = new Date(occurrence.start).getTime() - halfTravel * 60_000;
    const tripEnd =
      new Date(occurrence.end).getTime() +
      (halfTravel + obligation.burden.waiting.minutesPerOccurrence) * 60_000;
    const covered = capacity.transportationAvailability.some(
      (window) =>
        new Date(window.start).getTime() <= tripStart &&
        new Date(window.end).getTime() >= tripEnd,
    );
    return covered
      ? []
      : [
          failure({
            id: `failure:transport:${occurrence.id}`,
            problemKey: `transport:${occurrence.id}`,
            type: "transportation_unavailable",
            severity: "blocking",
            occurredAt: occurrence.start,
            involvedObligationIds: [obligation.id],
            lostMinutes: occurrence.visibleMinutes,
            explanation: `Transportation is unavailable for ${obligation.title}.`,
          }),
        ];
  });
}
