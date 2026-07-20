import type { FeasibilityFailure, WorkloadSummary } from "../models";
import { failure } from "./helpers";

export function workloadCapacityRule(workload: WorkloadSummary): FeasibilityFailure[] {
  if (workload.overloadMinutes === 0) return [];
  return [
    failure({
      id: "failure:weekly-overload",
      problemKey: "weekly-capacity",
      type: "workload_exceeds_capacity",
      severity: "blocking",
      lostMinutes: workload.overloadMinutes,
      explanation: `Weekly workload exceeds capacity by ${workload.overloadMinutes} minutes.`,
    }),
  ];
}
