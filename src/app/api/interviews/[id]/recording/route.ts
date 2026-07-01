import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { uploadRecording } from "@/lib/cloudinary";
import { getAuthUserId } from "@/lib/session";

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

  const formData = await request.formData();
  const recording = formData.get("recording");
  if (!(recording instanceof File)) {
    return Response.json({ error: "Recording file is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await recording.arrayBuffer());
  let recordingUrl: string | null = null;

  try {
    recordingUrl = await uploadRecording(buffer, id, recording.type);
  } catch (error) {
    console.warn("Cloudinary upload failed, using local storage:", error);
  }

  if (!recordingUrl) {
    const recordingsDir = path.join(process.cwd(), "public", "recordings");
    await mkdir(recordingsDir, { recursive: true });
    const extension = recording.type.includes("mp4") ? "mp4" : "webm";
    const filename = `${id}.${extension}`;
    await writeFile(path.join(recordingsDir, filename), buffer);
    recordingUrl = `/recordings/${filename}`;
  }

  await prisma.interview.update({
    where: { id },
    data: { recordingUrl },
  });

  return Response.json({ recordingUrl });
}
