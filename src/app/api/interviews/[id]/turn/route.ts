import { prisma } from "@/lib/db";
import { getAuthUserId } from "@/lib/session";
import { processInterviewTurn } from "@/lib/interview-session/service";
import { z } from "zod";

const schema = z.object({
  answer: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const interview = await prisma.interview.findFirst({ where: { id, userId } });
  if (!interview) {
    return Response.json({ error: "Interview not found" }, { status: 404 });
  }

  if (interview.status === "COMPLETED") {
    return Response.json({ error: "Interview already completed" }, { status: 400 });
  }

  try {
    const { answer } = schema.parse(await request.json());
    const result = await processInterviewTurn(id, answer);

    return Response.json({
      message: result.message,
      session: result.session,
      history: result.history,
      done: result.done,
      evaluation: result.evaluation,
      phase: result.session.phase,
      topicProgress: `${result.session.topicsCovered.length}/${result.session.topicTarget}`,
    });
  } catch (error) {
    console.error("Interview turn error:", error);
    return Response.json({ error: "Failed to process answer" }, { status: 500 });
  }
}
