
import { prisma } from "@/lib/db";
import { chatJson, isLocalAI, parseAiJson } from "@/lib/ai-provider";
import { extractResumeText, parseAiResumeJson, parseResumeLocally } from "@/lib/resume-extract";
import { getAuthUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Please log in to upload a resume." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!(file instanceof File)) {
      return Response.json({ error: "Resume file is required." }, { status: 400 });
    }

    const text = await extractResumeText(file);
    let parsed: Record<string, unknown> = parseResumeLocally(text);

    if (!isLocalAI()) {
      try {
        const raw = await chatJson(
          "Analyze resume. Return JSON: skills[], experience, projects, education, achievements, atsScore (0-100), suggestions[]",
          text.slice(0, 12000),
        );
        if (raw) parsed = parseAiResumeJson(raw);
      } catch (aiError) {
        console.warn("AI resume analysis skipped:", aiError);
      }
    }

    const resume = await prisma.resume.create({
      data: {
        userId,
        filename: file.name,
        originalUrl: `local://${file.name}`,
        extractedText: text,
        parsedJson: parsed as any,
        atsScore: Number(parsed.atsScore ?? 72),
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.filter((s): s is string => typeof s === "string")
          : ["Review resume formatting and add quantified achievements."],
      },
    });

    return Response.json({ resume });
  } catch (error) {
    console.error("Resume upload error:", error);
    const message = error instanceof Error ? error.message : "Resume processing failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
