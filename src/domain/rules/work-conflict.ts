import type {
  CareObligation,
  FeasibilityFailure,
  ObligationOccurrence,
  PatientCapacity,
} from "../models";
import { containedInDailyWindow, overlapsDailyWindow } from "../time";
import { failure } from "./helpers";

export function workAndWindowRules(
  obligations: CareObligation[],
  occurrences: ObligationOccurrence[],
  capacity: PatientCapacity,
): FeasibilityFailure[] {
  const byId = new Map(obligations.map((item) => [item.id, item]));
  const failures: FeasibilityFailure[] = [];
  for (const occurrence of occurrences) {
    if (!occurrence.start) continue;
    const obligation = byId.get(occurrence.obligationId);
    if (
      !obligation ||
      obligation.kind !== "appointment" ||
      obligation.attendanceMode === "telehealth"
    ) continue;
    const duration = obligation.burden.active.minutesPerOccurrence;
    const key = `time-access:${occurrence.id}`;
    if (overlapsDailyWindow(occurrence.start, duration, capacity.workSchedule)) {
      failures.push(
        failure({
          id: `failure:work:${occurrence.id}`,
          problemKey: key,
          type: "work_conflict",
          severity: "blocking",
          occurredAt: occurrence.start,
          involvedObligationIds: [obligation.id],
          lostMinutes: duration,
          explanation: `${obligation.title} conflicts with Maria's work schedule.`,
        }),
      );
    }
    if (!containedInDailyWindow(occurrence.start, duration, capacity.availableHealthcareWindows)) {
      failures.push(
        failure({
          id: `failure:window:${occurrence.id}`,
          problemKey: key,
          type: "outside_healthcare_window",
          severity: "blocking",
          occurredAt: occurrence.start,
          involvedObligationIds: [obligation.id],
          lostMinutes: duration,
          explanation: `${obligation.title} falls outside Maria's healthcare windows.`,
        }),
      );
    }
  }
  return failures;
}
