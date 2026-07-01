import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { formatPercent } from "@/lib/utils";

export type InterviewRow = {
  id: string;
  mode: string;
  difficulty: string;
  status: string;
  overallScore: number | null;
  companyName: string | null;
  roleName: string | null;
  createdAt: string;
};

export function RecentInterviews({ interviews }: { interviews: InterviewRow[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Recent interviews</h3>
        <Link href="/dashboard/setup" className="text-sm text-blue-400 hover:underline">
          Start new
        </Link>
      </div>

      {interviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
          <p className="text-sm text-zinc-400">No interviews yet.</p>
          <Link href="/dashboard/setup" className="mt-3 inline-flex items-center gap-1 text-sm text-blue-400 hover:underline">
            Set up your first mock interview <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {interviews.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-xl bg-zinc-900/60 px-4 py-3">
              <div>
                <p className="font-medium text-white">
                  {item.companyName ?? "Practice"} · {item.roleName ?? item.mode}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="h-3 w-3" />
                  {new Date(item.createdAt).toLocaleDateString()} · {item.difficulty} · {item.status}
                </p>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-lg font-semibold text-white">{formatPercent(item.overallScore)}</p>
                  <p className="text-xs text-zinc-500">Overall</p>
                </div>
                {item.status === "COMPLETED" ? (
                  <Link href={`/dashboard/interviews/${item.id}/report`} className="text-sm text-blue-400 hover:underline">
                    View report
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
