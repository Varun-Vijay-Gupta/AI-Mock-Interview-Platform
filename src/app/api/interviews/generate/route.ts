import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUserId } from "@/lib/session";

const schema = z.object({
  companyName: z.string().min(1),
  roleName: z.string().min(1),
  jobDescription: z.string().min(10),
  techRequirements: z.string().min(1),
  experienceReq: z.string().min(1),
  mode: z.enum(["TECHNICAL", "HR", "MIXED"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  codingEnabled: z.boolean().optional(),
});

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = schema.parse(await request.json());

    const latestResume = await prisma.resume.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const jobContext = await prisma.jobContext.create({
      data: {
        companyName: input.companyName,
        roleName: input.roleName,
        jobDescription: input.jobDescription,
        techRequirements: input.techRequirements,
        experienceReq: input.experienceReq,
      },
    });

    return Response.json({
      jobContextId: jobContext.id,
      mode: input.mode,
      difficulty: input.difficulty,
      codingEnabled: input.codingEnabled ?? false,
      resumeAvailable: Boolean(latestResume),
      resumeSummary: latestResume?.parsedJson ?? null,
    });
  } catch (error) {
    console.error("Generate interview context error:", error);
    return Response.json({ error: "Failed to prepare interview context" }, { status: 500 });
  }
}
