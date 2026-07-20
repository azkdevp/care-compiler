import type { CareObligation, FeasibilityFailure, PatientCapacity } from "../models";
import { failure } from "./helpers";

export function mobilityRule(
  obligations: CareObligation[],
  capacity: PatientCapacity,
): FeasibilityFailure[] {
  return obligations
    .filter(
      (item) =>
        item.routeWalkingMinutes !== null &&
        item.routeWalkingMinutes > capacity.mobilityConstraints.maximumContinuousWalkingMinutes,
    )
    .map((item) =>
      failure({
        id: `failure:mobility:${item.id}`,
        problemKey: `mobility:${item.id}`,
        type: "mobility_mismatch",
        severity: "blocking",
        occurredAt: item.fixedStart,
        involvedObligationIds: [item.id],
        lostMinutes: item.burden.active.minutesPerOccurrence,
        explanation: `${item.title} requires ${item.routeWalkingMinutes} minutes of continuous walking; Maria's limit is ${capacity.mobilityConstraints.maximumContinuousWalkingMinutes}.`,
      }),
    );
}
