import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { getAuthUserId, getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, userId] = await Promise.all([getSession(), getAuthUserId()]);
  if (!userId) {
    redirect("/login");
  }

  const user = (session as { user?: { name?: string | null; email?: string | null } } | null)?.user;
  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,#111827_0,#09090b_45%,#020617_100%)]">
      <DashboardSidebar userName={user?.name} userEmail={user?.email} isAdmin={dbUser?.role === "ADMIN"} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
