import { prisma } from "@/lib/db";
import { getAuthUserId } from "@/lib/session";
import { initializeInterviewSession } from "@/lib/interview-session/service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const interview = await prisma.interview.findFirst({ where: { id, userId } });
  if (!interview) {
    return Response.json({ error: "Interview not found" }, { status: 404 });
  }

  try {
    const result = await initializeInterviewSession(id);
    return Response.json({
      message: result.message,
      session: result.session,
      history: result.history,
      done: result.done,
      degradedMode: result.degradedMode ?? false,
      phase: result.session.phase,
      topicProgress: `${result.session.topicsCovered.length}/${result.session.topicTarget}`,
    });
  } catch (error) {
    console.error("Begin interview error:", error);
    const message =
      error instanceof Error && error.message.includes("quota")
        ? "OpenAI quota exceeded. Add billing at platform.openai.com or retry — fallback mode should activate automatically."
        : "Failed to start interview session";
    return Response.json({ error: message }, { status: 500 });
  }
}
