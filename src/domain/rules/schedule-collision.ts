import type { FeasibilityFailure, ObligationOccurrence } from "../models";
import { failure } from "./helpers";

export function scheduleCollisionRule(
  occurrences: ObligationOccurrence[],
): FeasibilityFailure[] {
  const failures: FeasibilityFailure[] = [];
  for (let leftIndex = 0; leftIndex < occurrences.length; leftIndex += 1) {
    const left = occurrences[leftIndex];
    if (!left.start || !left.end || left.start === left.end) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < occurrences.length; rightIndex += 1) {
      const right = occurrences[rightIndex];
      if (!right.start || !right.end || right.start === right.end) continue;
      const overlaps =
        new Date(left.start).getTime() < new Date(right.end).getTime() &&
        new Date(right.start).getTime() < new Date(left.end).getTime();
      if (!overlaps) continue;
      failures.push(
        failure({
          id: `failure:collision:${left.id}:${right.id}`,
          problemKey: `collision:${left.id}:${right.id}`,
          type: "schedule_collision",
          severity: "blocking",
          occurredAt:
            new Date(left.start).getTime() <= new Date(right.start).getTime()
              ? right.start
              : left.start,
          involvedObligationIds: [left.obligationId, right.obligationId],
          lostMinutes: Math.min(left.visibleMinutes, right.visibleMinutes),
          explanation: "Two care obligations occupy overlapping time.",
        }),
      );
    }
  }
  return failures;
}
