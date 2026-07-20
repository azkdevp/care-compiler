import { NextResponse } from "next/server";
import { z } from "zod";
import { extractCarePlans } from "@/ai/extract-care-plans";
import { normalizeExtraction } from "@/ai/normalize-extraction";
import { mariaSources } from "@/demo/maria/sources";
import { stressTestWeek } from "@/domain/stress-test-week";
import { applyScenario } from "@/scenarios/apply-scenario";
import { mariaLogisticalScenario } from "@/scenarios/maria-scenario";

const SourceSchema = z.object({
  id: z.string(),
  kind: z.enum(["cardiology_plan", "nephrology_plan", "diabetes_plan", "patient_interview"]),
  title: z.string(),
  author: z.string(),
  recordedAt: z.string().datetime({ offset: true }),
  text: z.string().min(1),
}).strict();

const RequestSchema = z.object({ sources: z.array(SourceSchema).optional() }).strict();

export async function POST(request: Request) {
  try {
    const payload = RequestSchema.parse(await request.json());
    const sources = payload.sources ?? mariaSources;
    const extractionResult = await extractCarePlans(sources);
    const normalized = normalizeExtraction(extractionResult.extraction);
    const baseline = stressTestWeek(normalized);
    const scenario = applyScenario(
      normalized.obligations,
      normalized.capacity,
      mariaLogisticalScenario,
    );
    return NextResponse.json({
      extractionSource: extractionResult.source,
      extractionFallbackReason: extractionResult.fallbackReason,
      extraction: extractionResult.extraction,
      evidence: extractionResult.extraction.obligations.map((item) => ({
        obligationId: item.sourceKey,
        evidence: item.evidence,
      })),
      baseline,
      scenario,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Compilation failed" },
      { status: 400 },
    );
  }
}
