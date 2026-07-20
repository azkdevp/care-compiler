import type {
  CareObligation,
  FeasibilityFailure,
  ObligationOccurrence,
} from "../models";
import { failure } from "./helpers";

export function travelBufferRule(
  obligations: CareObligation[],
  occurrences: ObligationOccurrence[],
): FeasibilityFailure[] {
  const byId = new Map(obligations.map((item) => [item.id, item]));
  const trips = occurrences.filter((item) => item.tripId && item.start && item.end);
  const failures: FeasibilityFailure[] = [];

  for (let index = 1; index < trips.length; index += 1) {
    const previous = trips[index - 1];
    const current = trips[index];
    const previousObligation = byId.get(previous.obligationId);
    const currentObligation = byId.get(current.obligationId);
    if (!previousObligation || !currentObligation) continue;
    const sameLocalDate = previous.start!.slice(0, 10) === current.start!.slice(0, 10);
    if (!sameLocalDate || previousObligation.locationId === currentObligation.locationId) continue;
    const gap =
      (new Date(current.start!).getTime() - new Date(previous.end!).getTime()) / 60_000;
    const required = Math.ceil(
      currentObligation.burden.travel.minutesPerOccurrence / 2,
    );
    if (gap >= required) continue;
    failures.push(
      failure({
        id: `failure:travel:${previous.id}:${current.id}`,
        problemKey: `travel:${previous.id}:${current.id}`,
        type: "insufficient_travel_time",
        severity: "blocking",
        occurredAt: current.start,
        involvedObligationIds: [previous.obligationId, current.obligationId],
        lostMinutes: required - Math.max(0, gap),
        explanation: `Only ${gap} minutes are available for a ${required}-minute transit leg.`,
      }),
    );
  }
  return failures;
}
