import { zodTextFormat } from "openai/helpers/zod";
import { createOpenAIClient } from "./client";
import { CONVERSATION_BRIEF_SYSTEM_PROMPT } from "./prompts/conversation-brief";
import {
  CareConversationBriefSchema,
  type CareConversationBrief,
} from "./schemas";

export const deterministicConversationBrief: CareConversationBrief = {
  headline: "Maria's care plans require more time than her week can sustain",
  patientSummary:
    "Maria's combined plans require 21 hours and 1 minute of weekly healthcare work against 7 hours of sustainable capacity. The logistical scenario reduces this to 13 hours and 1 minute, but she remains overloaded.",
  questionsByCareTeam: [
    {
      audience: "cardiology",
      questions: ["Could the approved video-visit option be used for this follow-up?"],
      relatedFailureIds: ["failure:work:cardiology_visit:1"],
    },
    {
      audience: "nephrology",
      questions: [
        "Can the renal panel and A1c draw be completed together before the nephrology follow-up?",
        "Could the approved telehealth option avoid the walking connection Maria cannot reliably manage?",
      ],
      relatedFailureIds: ["failure:dependency:renal_before_nephrology", "failure:mobility:nephrology_visit"],
    },
    {
      audience: "diabetes",
      questions: ["Could the approved video-visit option be used this week?"],
      relatedFailureIds: ["failure:work:diabetes_visit:1"],
    },
    {
      audience: "care_coordinator",
      questions: [
        "Can pharmacy delivery replace the separate prescription pickup?",
        "After logistical changes, which remaining burdens should Maria's clinical teams discuss together?",
      ],
      relatedFailureIds: ["failure:weekly-overload"],
    },
  ],
  logisticalScenariosToDiscuss: [
    {
      scenarioId: "maria_logistical_relief",
      question: "Could the care teams approve the documented telehealth, consolidated-lab, and delivery options?",
    },
  ],
  unresolvedClinicalQuestions: [
    "How should the clinical teams jointly address the six hours of overload that remains after logistical changes?",
  ],
  safetyNotice:
    "This brief identifies workload and logistical barriers. It does not change medications, treatments, monitoring requirements, or clinical priorities.",
};

const FORBIDDEN = [
  /skip(?:ping)?\s+(?:care|medication|monitoring)/i,
  /stop(?:ping)?\s+(?:a\s+)?medication/i,
  /change\s+(?:the\s+)?dosage/i,
  /remove\s+(?:the\s+)?(?:treatment|monitoring|appointment)/i,
];

export function assertBriefSafety(brief: CareConversationBrief): void {
  const text = JSON.stringify(brief);
  if (FORBIDDEN.some((pattern) => pattern.test(text))) {
    throw new Error("Conversation brief contains a prohibited clinical recommendation.");
  }
}

export async function requestLiveConversationBrief(
  deterministicInput: unknown,
): Promise<CareConversationBrief> {
  const client = createOpenAIClient();
  const response = await client.responses.parse({
    model: "gpt-5.6",
    input: [
      { role: "system", content: CONVERSATION_BRIEF_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(deterministicInput) },
    ],
    text: { format: zodTextFormat(CareConversationBriefSchema, "care_conversation_brief") },
  });
  if (!response.output_parsed) throw new Error("GPT-5.6 returned no parsed brief.");
  const brief = CareConversationBriefSchema.parse(response.output_parsed);
  assertBriefSafety(brief);
  return brief;
}

export async function generateConversationBrief(
  deterministicInput: unknown,
  liveGenerator: (input: unknown) => Promise<CareConversationBrief> = requestLiveConversationBrief,
): Promise<{ brief: CareConversationBrief; source: "live_gpt" | "fallback" }> {
  try {
    const brief = CareConversationBriefSchema.parse(await liveGenerator(deterministicInput));
    assertBriefSafety(brief);
    return { brief, source: "live_gpt" };
  } catch {
    return { brief: structuredClone(deterministicConversationBrief), source: "fallback" };
  }
}
