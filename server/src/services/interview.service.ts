import {
  finalizeInterviewAndReport,
  initializeInterviewSession,
  processInterviewTurn,
  synthesizeSpeech,
  transcribeAudio,
} from "../../../src/lib/interview-session/service";
import { prisma } from "../../../src/lib/db";

export async function beginInterview(interviewId: string, userId: string) {
  const interview = await prisma.interview.findFirst({ where: { id: interviewId, userId } });
  if (!interview) throw new Error("Interview not found");
  return initializeInterviewSession(interviewId);
}

export async function submitTurn(interviewId: string, userId: string, answer: string) {
  const interview = await prisma.interview.findFirst({ where: { id: interviewId, userId } });
  if (!interview) throw new Error("Interview not found");
  return processInterviewTurn(interviewId, answer);
}

export async function finishInterview(interviewId: string, userId: string) {
  return finalizeInterviewAndReport(interviewId, userId);
}

export async function textToSpeech(text: string) {
  return synthesizeSpeech(text);
}

export async function speechToText(buffer: Buffer, filename: string) {
  return transcribeAudio(buffer, filename);
}

export { initializeInterviewSession, processInterviewTurn, finalizeInterviewAndReport };
