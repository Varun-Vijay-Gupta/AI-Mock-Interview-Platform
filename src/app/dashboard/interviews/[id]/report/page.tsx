import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthUserId } from "@/lib/session";
import { ReportView } from "@/components/ReportView";

export default async function InterviewReportPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  const interview = await prisma.interview.findFirst({
    where: { id, userId },
    include: { jobContext: true, report: true },
  });

  if (!interview) notFound();
  if (!interview.report) {
    return (
      <main className="p-8 text-white">
        <p>Report is still being generated...</p>
      </main>
    );
  }

  return <ReportView interview={interview} report={interview.report} />;
}
