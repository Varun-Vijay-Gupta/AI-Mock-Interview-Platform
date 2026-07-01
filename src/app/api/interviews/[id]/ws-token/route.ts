import { SignJWT } from "jose";
import { prisma } from "@/lib/db";
import { getAuthUserId } from "@/lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const interview = await prisma.interview.findFirst({ where: { id, userId } });
  if (!interview) {
    return Response.json({ error: "Interview not found" }, { status: 404 });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const token = await new SignJWT({ userId, interviewId: id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(new TextEncoder().encode(secret));

  const wsUrl = `ws://localhost:${process.env.BACKEND_PORT ?? 8080}/ws/interview?token=${token}`;

  return Response.json({ token, wsUrl });
}
