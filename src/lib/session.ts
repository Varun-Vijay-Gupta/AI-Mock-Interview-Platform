import { getServerSession } from "next-auth/next";
import { authConfig } from "@/lib/auth";

export function getSession() {
  return getServerSession(authConfig as never);
}

export async function getAuthUserId() {
  const session = (await getSession()) as { user?: { id?: string } } | null;
  return session?.user?.id;
}
