import { appConfig } from "../config";
import { extractStructuredCv } from "./extractStructured";
import { extractCvText } from "./extractText";
import { heuristicEngine } from "./heuristic";
import { openaiEngine } from "./openai";
import { DEFAULT_HIGHER_ED_PROFILE } from "./profiles";
import type { AssessmentEngine, AssessmentProfile, EngineResult, StructuredCv, GoalContext } from "./types";

export function getAssessmentEngine(): AssessmentEngine {
  if (appConfig.assessmentEngine === "openai" && appConfig.openaiKey) {
    return openaiEngine;
  }
  return heuristicEngine;
}

export async function analyzeCv(params: {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  profile?: AssessmentProfile;
  goal?: GoalContext;
}): Promise<{ text: string; structured: StructuredCv; result: EngineResult }> {
  const profile = params.profile ?? DEFAULT_HIGHER_ED_PROFILE;
  const text = await extractCvText(params.bytes, params.fileName, params.mimeType);
  if (text.replace(/\s+/g, "").length < 40) {
    throw new Error("We could not read enough text from that file. Try a text-based PDF or DOCX.");
  }
  const structured = extractStructuredCv(text);
  const engine = getAssessmentEngine();
  try {
    const result = await engine.score({ text, structured, profile, goal: params.goal });
    return { text, structured, result };
  } catch (err) {
    if (engine.name !== "heuristic") {
      const result = await heuristicEngine.score({ text, structured, profile, goal: params.goal });
      return { text, structured, result };
    }
    throw err;
  }
}

export { DEFAULT_HIGHER_ED_PROFILE, extractStructuredCv, extractCvText };
