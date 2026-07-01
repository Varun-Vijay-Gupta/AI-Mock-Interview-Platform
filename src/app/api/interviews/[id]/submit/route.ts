import { prisma } from "@/lib/db";
import { getAuthUserId } from "@/lib/session";
import { finalizeInterviewAndReport } from "@/lib/interview-session/service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const interview = await prisma.interview.findFirst({ where: { id, userId } });
    if (!interview) {
      return Response.json({ error: "Interview not found" }, { status: 404 });
    }

    const { report, shareToken } = await finalizeInterviewAndReport(id, userId);

    return Response.json({ report, interviewId: id, shareToken });
  } catch (error) {
    console.error("Submit interview error:", error);
    return Response.json({ error: "Failed to process interview report" }, { status: 500 });
  }
}
