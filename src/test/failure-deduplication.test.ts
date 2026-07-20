import { describe, expect, it } from "vitest";
import { deduplicatePrimaryFailures } from "@/domain/deduplicate-failures";
import { failure } from "@/domain/rules/helpers";

describe("primary conflict deduplication", () => {
  it("uses work conflict as primary and stores window failure as support", () => {
    const result = deduplicatePrimaryFailures([
      failure({ id: "window", problemKey: "same", type: "outside_healthcare_window", severity: "blocking", explanation: "window" }),
      failure({ id: "work", problemKey: "same", type: "work_conflict", severity: "blocking", explanation: "work" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("work_conflict");
    expect(result[0].supportingReasons).toEqual(["outside_healthcare_window"]);
  });
});
