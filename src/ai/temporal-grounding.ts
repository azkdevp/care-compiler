import type { EvidenceRef } from "@/domain/models";

export interface ExtractedTemporalExpression {
  rawDatePhrase: string | null;
  rawTimePhrase: string | null;
  qualitativeTimeLabels: Array<"morning" | "afternoon" | "evening" | "night" | "before_breakfast">;
  evidence: EvidenceRef;
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function comparable(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function validateTemporalEvidence(expression: ExtractedTemporalExpression): void {
  const quote = comparable(expression.evidence.quote);
  for (const phrase of [expression.rawDatePhrase, expression.rawTimePhrase]) {
    if (phrase && !quote.includes(comparable(phrase))) {
      throw new Error(`Temporal phrase "${phrase}" is not present in its evidence quote.`);
    }
  }
  for (const label of expression.qualitativeTimeLabels) {
    const phrase = label.replaceAll("_", " ");
    if (!quote.includes(phrase)) {
      throw new Error(`Qualitative time "${label}" is not present in its evidence quote.`);
    }
  }
}

export function parseClockPhrase(rawTimePhrase: string): string {
  const match = rawTimePhrase.trim().match(/^(1[0-2]|0?[1-9]):([0-5]\d)\s*(AM|PM)$/i);
  if (!match) throw new Error(`Unsupported source time phrase: ${rawTimePhrase}.`);
  let hour = Number(match[1]);
  if (match[3].toUpperCase() === "AM") hour = hour === 12 ? 0 : hour;
  else hour = hour === 12 ? 12 : hour + 12;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

export function parseSourceBackedDateTime(
  expression: ExtractedTemporalExpression,
  referenceStart: string | null,
  patientTimezone: string,
): string {
  validateTemporalEvidence(expression);
  if (!expression.rawDatePhrase || !expression.rawTimePhrase) {
    throw new Error("A source-explicit timestamp requires both a raw date and raw clock time.");
  }
  if (!referenceStart) {
    throw new Error("A deterministic date reference is required to resolve an omitted year.");
  }
  const dateMatch = expression.rawDatePhrase.trim().match(
    /^(?:(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),?\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,\s*(\d{4}))?$/i,
  );
  if (!dateMatch) throw new Error(`Unsupported source date phrase: ${expression.rawDatePhrase}.`);
  const reference = referenceStart.match(/^(\d{4})-\d{2}-\d{2}T/);
  if (!reference) throw new Error("Reference timestamp is not canonical.");
  const year = dateMatch[4] ? Number(dateMatch[4]) : Number(reference[1]);
  const month = MONTHS[dateMatch[2].toLowerCase()];
  const day = Number(dateMatch[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) throw new Error(`Invalid source date: ${expression.rawDatePhrase}.`);
  if (dateMatch[1] && WEEKDAYS[date.getUTCDay()] !== dateMatch[1].toLowerCase()) {
    throw new Error(`Weekday does not match source date: ${expression.rawDatePhrase}.`);
  }
  const clock = parseClockPhrase(expression.rawTimePhrase);
  let zoneName: string | undefined;
  try {
    zoneName = new Intl.DateTimeFormat("en-US", {
      timeZone: patientTimezone,
      timeZoneName: "longOffset",
    }).formatToParts(new Date(Date.UTC(year, month - 1, day, 12)))
      .find((part) => part.type === "timeZoneName")?.value;
  } catch {
    throw new Error(`Unsupported patient timezone: ${patientTimezone}.`);
  }
  const offsetMatch = zoneName?.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  const offset = zoneName === "GMT" ? "+00:00" : offsetMatch
    ? `${offsetMatch[1]}${offsetMatch[2]}:${offsetMatch[3]}`
    : null;
  if (!offset) throw new Error(`Could not resolve patient timezone offset: ${patientTimezone}.`);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${clock}:00${offset}`;
}
