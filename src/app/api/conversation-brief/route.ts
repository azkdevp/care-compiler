import { NextResponse } from "next/server";
import { generateConversationBrief } from "@/ai/generate-conversation-brief";
import { z } from "zod";

const RequestSchema = z.object({
  baseline: z.unknown(),
  counterfactual: z.unknown(),
  evidence: z.array(z.unknown()),
  allowedScenarios: z.array(z.unknown()),
}).strict();

export async function POST(request: Request) {
  try {
    const deterministicResult = RequestSchema.parse(await request.json());
    const result = await generateConversationBrief(deterministicResult);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Brief generation failed" },
      { status: 400 },
    );
  }
}
