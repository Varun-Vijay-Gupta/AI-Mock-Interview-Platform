import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const report = await prisma.report.findFirst({
    where: { shareToken: token },
    include: {
      interview: { include: { jobContext: true } },
    },
  });

  if (!report) {
    return Response.json({ error: "Report not found" }, { status: 404 });
  }

  const history = Array.isArray(report.interview.conversationHistory)
    ? report.interview.conversationHistory
    : [];

  return Response.json({
    report: {
      strengths: report.strengths,
      weaknesses: report.weaknesses,
      suggestions: report.suggestions,
      grammarFeedback: report.grammarFeedback,
      conversationSummary: report.conversationSummary,
      resumeJobFitScore: report.resumeJobFitScore,
      resumeJobFitNotes: report.resumeJobFitNotes,
      technicalScore: report.technicalScore,
      communicationScore: report.communicationScore,
      confidenceScore: report.confidenceScore,
      hrScore: report.hrScore,
      behavioralScore: report.behavioralScore,
      overallScore: report.overallScore,
      answerAnalysis: report.answerAnalysis,
      idealAnswers: report.idealAnswers,
    },
    interview: {
      mode: report.interview.mode,
      difficulty: report.interview.difficulty,
      persona: report.interview.interviewerPersona,
      companyName: report.interview.jobContext?.companyName,
      roleName: report.interview.jobContext?.roleName,
      createdAt: report.interview.createdAt,
      conversationHistory: history,
    },
  });
}
