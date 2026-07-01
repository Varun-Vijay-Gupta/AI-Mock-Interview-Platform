import Link from "next/link";
import { ArrowRight, FileText, Sparkles } from "lucide-react";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { RecentInterviews } from "@/components/dashboard/recent-interviews";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { getDashboardData } from "@/lib/dashboard";
import { getAuthUserId, getSession } from "@/lib/session";
import { formatPercent } from "@/lib/utils";

export default async function DashboardPage() {
  const [session, userId] = await Promise.all([getSession(), getAuthUserId()]);
  if (!userId) return null;

  const data = await getDashboardData(userId);
  const userName = (session as { user?: { name?: string | null } } | null)?.user?.name ?? "Developer";

  return (
    <main className="space-y-8 p-6 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400">Welcome back</p>
          <h1 className="text-3xl font-bold text-white">{userName}</h1>
          <p className="mt-1 text-zinc-400">Track progress, manage your resume, and launch AI mock interviews.</p>
        </div>
        <Link
          href="/dashboard/setup"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          Start mock interview
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <StatsCards stats={data.stats} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PerformanceChart data={data.trend} />
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" />
              <h3 className="font-semibold text-white">Resume</h3>
            </div>
            {data.latestResume ? (
              <>
                <p className="truncate text-sm text-zinc-300">{data.latestResume.filename}</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  ATS Score: {formatPercent(data.latestResume.atsScore)}
                </p>
                {data.latestResume.skills.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {data.latestResume.skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : null}
                <Link href="/dashboard/resume" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
                  Manage resume
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-400">Upload your resume to unlock personalized questions.</p>
                <Link href="/dashboard/resume" className="mt-3 inline-block text-sm text-blue-400 hover:underline">
                  Upload resume
                </Link>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h3 className="font-semibold text-white">Suggested improvements</h3>
            </div>
            {data.suggestions.length > 0 ? (
              <ul className="space-y-2 text-sm text-zinc-300">
                {data.suggestions.map((item) => (
                  <li key={item} className="rounded-lg bg-zinc-900/60 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">Complete a resume upload or interview to get AI suggestions.</p>
            )}
          </div>
        </div>
      </div>

      <RecentInterviews interviews={data.recentInterviews} />
    </main>
  );
}
