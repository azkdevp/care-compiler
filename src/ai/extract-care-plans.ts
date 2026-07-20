import { zodTextFormat } from "openai/helpers/zod";
import type { SourceDocument } from "@/domain/models";
import { mariaExpectedExtraction } from "@/demo/maria/expected-extraction";
import { createOpenAIClient } from "./client";
import { buildExtractionInput, EXTRACTION_SYSTEM_PROMPT } from "./prompts/extraction";
import { CarePlanExtractionSchema, type CarePlanExtraction } from "./schemas";

export type ExtractionSource = "live_gpt" | "fallback";

export interface ExtractionResult {
  extraction: CarePlanExtraction;
  source: ExtractionSource;
  fallbackReason: string | null;
}

export async function requestLiveExtraction(
  sources: SourceDocument[],
): Promise<CarePlanExtraction> {
  const client = createOpenAIClient({ timeout: 90_000, maxRetries: 0 });
  const response = await client.responses.parse({
    model: "gpt-5.6",
    reasoning: { effort: "none" },
    input: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: buildExtractionInput(sources) },
    ],
    text: { format: zodTextFormat(CarePlanExtractionSchema, "care_plan_extraction") },
  });
  if (!response.output_parsed) throw new Error("GPT-5.6 returned no parsed extraction.");
  return CarePlanExtractionSchema.parse(response.output_parsed);
}

export async function extractCarePlans(
  sources: SourceDocument[],
  liveExtractor: (sources: SourceDocument[]) => Promise<CarePlanExtraction> = requestLiveExtraction,
): Promise<ExtractionResult> {
  try {
    const extraction = CarePlanExtractionSchema.parse(await liveExtractor(sources));
    return { extraction, source: "live_gpt", fallbackReason: null };
  } catch (error) {
    return {
      extraction: structuredClone(mariaExpectedExtraction),
      source: "fallback",
      fallbackReason: error instanceof Error ? error.message : "Unknown extraction failure",
    };
  }
}
