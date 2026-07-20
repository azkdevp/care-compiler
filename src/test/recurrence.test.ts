import { describe, expect, it } from "vitest";
import { expandRecurrence } from "@/domain/expand-recurrence";
import { mariaObligations } from "@/demo/maria/obligations";

describe("recurrence expansion", () => {
  it("expands twice-daily glucose checks into fourteen occurrences", () => {
    const glucose = mariaObligations.find((item) => item.id === "glucose_checks")!;
    const occurrences = expandRecurrence(glucose);
    expect(occurrences).toHaveLength(14);
    expect(occurrences[0].visibleMinutes).toBe(10);
  });

  it("derives occurrence end time only from active burden", () => {
    const cardiology = mariaObligations.find((item) => item.id === "cardiology_visit")!;
    const [occurrence] = expandRecurrence(cardiology);
    expect(occurrence.start).toBe("2026-07-20T10:00:00-05:00");
    expect(occurrence.end).toBe("2026-07-20T15:45:00.000Z");
  });
});
