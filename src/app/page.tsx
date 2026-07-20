import { DemoExperience, type DemoData } from "@/components/demo-experience";
import { deterministicConversationBrief } from "@/ai/generate-conversation-brief";
import { compileMariaBaseline } from "@/demo/maria/expected-baseline";
import { mariaObligations } from "@/demo/maria/obligations";
import { mariaCapacity } from "@/demo/maria/patient";
import { mariaSources } from "@/demo/maria/sources";
import { applyScenario } from "@/scenarios/apply-scenario";
import { mariaLogisticalScenario } from "@/scenarios/maria-scenario";

export default function Home() {
  const baseline = compileMariaBaseline();
  const scenario = applyScenario(
    mariaObligations,
    mariaCapacity,
    mariaLogisticalScenario,
  );

  const data: DemoData = {
    baseline: {
      workload: baseline.workload,
      hardFailures: baseline.primaryHardFailures.map((failure) => ({
        id: failure.id,
        type: failure.type,
        explanation: failure.explanation,
        obligationIds: failure.involvedObligationIds,
      })),
      warnings: baseline.warnings.map((warning) => ({
        id: warning.id,
        type: warning.type,
        explanation: warning.explanation,
        obligationIds: warning.involvedObligationIds,
      })),
    },
    counterfactual: {
      workload: scenario.counterfactual.workload,
      hardConflictCount: scenario.counterfactual.primaryHardFailures.length,
      conclusion: scenario.conclusion,
    },
    sources: mariaSources
      .filter((source) => source.kind !== "patient_interview")
      .map((source) => ({
        id: source.id,
        title: source.title,
        author: source.author,
        text: source.text,
      })),
    obligations: mariaObligations.map((obligation) => ({
      id: obligation.id,
      title: obligation.title,
      carePlanId: obligation.carePlanId,
      evidence: obligation.evidence,
      burden: obligation.burden,
    })),
    brief: deterministicConversationBrief,
  };

  return <DemoExperience data={data} />;
}
