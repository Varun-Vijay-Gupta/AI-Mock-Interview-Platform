import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { jwtVerify } from "jose";
import { initializeInterviewSession, processInterviewTurn } from "../../../src/lib/interview-session/service";
import { prisma } from "../../../src/lib/db";

type ClientMessage =
  | { type: "begin" }
  | { type: "turn"; answer: string }
  | { type: "ping" };

type AuthPayload = { userId: string; interviewId: string };

async function verifyToken(token: string): Promise<AuthPayload | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const userId = String(payload.userId ?? "");
    const interviewId = String(payload.interviewId ?? "");
    if (!userId || !interviewId) return null;
    return { userId, interviewId };
  } catch {
    return null;
  }
}

function send(ws: WebSocket, data: Record<string, unknown>) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function attachInterviewWebSocket(server: import("node:http").Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    if (url.pathname !== "/ws/interview") {
      return;
    }

    const token = url.searchParams.get("token");
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const auth = await verifyToken(token);
    if (!auth) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, auth);
    });
  });

  wss.on("connection", (ws: WebSocket, auth: AuthPayload) => {
    send(ws, { type: "connected", interviewId: auth.interviewId });

    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as ClientMessage;

        if (msg.type === "ping") {
          send(ws, { type: "pong" });
          return;
        }

        const interview = await prisma.interview.findFirst({
          where: { id: auth.interviewId, userId: auth.userId },
        });
        if (!interview) {
          send(ws, { type: "error", error: "Interview not found" });
          return;
        }

        if (msg.type === "begin") {
          send(ws, { type: "status", status: "thinking" });
          const result = await initializeInterviewSession(auth.interviewId);
          send(ws, {
            type: "interviewer",
            message: result.message,
            session: result.session,
            history: result.history,
            done: result.done,
            degradedMode: result.degradedMode ?? false,
          });
          return;
        }

        if (msg.type === "turn") {
          if (!msg.answer?.trim()) {
            send(ws, { type: "error", error: "Answer required" });
            return;
          }
          send(ws, { type: "status", status: "evaluating" });
          const result = await processInterviewTurn(auth.interviewId, msg.answer.trim());
          send(ws, {
            type: "interviewer",
            message: result.message,
            session: result.session,
            history: result.history,
            done: result.done,
            evaluation: result.evaluation,
          });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        send(ws, { type: "error", error: "Processing failed" });
      }
    });
  });

  return wss;
}
