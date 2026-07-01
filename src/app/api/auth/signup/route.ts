import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getFreeInterviewLimit } from "@/lib/subscription";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        subscription: {
          create: {
            plan: "FREE",
            interviewsLimit: getFreeInterviewLimit(),
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Please enter a valid name, email, and password (min 6 characters)." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "";
    if (message.includes("does not exist")) {
      return Response.json(
        { error: "Database is not set up. Run: npx prisma migrate dev" },
        { status: 503 },
      );
    }

    console.error("Signup error:", error);
    return Response.json({ error: "Could not create account. Please try again." }, { status: 500 });
  }
}
