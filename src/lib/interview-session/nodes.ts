import { chatJson, parseAiJson } from "@/lib/ai-provider";
import type { ConversationTurn, EvaluationResult, InterviewContext, SessionState } from "./types";
import { personaStyle } from "./types";
import {
  fallbackClosing,
  fallbackEvaluation,
  fallbackNextQuestion,
  fallbackOpening,
} from "./fallbacks";

export const aiFallbackState = { used: false };

function systemBase(ctx: InterviewContext) {
  const modeRule =
    ctx.mode === "TECHNICAL"
      ? "Ask ONLY technical, coding, system design, and project questions."
      : ctx.mode === "HR"
        ? "Ask ONLY HR and behavioral questions."
        : "Mix roughly 70% technical and 30% HR/behavioral.";

  return `You are ${ctx.persona} conducting a ${ctx.mode} mock interview for ${ctx.roleName} at ${ctx.companyName}.
Style: ${personaStyle(ctx.persona)}
${modeRule}
Job: ${ctx.jobDescription}
Tech: ${ctx.techRequirements}
Resume: ${JSON.stringify(ctx.resumeSummary)}
Return valid JSON only.`;
}

async function callAI(system: string, user: string): Promise<string | null> {
  const result = await chatJson(system, user);
  if (!result) aiFallbackState.used = true;
  return result;
}

export async function startInterviewNode(ctx: InterviewContext, state: SessionState): Promise<{
  state: SessionState;
  message: string;
  history: ConversationTurn[];
}> {
  const fallback = fallbackOpening(ctx);
  const raw = await callAI(
    systemBase(ctx),
    `Generate opening + first question. JSON: { "opening": string, "question": string, "topic": string }`,
  );
  const parsed = parseAiJson(raw, fallback);

  const message = `${parsed.opening} ${parsed.question}`.trim();
  const now = new Date().toISOString();

  return {
    state: {
      ...state,
      phase: "questioning",
      openingDone: true,
      currentQuestion: parsed.question,
      topicsCovered: [parsed.topic],
      followUpsOnTopic: 0,
    },
    message,
    history: [{ role: "interviewer", content: message, timestamp: now, topic: parsed.topic }],
  };
}

export async function evaluateAnswerNode(
  ctx: InterviewContext,
  state: SessionState,
  answer: string,
  history: ConversationTurn[],
): Promise<{ evaluation: EvaluationResult; state: SessionState }> {
  const fallback = fallbackEvaluation(state, answer);
  const raw = await callAI(
    systemBase(ctx),
    `Evaluate answer. Q: ${state.currentQuestion} A: ${answer}
JSON: { "technicalAccuracy", "communication", "confidence": 0-100, "grammarIssues": [], "betterPhrasing": string, "followUpNeeded": boolean, "followUpQuestion": string|null, "difficultyDelta": -0.25|0|0.25, "topicLabel": string, "feedback": string }`,
  );
  const evaluation = parseAiJson(raw, fallback);
  const newDifficulty = Math.min(3, Math.max(1, state.difficulty + (evaluation.difficultyDelta ?? 0)));

  return {
    evaluation,
    state: { ...state, lastEvaluation: evaluation, difficulty: newDifficulty },
  };
}

export async function followUpDecisionNode(
  _ctx: InterviewContext,
  state: SessionState,
  evaluation: EvaluationResult,
): Promise<{ isFollowUp: boolean; message: string | null; state: SessionState }> {
  if (evaluation.followUpNeeded && state.followUpsOnTopic < 2 && evaluation.followUpQuestion) {
    return {
      isFollowUp: true,
      message: evaluation.followUpQuestion,
      state: {
        ...state,
        currentQuestion: evaluation.followUpQuestion,
        followUpsOnTopic: state.followUpsOnTopic + 1,
      },
    };
  }
  return { isFollowUp: false, message: null, state: { ...state, followUpsOnTopic: 0 } };
}

export async function generateNextQuestionNode(
  ctx: InterviewContext,
  state: SessionState,
  history: ConversationTurn[],
): Promise<{ state: SessionState; message: string }> {
  if (state.topicsCovered.length >= state.topicTarget) {
    return finishInterviewNode(ctx, state, history);
  }

  const fallback = fallbackNextQuestion(ctx, state);
  const raw = await callAI(
    systemBase(ctx),
    `Next question. Covered: ${state.topicsCovered.join(", ")}. JSON: { "question": string, "topic": string }`,
  );
  const parsed = parseAiJson(raw, fallback);

  return {
    state: {
      ...state,
      phase: "questioning",
      currentQuestion: parsed.question,
      topicsCovered: [...state.topicsCovered, parsed.topic],
      followUpsOnTopic: 0,
    },
    message: parsed.question,
  };
}

export async function finishInterviewNode(
  ctx: InterviewContext,
  state: SessionState,
  history: ConversationTurn[],
): Promise<{ state: SessionState; message: string }> {
  const fallback = { closing: fallbackClosing(ctx) };
  const raw = await callAI(
    systemBase(ctx),
    `Closing message. JSON: { "closing": string }`,
  );
  const parsed = parseAiJson(raw, fallback);

  return {
    state: {
      ...state,
      phase: "closing",
      currentQuestion: null,
      closingMessage: parsed.closing,
    },
    message: parsed.closing,
  };
}
