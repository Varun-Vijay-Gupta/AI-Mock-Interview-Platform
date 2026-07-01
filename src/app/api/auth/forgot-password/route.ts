import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const { email } = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email } });

    let resetUrl: string | undefined;
    if (user?.passwordHash) {
      const resetToken = randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      if (process.env.NODE_ENV !== "production") {
        console.info(`[dev] Password reset link for ${email}: ${resetUrl}`);
      }
    }

    return Response.json({
      message: "If an account exists with that email, a reset link has been sent.",
      ...(process.env.NODE_ENV !== "production" && user ? { devResetUrl: resetUrl } : {}),
    });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
