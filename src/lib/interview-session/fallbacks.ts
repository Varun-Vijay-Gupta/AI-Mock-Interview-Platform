import type { EvaluationResult, InterviewContext, SessionState } from "./types";

function firstTech(ctx: InterviewContext): string {
  return ctx.techRequirements.split(",")[0]?.trim() || "the required technologies";
}

export function fallbackOpening(ctx: InterviewContext): { opening: string; question: string; topic: string } {
  const opening = `Welcome. I'm your ${ctx.persona} for this ${ctx.mode.toLowerCase()} interview for the ${ctx.roleName} position at ${ctx.companyName}. Let's get started.`;

  if (ctx.mode === "HR") {
    return {
      opening,
      question: "Tell me about yourself and why you're interested in this role.",
      topic: "Introduction",
    };
  }

  if (ctx.mode === "TECHNICAL") {
    return {
      opening,
      question: `Walk me through your experience with ${firstTech(ctx)} and a project where you used it in production.`,
      topic: "Technical Background",
    };
  }

  return {
    opening,
    question: `Describe your relevant experience for this ${ctx.roleName} role, especially with ${firstTech(ctx)}.`,
    topic: "Introduction",
  };
}

const TECH_TOPICS = [
  "Technical Background",
  "System Design",
  "Problem Solving",
  "Architecture",
  "Debugging",
  "Performance",
  "Security",
  "Testing",
];

const HR_TOPICS = [
  "Introduction",
  "Teamwork",
  "Conflict Resolution",
  "Leadership",
  "Career Goals",
  "Communication",
  "Work Ethic",
  "Culture Fit",
];

const MIXED_TOPICS = [
  "Introduction",
  "Technical Background",
  "Behavioral",
  "System Design",
  "Problem Solving",
  "Teamwork",
  "Project Deep Dive",
  "Career Goals",
];

function questionForTopic(ctx: InterviewContext, topic: string): string {
  const tech = firstTech(ctx);

  const bank: Record<string, string> = {
    Introduction: `What attracted you to the ${ctx.roleName} role at ${ctx.companyName}?`,
    "Technical Background": `Describe a challenging project using ${tech}. What was your role and outcome?`,
    "System Design": `How would you design a scalable system for ${ctx.companyName}'s ${ctx.roleName} role using ${ctx.techRequirements}?`,
    "Problem Solving": `Walk me through how you'd debug a production issue in a ${tech}-based service.`,
    Architecture: `Explain how you'd structure a modular codebase for ${ctx.roleName} responsibilities.`,
    Debugging: `Tell me about the hardest bug you've fixed. How did you isolate root cause?`,
    Performance: `How would you identify and fix performance bottlenecks in a ${tech} application?`,
    Security: `What security practices would you apply when building features for ${ctx.companyName}?`,
    Testing: `Describe your approach to testing — unit, integration, and end-to-end — for ${tech} projects.`,
    Teamwork: "Describe a time you collaborated with a difficult teammate. How did you handle it?",
    "Conflict Resolution": "Tell me about a disagreement with a colleague. How was it resolved?",
    Leadership: "Give an example of when you led a initiative without formal authority.",
    "Career Goals": `Where do you see yourself in three years, and how does ${ctx.companyName} fit?`,
    Communication: "How do you explain complex technical concepts to non-technical stakeholders?",
    "Work Ethic": "Describe a time you went above and beyond to deliver under pressure.",
    "Culture Fit": `Why do you want to work at ${ctx.companyName} specifically?`,
    Behavioral: "Tell me about a failure. What did you learn and how did you improve?",
    "Project Deep Dive": `Pick a project from your resume involving ${tech}. Walk me through architecture and trade-offs.`,
  };

  return bank[topic] ?? `Tell me more about your experience relevant to ${ctx.roleName} at ${ctx.companyName}.`;
}

export function fallbackNextQuestion(ctx: InterviewContext, state: SessionState): { question: string; topic: string } {
  const pool =
    ctx.mode === "TECHNICAL" ? TECH_TOPICS : ctx.mode === "HR" ? HR_TOPICS : MIXED_TOPICS;

  const uncovered = pool.find((t) => !state.topicsCovered.includes(t));
  const topic = uncovered ?? pool[state.topicsCovered.length % pool.length] ?? "General";
  const question = questionForTopic(ctx, topic);

  return { question, topic };
}

export function fallbackEvaluation(
  state: SessionState,
  answer: string,
): EvaluationResult {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const vague = words < 20;
  const topicLabel = state.topicsCovered.at(-1) ?? "General";

  const baseScore = Math.min(85, 45 + words * 1.5);

  return {
    technicalAccuracy: baseScore,
    communication: Math.min(90, 50 + words),
    confidence: Math.min(88, 55 + Math.floor(words / 2)),
    grammarIssues: [],
    betterPhrasing: "Use the STAR format: Situation, Task, Action, Result.",
    followUpNeeded: vague && state.followUpsOnTopic < 2,
    followUpQuestion: vague
      ? "Could you go deeper — what was your specific contribution and the measurable outcome?"
      : undefined,
    difficultyDelta: words > 60 ? 0.25 : words < 15 ? -0.25 : 0,
    topicLabel,
    feedback: vague
      ? "Answer was brief. Add concrete examples and metrics."
      : "Solid response. Continue with specific examples.",
  };
}

export function fallbackClosing(ctx: InterviewContext): string {
  return `Thank you for completing this mock interview for ${ctx.roleName} at ${ctx.companyName}. We'll prepare detailed feedback on your responses. Best of luck with your preparation.`;
}

export function isQuotaOrAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { status?: number; code?: string; message?: string };
  return (
    e.status === 429 ||
    e.code === "insufficient_quota" ||
    Boolean(e.message?.includes("quota")) ||
    Boolean(e.message?.includes("OPENAI_API_KEY"))
  );
}
