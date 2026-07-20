import OpenAI from "openai";

type OpenAIClientOptions = {
  timeout?: number;
  maxRetries?: number;
};

export function createOpenAIClient(options: OpenAIClientOptions = {}): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({
    apiKey,
    timeout: options.timeout ?? 15_000,
    maxRetries: options.maxRetries ?? 1,
  });
}
