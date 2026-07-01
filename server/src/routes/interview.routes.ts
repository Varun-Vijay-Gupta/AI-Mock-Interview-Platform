import { Router } from "express";
import {
  beginInterviewController,
  speakController,
  submitInterviewController,
  transcribeController,
  turnController,
} from "../controllers/interview.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const interviewRouter = Router();

interviewRouter.use(authMiddleware);

interviewRouter.post("/:id/begin", beginInterviewController);
interviewRouter.post("/:id/turn", turnController);
interviewRouter.post("/:id/speak", speakController);
interviewRouter.post("/:id/transcribe", transcribeController);
interviewRouter.post("/:id/submit", submitInterviewController);
