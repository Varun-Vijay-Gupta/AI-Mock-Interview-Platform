import { prisma } from "@/lib/db";
import type { TrendPoint } from "@/components/dashboard/performance-chart";
import type { InterviewRow } from "@/components/dashboard/recent-interviews";

function average(values: Array<number | null | undefined>) {
  const nums = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (nums.length === 0) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

export async function getDashboardData(userId: string) {
  const [interviews, latestResume, reports] = await Promise.all([
    prisma.interview.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { jobContext: true },
    }),
    prisma.resume.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const completed = interviews.filter((i) => i.status === "COMPLETED");

  const stats = [
    { label: "Total interviews", value: String(interviews.length), hint: `${completed.length} completed` },
    { label: "Average score", value: formatPercentValue(average(completed.map((i) => i.overallScore))) },
    { label: "Communication", value: formatPercentValue(average(completed.map((i) => i.communicationScore))) },
    { label: "Technical accuracy", value: formatPercentValue(average(completed.map((i) => i.technicalScore))) },
    { label: "Confidence", value: formatPercentValue(average(completed.map((i) => i.confidenceScore))) },
  ];

  const trend: TrendPoint[] = completed
    .slice(0, 6)
    .reverse()
    .map((item, index) => ({
      label: `#${index + 1}`,
      technical: item.technicalScore ?? 0,
      communication: item.communicationScore ?? 0,
      confidence: item.confidenceScore ?? 0,
    }));

  const recentInterviews: InterviewRow[] = interviews.slice(0, 6).map((item) => ({
    id: item.id,
    mode: item.mode,
    difficulty: item.difficulty,
    status: item.status,
    overallScore: item.overallScore,
    companyName: item.jobContext?.companyName ?? null,
    roleName: item.jobContext?.roleName ?? null,
    createdAt: item.createdAt.toISOString(),
  }));

  const suggestions = [
    ...(latestResume?.suggestions ?? []),
    ...reports.flatMap((r) => r.suggestions).slice(0, 3),
  ].slice(0, 5);

  return {
    stats,
    trend,
    recentInterviews,
    latestResume: latestResume
      ? {
          id: latestResume.id,
          filename: latestResume.filename,
          atsScore: latestResume.atsScore,
          uploadedAt: latestResume.createdAt.toISOString(),
          skills: extractSkills(latestResume.parsedJson),
        }
      : null,
    suggestions,
  };
}

function formatPercentValue(value: number | null) {
  if (value == null) return "—";
  return `${Math.round(value)}%`;
}

function extractSkills(parsedJson: unknown) {
  if (!parsedJson || typeof parsedJson !== "object") return [] as string[];
  const data = parsedJson as Record<string, unknown>;
  if (Array.isArray(data.skills)) {
    return data.skills.filter((s): s is string => typeof s === "string").slice(0, 8);
  }
  return [] as string[];
}
