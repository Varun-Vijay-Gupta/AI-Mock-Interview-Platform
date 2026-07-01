import { NextFunction, Request, Response } from "express";

export function errorMiddleware(err: Error, _req: Request, res: Response, next: NextFunction) {
  void next;
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
