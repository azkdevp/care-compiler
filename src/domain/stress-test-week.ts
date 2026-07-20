import type {
  CareDependency,
  CareObligation,
  PatientCapacity,
  WeeklyStressTest,
} from "./models";
import { buildDependencyGraph } from "./build-dependency-graph";
import { calculateWorkload } from "./calculate-workload";
import { deduplicatePrimaryFailures } from "./deduplicate-failures";
import { expandAllRecurrences } from "./expand-recurrence";
import { rankChronologicalBreakpoint, rankHighestImpactBreakpoint } from "./rank-breakpoints";
import { dependencyAndDeadlineRules } from "./rules/dependency";
import { caregiverRule } from "./rules/caregiver";
import { mobilityRule } from "./rules/mobility";
import { scheduleCollisionRule } from "./rules/schedule-collision";
import { transportationRule } from "./rules/transportation";
import { travelBufferRule } from "./rules/travel-buffer";
import { tripRules } from "./rules/trips";
import { workAndWindowRules } from "./rules/work-conflict";
import { workloadCapacityRule } from "./rules/workload-capacity";

export function stressTestWeek(input: {
  obligations: CareObligation[];
  dependencies: CareDependency[];
  capacity: PatientCapacity;
}): WeeklyStressTest {
  const occurrences = expandAllRecurrences(input.obligations);
  const dependencyGraph = buildDependencyGraph(input.obligations, input.dependencies);
  if (dependencyGraph.cycles.length > 0) {
    throw new Error("Care dependency graph contains a cycle.");
  }
  const workload = calculateWorkload(input.obligations, occurrences, input.capacity);
  const allFailures = [
    ...workloadCapacityRule(workload),
    ...workAndWindowRules(input.obligations, occurrences, input.capacity),
    ...scheduleCollisionRule(occurrences),
    ...travelBufferRule(input.obligations, occurrences),
    ...transportationRule(input.obligations, occurrences, input.capacity),
    ...caregiverRule(input.obligations, occurrences, input.capacity),
    ...mobilityRule(input.obligations, input.capacity),
    ...dependencyAndDeadlineRules(input.obligations, occurrences, input.dependencies),
    ...tripRules(input.obligations, workload, input.capacity),
  ];
  const deduplicated = deduplicatePrimaryFailures(allFailures);
  const primaryHardFailures = deduplicated.filter((item) => item.severity === "blocking");
  const warnings = deduplicated.filter((item) => item.severity === "warning");
  return {
    workload,
    occurrences,
    dependencyGraph,
    allFailures,
    primaryHardFailures,
    warnings,
    chronologicalBreakpoint: rankChronologicalBreakpoint(primaryHardFailures),
    highestImpactBreakpoint: rankHighestImpactBreakpoint(primaryHardFailures),
  };
}
