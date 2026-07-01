import NextAuth from "next-auth/next";
import { authConfig } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = NextAuth(authConfig as never);

export { handler as GET, handler as POST };
