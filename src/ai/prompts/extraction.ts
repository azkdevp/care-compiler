import type { SourceDocument } from "@/domain/models";

export const EXTRACTION_SYSTEM_PROMPT = `You extract explicit care-plan facts into the supplied schema.

Rules:
- Extract only obligations explicitly supported by the documents.
- Attach an exact source quote to every obligation and logistical alternative.
- Use null for unknown values.
- Never calculate feasibility, workload totals, or medical priority.
- Never recommend changing treatment, medication, dosage, monitoring, or clinical priority.
- Never invent obligations, travel times, waiting times, preparation time, administrative time, or modality options.
- documentedActiveMinutes may contain only an explicitly stated active duration. Otherwise use null.
- Recurrence must use the executable discriminated contract. Extract only raw date phrases, raw clock-time phrases, and qualitative labels that appear verbatim in cited evidence. Never produce or normalize an ISO timestamp.
- A qualitative label such as morning or evening is not a clock time. Never convert it to 07:00, 19:00, or another invented time.
- Keep action cadence separate from durationScope. Use combined_per_day when one documented duration covers all daily actions together, and per_occurrence only when the duration applies to each action.
- For daily or weekly instructions, extract the stated frequency count even when no clock time or weekday is provided; leave temporalWindows or daysOfWeek empty rather than inventing schedule details.
- Use recurrence type unknown only when the source does not provide enough information to determine whether or how often the obligation recurs.
- Report ambiguity in unresolvedStatements rather than guessing.`;

export function buildExtractionInput(sources: SourceDocument[]): string {
  return sources
    .map(
      (source) =>
        `SOURCE ${source.id}\nTITLE: ${source.title}\nAUTHOR: ${source.author}\n${source.text}`,
    )
    .join("\n\n---\n\n");
}
