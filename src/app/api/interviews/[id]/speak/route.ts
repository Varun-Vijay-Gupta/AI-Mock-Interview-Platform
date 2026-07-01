import { prisma } from "@/lib/db";
import { getAuthUserId } from "@/lib/session";
import { synthesizeSpeech } from "@/lib/interview-session/service";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  text: z.string().min(1).max(4096),
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

  try {
    const { text } = schema.parse(await request.json());
    const audioBuffer = await synthesizeSpeech(text);

    if (!audioBuffer) {
      return Response.json({ fallback: "browser" }, { status: 503 });
    }

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return Response.json({ error: "Failed to synthesize speech" }, { status: 500 });
  }
}
