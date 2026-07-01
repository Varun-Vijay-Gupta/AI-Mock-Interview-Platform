import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { healthRouter } from "./routes/health.routes";
import { interviewRouter } from "./routes/interview.routes";
import { errorMiddleware } from "./middleware/error.middleware";
import { attachInterviewWebSocket } from "./ws/interview.ws";

const app = express();
const port = Number(process.env.BACKEND_PORT ?? 8080);

app.use(helmet());
app.use(cors({ origin: process.env.NEXT_PUBLIC_APP_URL, credentials: true }));
app.use(express.json({ limit: "8mb" }));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.use("/api/health", healthRouter);
app.use("/api/interviews", interviewRouter);
app.use(errorMiddleware);

const server = http.createServer(app);
attachInterviewWebSocket(server);

server.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`WebSocket interview channel: ws://localhost:${port}/ws/interview`);
});
