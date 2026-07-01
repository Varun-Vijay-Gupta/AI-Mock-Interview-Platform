import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { chatJson, isLocalAI, parseAiJson } from "@/lib/ai-provider";
import type { ConversationTurn, InterviewContext, SessionState } from "./types";
import { DEFAULT_SESSION_STATE, difficultyToNumber } from "./types";
import { runFinishOnly, runStartInterview, runTurnGraph } from "./graph";
import { aiFallbackState } from "./nodes";
import { generateLocalReport } from "./report-generator";

function parseHistory(raw: unknown): ConversationTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t) => t && typeof t === "object" && "role" in t && "content" in t) as ConversationTurn[];
}

function parseSession(raw: unknown, difficulty: string): SessionState {
  if (raw && typeof raw === "object") {
    return { ...DEFAULT_SESSION_STATE, ...(raw as SessionState), difficulty: difficultyToNumber(difficulty) };
  }
  return { ...DEFAULT_SESSION_STATE, difficulty: difficultyToNumber(difficulty) };
}

export async function buildInterviewContext(interviewId: string): Promise<InterviewContext | null> {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: { jobContext: true },
  });
  if (!interview?.jobContext) return null;

  const resume = await prisma.resume.findFirst({
    where: { userId: interview.userId },
    orderBy: { createdAt: "desc" },
  });

  const resumeSummary =
    (interview.resumeContext as Record<string, unknown> | null) ??
    (resume?.parsedJson as Record<string, unknown> | null) ??
    {};

  return {
    interviewId,
    mode: interview.mode,
    difficulty: interview.difficulty,
    persona: interview.interviewerPersona,
    companyName: interview.jobContext.companyName,
    roleName: interview.jobContext.roleName,
    jobDescription: interview.jobContext.jobDescription,
    techRequirements: interview.jobContext.techRequirements,
    experienceReq: interview.jobContext.experienceReq,
    resumeSummary,
  };
}

export async function initializeInterviewSession(interviewId: string) {
  const ctx = await buildInterviewContext(interviewId);
  if (!ctx) throw new Error("Interview context not found");

  const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
  if (!interview) throw new Error("Interview not found");

  let session = parseSession(interview.sessionState, interview.difficulty);
  let history = parseHistory(interview.conversationHistory);

  if (!session.openingDone) {
    aiFallbackState.used = false;
    const started = await runStartInterview(ctx, session);
    session = started.state;
    history = started.history;

    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: "IN_PROGRESS",
        interviewPhase: session.phase,
        sessionState: session as unknown as Prisma.InputJsonValue,
        conversationHistory: history as unknown as Prisma.InputJsonValue,
        topicsCovered: session.topicsCovered,
        currentDifficulty: session.difficulty,
        totalQuestions: session.topicTarget,
      },
    });

    return { message: started.message, session, history, done: false, degradedMode: false };
  }

  const lastInterviewer = [...history].reverse().find((t) => t.role === "interviewer");
  return {
    message: lastInterviewer?.content ?? session.currentQuestion ?? "",
    session,
    history,
    done: session.phase === "closing" || session.phase === "done",
  };
}

export async function processInterviewTurn(interviewId: string, candidateAnswer: string) {
  const ctx = await buildInterviewContext(interviewId);
  if (!ctx) throw new Error("Interview context not found");

  const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
  if (!interview) throw new Error("Interview not found");

  let session = parseSession(interview.sessionState, interview.difficulty);
  const history = parseHistory(interview.conversationHistory);

  if (session.phase === "closing" || session.phase === "done") {
    return { message: session.closingMessage, session, history, done: true, evaluation: null };
  }

  const result = await runTurnGraph(ctx, session, history, candidateAnswer);
  session = result.session;

  if (result.done && session.phase === "closing") {
    session = { ...session, phase: "done" };
  }

  await prisma.interview.update({
    where: { id: interviewId },
    data: {
      interviewPhase: session.phase,
      sessionState: session as unknown as Prisma.InputJsonValue,
      conversationHistory: result.history as unknown as Prisma.InputJsonValue,
      topicsCovered: session.topicsCovered,
      currentDifficulty: session.difficulty,
      followUpCount: { increment: result.evaluation?.followUpNeeded ? 1 : 0 },
      answersJson: result.history.filter((t) => t.role === "candidate") as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    message: result.interviewerMessage,
    session,
    history: result.history,
    done: result.done || session.phase === "done",
    evaluation: result.evaluation,
  };
}

export async function finalizeInterviewAndReport(interviewId: string, userId: string) {
  const ctx = await buildInterviewContext(interviewId);
  if (!ctx) throw new Error("Interview context not found");

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: { jobContext: true },
  });
  if (!interview || interview.userId !== userId) throw new Error("Unauthorized");

  let session = parseSession(interview.sessionState, interview.difficulty);
  let history = parseHistory(interview.conversationHistory);

  if (session.phase !== "done" && session.phase !== "closing") {
    const finished = await runFinishOnly(ctx, session, history);
    session = finished.state;
    history = [
      ...history,
      { role: "interviewer" as const, content: finished.message, timestamp: new Date().toISOString() },
    ];
  }

  const transcript = history.map((t) => `${t.role.toUpperCase()}: ${t.content}`).join("\n\n");

  let reportData = generateLocalReport(ctx, history, session);

  if (!isLocalAI()) {
    try {
      const raw = await chatJson(
        `Expert interview coach. Return strict JSON with technicalScore, communicationScore, confidenceScore, hrScore, behavioralScore, overallScore, strengths[], weaknesses[], suggestions[], grammarFeedback[], conversationSummary, resumeJobFitScore, resumeJobFitNotes, answerAnalysis[], idealAnswers{}`,
        JSON.stringify({ mode: ctx.mode, jobContext: interview.jobContext, conversation: history }),
      );
      if (raw) reportData = { ...reportData, ...parseAiJson(raw, reportData) };
    } catch (e) {
      console.warn("AI report fallback to local:", e);
    }
  }

  const shareToken = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  await prisma.interview.update({
    where: { id: interviewId },
    data: {
      status: "COMPLETED",
      interviewPhase: "done",
      sessionState: session as unknown as Prisma.InputJsonValue,
      conversationHistory: history as unknown as Prisma.InputJsonValue,
      transcript,
      technicalScore: reportData.technicalScore,
      communicationScore: reportData.communicationScore,
      confidenceScore: reportData.confidenceScore,
      behavioralScore: reportData.behavioralScore,
      overallScore: reportData.overallScore,
    },
  });

  const report = await prisma.report.upsert({
    where: { interviewId },
    update: {
      strengths: reportData.strengths,
      weaknesses: reportData.weaknesses,
      suggestions: reportData.suggestions,
      grammarFeedback: reportData.grammarFeedback,
      conversationSummary: reportData.conversationSummary,
      resumeJobFitScore: reportData.resumeJobFitScore,
      resumeJobFitNotes: reportData.resumeJobFitNotes,
      idealAnswers: reportData.idealAnswers as Prisma.InputJsonValue,
      answerAnalysis: reportData.answerAnalysis as Prisma.InputJsonValue,
      technicalScore: reportData.technicalScore,
      communicationScore: reportData.communicationScore,
      confidenceScore: reportData.confidenceScore,
      hrScore: reportData.hrScore,
      behavioralScore: reportData.behavioralScore,
      overallScore: reportData.overallScore,
      shareToken,
    },
    create: {
      userId,
      interviewId,
      strengths: reportData.strengths,
      weaknesses: reportData.weaknesses,
      suggestions: reportData.suggestions,
      grammarFeedback: reportData.grammarFeedback,
      conversationSummary: reportData.conversationSummary,
      resumeJobFitScore: reportData.resumeJobFitScore,
      resumeJobFitNotes: reportData.resumeJobFitNotes,
      idealAnswers: reportData.idealAnswers as Prisma.InputJsonValue,
      answerAnalysis: reportData.answerAnalysis as Prisma.InputJsonValue,
      technicalScore: reportData.technicalScore,
      communicationScore: reportData.communicationScore,
      confidenceScore: reportData.confidenceScore,
      hrScore: reportData.hrScore,
      behavioralScore: reportData.behavioralScore,
      overallScore: reportData.overallScore,
      shareToken,
    },
  });

  return { report, shareToken };
}

export async function synthesizeSpeech(_text: string): Promise<ArrayBuffer | null> {
  return null;
}

export async function transcribeAudio(_buffer: Buffer, _filename: string): Promise<string> {
  return "";
}
