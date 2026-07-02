
import { prisma } from "@/lib/db";
import { getAuthUserId } from "@/lib/session";
import { canStartInterview } from "@/lib/subscription";
import { DEFAULT_SESSION_STATE, difficultyToNumber } from "@/lib/interview-session/types";
import { z } from "zod";

const schema = z.object({
  jobContextId: z.string(),
  mode: z.enum(["TECHNICAL", "HR", "MIXED"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  interviewerPersona: z.string().min(2),
  codingEnabled: z.boolean().optional(),
});

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = schema.parse(await request.json());

    const access = await canStartInterview(userId);
    if (!access.allowed) {
      return Response.json({ error: access.reason ?? "Interview limit reached." }, { status: 403 });
    }

    const latestResume = await prisma.resume.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const sessionState = {
      ...DEFAULT_SESSION_STATE,
      difficulty: difficultyToNumber(input.difficulty),
      topicTarget: input.mode === "HR" ? 6 : 8,
    };

    const interview = await prisma.interview.create({
      data: {
        userId,
        jobContextId: input.jobContextId,
        mode: input.mode,
        difficulty: input.difficulty,
        interviewerPersona: input.interviewerPersona,
        codingEnabled: input.codingEnabled ?? false,
        status: "CREATED",
        interviewPhase: "pending",
        sessionState,
        resumeContext: latestResume?.parsedJson ?? {},
        askedQuestions: [],
        totalQuestions: sessionState.topicTarget,
      },
    });

    return Response.json({ interviewId: interview.id, interview });
  } catch (error) {
    console.error("Start interview error:", error);
    return Response.json({ error: "Invalid interview payload" }, { status: 400 });
  }
}
