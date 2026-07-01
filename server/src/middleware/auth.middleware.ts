import { jwtVerify } from "jose";
import type { NextFunction, Request, Response } from "express";

export type AuthPayload = {
  userId: string;
  interviewId?: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : (req.query.token as string | undefined);

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const userId = String(payload.userId ?? payload.sub ?? "");
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.auth = {
      userId,
      interviewId: payload.interviewId ? String(payload.interviewId) : undefined,
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
