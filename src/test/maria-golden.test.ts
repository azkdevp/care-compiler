import { describe, expect, it } from "vitest";
import { compileMariaBaseline } from "@/demo/maria/expected-baseline";
import { mariaObligations } from "@/demo/maria/obligations";
import { mariaSources } from "@/demo/maria/sources";

describe("Maria baseline golden output", () => {
  const result = compileMariaBaseline();

  it("calculates the exact approved workload and capacity", () => {
    expect(result.workload.visibleMedicalWorkMinutes).toBe(691);
    expect(result.workload.invisibleCareWorkMinutes).toBe(570);
    expect(result.workload.totalCareLoadMinutes).toBe(1_261);
    expect(result.workload.capacityMinutes).toBe(420);
    expect(result.workload.overloadMinutes).toBe(841);
    expect(result.workload.utilizationPercent).toBeCloseTo(300.24, 2);
    expect(result.workload.trips).toBe(6);
  });

  it("calculates the exact burden-component totals", () => {
    expect(result.workload.byComponent).toEqual({
      active: 691,
      travel: 470,
      waiting: 90,
      preparation: 0,
      administrative: 10,
    });
  });

  it("deduplicates equivalent execution failures into primary conflicts", () => {
    expect(result.primaryHardFailures).toHaveLength(7);
    expect(result.warnings).toHaveLength(2);

    const cardiology = result.primaryHardFailures.find(
      (item) => item.involvedObligationIds[0] === "cardiology_visit",
    );
    expect(cardiology?.type).toBe("work_conflict");
    expect(cardiology?.supportingReasons).toContain("outside_healthcare_window");
  });

  it("ranks weekly overload as the highest-impact breakpoint", () => {
    expect(result.highestImpactBreakpoint).toMatchObject({
      failureId: "failure:weekly-overload",
      explanation: "Weekly workload exceeds capacity by 841 minutes.",
      impactScore: 841,
    });
  });

  it("ranks the Monday 10 AM cardiology work conflict first chronologically", () => {
    expect(result.chronologicalBreakpoint).toMatchObject({
      failureId: "failure:work:cardiology_visit:1",
      explanation: "Heart failure follow-up conflicts with Maria's work schedule.",
    });
    const failure = result.primaryHardFailures.find(
      (item) => item.id === result.chronologicalBreakpoint?.failureId,
    );
    expect(failure?.occurredAt).toBe("2026-07-20T10:00:00-05:00");
  });

  it("builds an acyclic dependency graph with the renal panel first", () => {
    expect(result.dependencyGraph.cycles).toEqual([]);
    expect(
      result.dependencyGraph.topologicalOrder.indexOf("renal_panel"),
    ).toBeLessThan(
      result.dependencyGraph.topologicalOrder.indexOf("nephrology_visit"),
    );
  });

  it("uses no GPT-inferred minute values in the hero fixture", () => {
    for (const obligation of mariaObligations) {
      for (const component of Object.values(obligation.burden)) {
        expect(component.basis).not.toBe("gpt_inferred");
      }
      expect("durationMinutes" in obligation).toBe(false);
    }
  });

  it("contains explicit source evidence for Tuesday lab consolidation", () => {
    const nephrology = mariaSources.find((source) => source.id === "nephrology_plan");
    expect(nephrology?.text).toContain(
      "completed Tuesday, July 21 at 7:30 AM together with the A1c draw",
    );
    expect(nephrology?.text).toContain("approval from both ordering offices");
  });
});
