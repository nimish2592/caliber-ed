import { applyGoalGrade } from "../grading/apply";
import { heuristicEngine } from "./heuristic";
import { createOpenaiEngine } from "./openai";
import { DEFAULT_HIGHER_ED_PROFILE } from "./profiles";
import type { AssessmentEngine, AssessmentProfile, EngineResult, StructuredCv, GoalContext } from "./types";
import { appConfig } from "../config";
import { extractStructuredCv } from "./extractStructured";
import { extractCvText } from "./extractText";

export function getAssessmentEngine(settings?: {
  engine?: string | null;
  model?: string | null;
}): AssessmentEngine {
  const engine = (settings?.engine || appConfig.assessmentEngine).toLowerCase();
  const model = settings?.model?.trim() || appConfig.openaiModel;
  if (engine === "openai" && appConfig.openaiKey) {
    return createOpenaiEngine(model);
  }
  return heuristicEngine;
}

export async function analyzeCv(params: {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  profile?: AssessmentProfile;
  goal?: GoalContext;
  engine?: string | null;
  model?: string | null;
}): Promise<{ text: string; structured: StructuredCv; result: EngineResult }> {
  const profile = params.profile ?? DEFAULT_HIGHER_ED_PROFILE;
  const text = await extractCvText(params.bytes, params.fileName, params.mimeType);
  if (text.replace(/\s+/g, "").length < 40) {
    throw new Error("We could not read enough text from that file. Try a text-based PDF or DOCX.");
  }
  const structured = extractStructuredCv(text);
  const engine = getAssessmentEngine({ engine: params.engine, model: params.model });
  const finish = (result: EngineResult) => {
    const graded = applyGoalGrade(result, { structured, text, goal: params.goal });
    return { text, structured, result: graded };
  };
  try {
    const result = await engine.score({ text, structured, profile, goal: params.goal });
    return finish(result);
  } catch (err) {
    if (engine.name !== "heuristic") {
      const result = await heuristicEngine.score({ text, structured, profile, goal: params.goal });
      return finish(result);
    }
    throw err;
  }
}

export { DEFAULT_HIGHER_ED_PROFILE, extractStructuredCv, extractCvText };
