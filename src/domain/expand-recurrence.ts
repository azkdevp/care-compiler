import type { CareObligation, ObligationOccurrence } from "./models";
import { addMinutes } from "./time";

const WEEK_DATES: Record<number, string> = {
  1: "2026-07-20",
  2: "2026-07-21",
  3: "2026-07-22",
  4: "2026-07-23",
  5: "2026-07-24",
  6: "2026-07-25",
  0: "2026-07-26",
};

function occurrenceStarts(obligation: CareObligation): string[] {
  if (obligation.recurrence.frequency === "once") {
    return obligation.fixedStart ? [obligation.fixedStart] : [];
  }

  const days = obligation.recurrence.daysOfWeek;
  const times = obligation.recurrence.timesOfDay;
  const starts: string[] = [];
  for (const day of days) {
    for (const time of times) {
      starts.push(`${WEEK_DATES[day]}T${time}:00-05:00`);
    }
  }
  return starts.slice(0, obligation.recurrence.occurrencesInHorizon);
}

export function expandRecurrence(obligation: CareObligation): ObligationOccurrence[] {
  const active = obligation.burden.active.minutesPerOccurrence;
  if (
    obligation.burden.active.durationScope === "combined_per_day" &&
    obligation.recurrence.occurrencesInHorizon !== 7
  ) {
    throw new Error(`${obligation.id} must compile combined-per-day burden into seven weekly workload occurrences.`);
  }
  if (
    obligation.burden.active.durationScope === "combined_per_week" &&
    obligation.recurrence.occurrencesInHorizon !== 1
  ) {
    throw new Error(`${obligation.id} must compile combined-per-week burden into one weekly workload occurrence.`);
  }
  const invisible =
    obligation.burden.travel.minutesPerOccurrence +
    obligation.burden.waiting.minutesPerOccurrence +
    obligation.burden.preparation.minutesPerOccurrence +
    obligation.burden.administrative.minutesPerOccurrence;

  const starts = occurrenceStarts(obligation);
  if (
    obligation.recurrence.occurrencesInHorizon > 0 &&
    starts.length === 0
  ) {
    throw new Error(
      `Recurring obligation ${obligation.id} expanded to zero occurrences.`,
    );
  }
  if (starts.length !== obligation.recurrence.occurrencesInHorizon) {
    throw new Error(
      `Obligation ${obligation.id} expanded to ${starts.length} occurrences; expected ${obligation.recurrence.occurrencesInHorizon}.`,
    );
  }

  return starts.map((start, index) => ({
    id: `${obligation.id}:${index + 1}`,
    obligationId: obligation.id,
    start,
    end: addMinutes(start, active),
    visibleMinutes: active,
    invisibleMinutes: invisible,
    tripId:
      obligation.burden.travel.minutesPerOccurrence > 0
        ? `trip:${obligation.id}:${index + 1}`
        : null,
  }));
}

export function expandAllRecurrences(
  obligations: CareObligation[],
): ObligationOccurrence[] {
  return obligations.flatMap(expandRecurrence).sort((a, b) =>
    (a.start ?? "").localeCompare(b.start ?? ""),
  );
}
