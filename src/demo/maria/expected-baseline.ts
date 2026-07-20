import { stressTestWeek } from "@/domain/stress-test-week";
import { mariaDependencies, mariaObligations } from "./obligations";
import { mariaCapacity } from "./patient";

export function compileMariaBaseline() {
  return stressTestWeek({
    obligations: mariaObligations,
    dependencies: mariaDependencies,
    capacity: mariaCapacity,
  });
}
