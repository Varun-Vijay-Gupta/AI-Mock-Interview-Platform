import { prisma } from "@/lib/db";
import { getAuthUserId } from "@/lib/session";
import { transcribeAudio } from "@/lib/interview-session/service";

export const runtime = "nodejs";

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

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) {
      return Response.json({ error: "Audio file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const text = await transcribeAudio(buffer, audio.name || "answer.webm");

    return Response.json({ text });
  } catch (error) {
    console.error("Transcription error:", error);
    return Response.json({ error: "Failed to transcribe audio" }, { status: 500 });
  }
}
