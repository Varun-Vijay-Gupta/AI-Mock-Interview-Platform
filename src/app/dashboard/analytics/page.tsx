import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { getDashboardData } from "@/lib/dashboard";
import { getAuthUserId } from "@/lib/session";

export default async function AnalyticsPage() {
  const userId = await getAuthUserId();
  if (!userId) return null;

  const data = await getDashboardData(userId);

  return (
    <main className="space-y-8 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="mt-2 text-zinc-400">Track technical, communication, and confidence growth over time.</p>
      </div>
      <StatsCards stats={data.stats} />
      <PerformanceChart data={data.trend} />
    </main>
  );
}
