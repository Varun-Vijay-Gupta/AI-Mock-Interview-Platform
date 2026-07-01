import type { ConversationTurn, InterviewContext } from "./types";
import { fallbackEvaluation } from "./fallbacks";
import type { SessionState } from "./types";

type ReportData = {
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  hrScore: number;
  behavioralScore: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  grammarFeedback: string[];
  conversationSummary: string;
  resumeJobFitScore: number;
  resumeJobFitNotes: string;
  answerAnalysis: Array<{
    question: string;
    yourAnswer: string;
    grammarCorrections?: string;
    betterWayToSay?: string;
    idealAnswer?: string;
    score?: number;
    feedback?: string;
  }>;
  idealAnswers: Record<string, string>;
};

function pairQandA(history: ConversationTurn[]) {
  const pairs: Array<{ question: string; answer: string }> = [];
  let lastQuestion = "";

  for (const turn of history) {
    if (turn.role === "interviewer") {
      lastQuestion = turn.content;
    } else if (turn.role === "candidate" && lastQuestion) {
      pairs.push({ question: lastQuestion, answer: turn.content });
      lastQuestion = "";
    }
  }
  return pairs;
}

export function generateLocalReport(
  ctx: InterviewContext,
  history: ConversationTurn[],
  session: SessionState,
): ReportData {
  const pairs = pairQandA(history);
  const wordCounts = pairs.map((p) => p.answer.trim().split(/\s+/).filter(Boolean).length);
  const avgWords = wordCounts.length ? wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length : 0;

  const communicationScore = Math.min(92, Math.round(50 + avgWords * 1.2));
  const confidenceScore = Math.min(90, Math.round(55 + pairs.length * 4));
  const technicalScore = Math.min(88, Math.round(52 + avgWords * 0.9 + session.topicsCovered.length * 2));
  const hrScore = ctx.mode === "HR" ? communicationScore : Math.round((communicationScore + confidenceScore) / 2);
  const behavioralScore = hrScore;
  const overallScore = Math.round(
    (technicalScore + communicationScore + confidenceScore + hrScore + behavioralScore) / 5,
  );

  const strengths: string[] = [];
  if (pairs.length >= 5) strengths.push("Completed most of the interview with consistent participation.");
  if (avgWords >= 40) strengths.push("Provided detailed answers with good depth.");
  if (session.topicsCovered.length >= 4) strengths.push("Covered a broad range of interview topics.");
  if (strengths.length === 0) strengths.push("Showed willingness to engage throughout the session.");

  const weaknesses: string[] = [];
  if (avgWords < 25) weaknesses.push("Answers were often too brief — expand with examples and outcomes.");
  if (pairs.length < session.topicTarget - 1) weaknesses.push("Did not reach all planned topics.");
  weaknesses.push("Practice structuring answers using STAR (Situation, Task, Action, Result).");

  const answerAnalysis = pairs.map((pair) => {
    const words = pair.answer.trim().split(/\s+/).filter(Boolean).length;
    const evalResult = fallbackEvaluation(
      { ...session, topicsCovered: session.topicsCovered.length ? session.topicsCovered : ["General"] } as SessionState,
      pair.answer,
    );
    return {
      question: pair.question,
      yourAnswer: pair.answer,
      betterWayToSay: evalResult.betterPhrasing,
      idealAnswer: `Reference ${ctx.roleName} requirements at ${ctx.companyName} with a concrete project example and measurable result.`,
      score: Math.min(90, Math.round(45 + words * 1.3)),
      feedback: evalResult.feedback,
    };
  });

  return {
    technicalScore,
    communicationScore,
    confidenceScore,
    hrScore,
    behavioralScore,
    overallScore,
    strengths,
    weaknesses,
    suggestions: [
      "Record yourself answering common questions and review clarity.",
      "Prepare 3 project stories aligned with the job description.",
      "Research the company and tie answers to their tech stack.",
    ],
    grammarFeedback: avgWords < 20 ? ["Try fuller sentences with clear subject-verb structure."] : [],
    conversationSummary:
      session.closingMessage ??
      `Completed a ${ctx.mode.toLowerCase()} mock interview for ${ctx.roleName} at ${ctx.companyName} covering ${session.topicsCovered.length} topics.`,
    resumeJobFitScore: Math.min(85, Math.round(60 + session.topicsCovered.length * 3)),
    resumeJobFitNotes: `Based on interview performance for ${ctx.roleName}. Upload an updated resume highlighting ${ctx.techRequirements.split(",")[0]?.trim() ?? "relevant skills"}.`,
    answerAnalysis,
    idealAnswers: Object.fromEntries(
      session.topicsCovered.map((topic) => [
        topic,
        `Strong answer for ${topic}: context, your action, tools used (${ctx.techRequirements}), and measurable outcome.`,
      ]),
    ),
  };
}
