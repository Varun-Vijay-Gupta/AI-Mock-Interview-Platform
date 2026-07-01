import { prisma } from "@/lib/db";

const DEFAULT_FREE_LIMIT = Number(process.env.FREE_INTERVIEW_LIMIT ?? 50);

export function getFreeInterviewLimit() {
  return Number.isFinite(DEFAULT_FREE_LIMIT) && DEFAULT_FREE_LIMIT > 0 ? DEFAULT_FREE_LIMIT : 50;
}

export async function ensureUserSubscription(userId: string) {
  return prisma.subscription.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      plan: "FREE",
      interviewsLimit: getFreeInterviewLimit(),
    },
  });
}

export async function canStartInterview(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const subscription = await ensureUserSubscription(userId);
  const plan = subscription.plan;

  if (plan === "PREMIUM") {
    return { allowed: true };
  }

  const completedCount = await prisma.interview.count({
    where: { userId, status: "COMPLETED" },
  });

  const limit = getFreeInterviewLimit();

  if (completedCount >= limit) {
    return {
      allowed: false,
      reason: `Free plan limit reached (${limit} completed interviews). Delete old interviews from dashboard or upgrade to continue.`,
    };
  }

  return { allowed: true };
}
