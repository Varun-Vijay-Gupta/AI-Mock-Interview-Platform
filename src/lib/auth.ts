import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getFreeInterviewLimit } from "@/lib/subscription";

const credentialSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" as const },
  providers: [
    Google({ clientId: process.env.GOOGLE_CLIENT_ID ?? "", clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "" }),
    Credentials({
      name: "Email",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = credentialSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined, image: user.image ?? undefined };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }: { user: { email?: string | null; name?: string | null; image?: string | null }; account?: { provider?: string } }) {
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        if (!existing) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              subscription: {
                create: { plan: "FREE", interviewsLimit: getFreeInterviewLimit() },
              },
            },
          });
        }
      }
      return true;
    },
    async jwt({ token }: { token: { email?: string | null; sub?: string } }) {
      if (token.sub) return token;
      if (!token.email) return token;
      try {
        const user = await prisma.user.findUnique({ where: { email: token.email } });
        if (user) token.sub = user.id;
      } catch (error) {
        console.error("JWT callback DB lookup failed:", error);
      }
      return token;
    },
    async session({ session, token }: { session: { user?: { id?: string } }; token: { sub?: string } }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
