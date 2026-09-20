import { appConfig } from "../config";

/** Fallback for completed OpenAI rows stored before token usage was persisted. */
const ESTIMATED_PROMPT_TOKENS = 8000;
const ESTIMATED_COMPLETION_TOKENS = 1000;

export function computeAiCostUsd(promptTokens: number, completionTokens: number): number {
  const input = Math.max(0, promptTokens) * (appConfig.openaiInputUsdPerMillion / 1_000_000);
  const output = Math.max(0, completionTokens) * (appConfig.openaiOutputUsdPerMillion / 1_000_000);
  return Number((input + output).toFixed(6));
}

export function estimatedOpenAiCostUsd(): number {
  return computeAiCostUsd(ESTIMATED_PROMPT_TOKENS, ESTIMATED_COMPLETION_TOKENS);
}
