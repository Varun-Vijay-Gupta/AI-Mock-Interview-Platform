import { prisma } from "@/lib/db";
import { getAuthUserId } from "@/lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const interview = await prisma.interview.findFirst({
    where: { id, userId },
    include: { jobContext: true, report: true },
  });

  if (!interview) {
    return Response.json({ error: "Interview not found" }, { status: 404 });
  }

  return Response.json({ interview });
}
