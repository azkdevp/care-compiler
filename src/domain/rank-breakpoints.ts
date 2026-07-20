import type { Breakpoint, FeasibilityFailure } from "./models";

function impactScore(item: FeasibilityFailure): number {
  return (
    item.lostMinutes +
    60 * item.blockedDependentOccurrences +
    30 * Number(item.missedDeadline) +
    15 * item.addedTrips
  );
}

export function rankChronologicalBreakpoint(
  failures: FeasibilityFailure[],
): Breakpoint | null {
  const first = failures
    .filter((item) => item.severity === "blocking" && item.occurredAt !== null)
    .sort((a, b) => a.occurredAt!.localeCompare(b.occurredAt!))[0];
  return first
    ? { failureId: first.id, explanation: first.explanation, impactScore: impactScore(first) }
    : null;
}

export function rankHighestImpactBreakpoint(
  failures: FeasibilityFailure[],
): Breakpoint | null {
  const first = failures
    .filter((item) => item.severity === "blocking")
    .sort((a, b) => impactScore(b) - impactScore(a))[0];
  return first
    ? { failureId: first.id, explanation: first.explanation, impactScore: impactScore(first) }
    : null;
}
