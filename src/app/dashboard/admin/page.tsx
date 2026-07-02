import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthUserId } from "@/lib/session";

export default async function AdminPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.role !== "ADMIN") redirect("/dashboard");

  const [users, interviews, reports] = await Promise.all([
    prisma.user.count(),
    prisma.interview.count(),
    prisma.report.count(),
  ]);

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, email: true, name: true, role: true, createdAt: true, _count: { select: { interviews: true } } },
  });

  return (
    <main className="space-y-8 p-6 md:p-8">
      <header>
        <h1 className="text-3xl font-bold text-white">Admin panel</h1>
        <p className="mt-1 text-zinc-400">Platform overview and user management</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Users", value: users },
          { label: "Interviews", value: interviews },
          { label: "Reports", value: reports },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-zinc-400">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">Recent users</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2 pr-4">Interviews</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u: any) => (
                <tr key={u.id} className="border-t border-white/5">
                  <td className="py-2 pr-4">{u.email}</td>
                  <td className="py-2 pr-4">{u.role}</td>
                  <td className="py-2 pr-4">{u._count.interviews}</td>
                  <td className="py-2">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
