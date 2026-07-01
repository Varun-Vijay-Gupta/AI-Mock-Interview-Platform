import { Request, Response } from "express";
import { z } from "zod";
import {
  beginInterview,
  finishInterview,
  speechToText,
  submitTurn,
  textToSpeech,
} from "../services/interview.service";

const turnSchema = z.object({ answer: z.string().min(1) });
const speakSchema = z.object({ text: z.string().min(1).max(4096) });

export async function beginInterviewController(req: Request, res: Response) {
  const interviewId = String(req.params.id);
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (req.auth?.interviewId && req.auth.interviewId !== interviewId) {
    return res.status(403).json({ error: "Token not valid for this interview" });
  }

  try {
    const result = await beginInterview(interviewId, userId);
    return res.json(result);
  } catch (error) {
    console.error("beginInterviewController:", error);
    return res.status(500).json({ error: "Failed to begin interview" });
  }
}

export async function turnController(req: Request, res: Response) {
  const interviewId = String(req.params.id);
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { answer } = turnSchema.parse(req.body);
    const result = await submitTurn(interviewId, userId, answer);
    return res.json(result);
  } catch (error) {
    console.error("turnController:", error);
    return res.status(500).json({ error: "Failed to process turn" });
  }
}

export async function speakController(req: Request, res: Response) {
  try {
    const { text } = speakSchema.parse(req.body);
    const audio = await textToSpeech(text);
    res.setHeader("Content-Type", "audio/mpeg");
    return res.send(Buffer.from(audio));
  } catch (error) {
    console.error("speakController:", error);
    return res.status(500).json({ error: "TTS failed" });
  }
}

export async function transcribeController(req: Request, res: Response) {
  try {
    const base64 = String(req.body.audioBase64 ?? "");
    const filename = String(req.body.filename ?? "answer.webm");
    if (!base64) return res.status(400).json({ error: "audioBase64 required" });
    const buffer = Buffer.from(base64, "base64");
    const text = await speechToText(buffer, filename);
    return res.json({ text });
  } catch (error) {
    console.error("transcribeController:", error);
    return res.status(500).json({ error: "Transcription failed" });
  }
}

export async function submitInterviewController(req: Request, res: Response) {
  const interviewId = String(req.params.id);
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await finishInterview(interviewId, userId);
    return res.json(result);
  } catch (error) {
    console.error("submitInterviewController:", error);
    return res.status(500).json({ error: "Failed to finalize interview" });
  }
}
