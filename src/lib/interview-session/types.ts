export type InterviewPhase = "pending" | "opening" | "questioning" | "closing" | "done";

export type ConversationTurn = {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: string;
  topic?: string;
};

export type EvaluationResult = {
  technicalAccuracy: number;
  communication: number;
  confidence: number;
  grammarIssues: string[];
  betterPhrasing: string;
  followUpNeeded: boolean;
  followUpQuestion?: string;
  difficultyDelta: -0.25 | 0 | 0.25;
  topicLabel: string;
  feedback: string;
};

export type SessionState = {
  phase: InterviewPhase;
  currentQuestion: string | null;
  topicsCovered: string[];
  followUpsOnTopic: number;
  difficulty: number;
  topicTarget: number;
  openingDone: boolean;
  closingMessage: string | null;
  lastEvaluation: EvaluationResult | null;
};

export type InterviewContext = {
  interviewId: string;
  mode: "TECHNICAL" | "HR" | "MIXED";
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  persona: string;
  companyName: string;
  roleName: string;
  jobDescription: string;
  techRequirements: string;
  experienceReq: string;
  resumeSummary: Record<string, unknown>;
};

export const DEFAULT_SESSION_STATE: SessionState = {
  phase: "pending",
  currentQuestion: null,
  topicsCovered: [],
  followUpsOnTopic: 0,
  difficulty: 1.5,
  topicTarget: 8,
  openingDone: false,
  closingMessage: null,
  lastEvaluation: null,
};

export function difficultyToNumber(level: string): number {
  if (level === "BEGINNER") return 1;
  if (level === "ADVANCED") return 2.5;
  return 1.75;
}

export function personaStyle(persona: string): string {
  const styles: Record<string, string> = {
    "Senior Software Engineer": "Direct, technical, probes depth on architecture and trade-offs.",
    "Engineering Manager": "Balanced technical and leadership focus, asks about collaboration and impact.",
    "Tech Lead": "System design oriented, asks about mentoring and technical decisions.",
    "HR Recruiter": "Warm, structured, focuses on communication and culture fit.",
    "Hiring Manager": "Professional, evaluates role alignment and career motivation.",
  };
  return styles[persona] ?? "Professional and conversational.";
}
