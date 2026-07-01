import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const { token, password } = schema.parse(await request.json());

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return Response.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    return Response.json({ message: "Password updated successfully" });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
