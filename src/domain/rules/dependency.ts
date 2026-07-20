import type {
  CareDependency,
  CareObligation,
  FeasibilityFailure,
  ObligationOccurrence,
} from "../models";
import { failure } from "./helpers";

export function dependencyAndDeadlineRules(
  obligations: CareObligation[],
  occurrences: ObligationOccurrence[],
  dependencies: CareDependency[],
): FeasibilityFailure[] {
  const byObligation = new Map(obligations.map((item) => [item.id, item]));
  const occurrenceByObligation = new Map(
    occurrences.map((item) => [item.obligationId, item]),
  );
  const failures: FeasibilityFailure[] = [];

  for (const edge of dependencies) {
    const predecessor = occurrenceByObligation.get(edge.predecessorObligationId);
    const successor = occurrenceByObligation.get(edge.successorObligationId);
    if (
      predecessor?.end &&
      successor?.start &&
      new Date(predecessor.end).getTime() > new Date(successor.start).getTime()
    ) {
      failures.push(
        failure({
          id: `failure:dependency:${edge.id}`,
          problemKey: `dependency:${edge.id}`,
          type: "dependency_failure",
          severity: "blocking",
          occurredAt: successor.start,
          involvedObligationIds: [edge.predecessorObligationId, edge.successorObligationId],
          blockedDependentOccurrences: 1,
          explanation: "The renal panel is scheduled after the nephrology visit that requires its result.",
        }),
      );
    }
  }

  for (const obligation of obligations) {
    const occurrence = occurrenceByObligation.get(obligation.id);
    if (
      obligation.deadline &&
      occurrence?.end &&
      new Date(occurrence.end).getTime() > new Date(obligation.deadline).getTime()
    ) {
      failures.push(
        failure({
          id: `failure:deadline:${obligation.id}`,
          problemKey: `deadline:${obligation.id}`,
          type: "deadline_failure",
          severity: "blocking",
          occurredAt: obligation.deadline,
          involvedObligationIds: [obligation.id],
          missedDeadline: true,
          explanation: `${byObligation.get(obligation.id)?.title} misses its required deadline.`,
        }),
      );
    }
  }
  return failures;
}
