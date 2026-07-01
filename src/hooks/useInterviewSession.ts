"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSpeechRecognitionCtor } from "@/lib/media-recorder";

export type ConversationTurn = {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: string;
  topic?: string;
};

export type SessionState = {
  phase: string;
  currentQuestion: string | null;
  topicsCovered: string[];
  followUpsOnTopic: number;
  difficulty: number;
  topicTarget: number;
  openingDone: boolean;
  closingMessage: string | null;
};

export type InterviewStatus = "idle" | "connecting" | "speaking" | "listening" | "processing" | "done" | "error";

export function useInterviewSession(interviewId: string | null) {
  const [status, setStatus] = useState<InterviewStatus>("idle");
  const [error, setError] = useState("");
  const [persona, setPersona] = useState("AI Interviewer");
  const [mode, setMode] = useState("");
  const [session, setSession] = useState<SessionState | null>(null);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [currentInterviewerText, setCurrentInterviewerText] = useState("");
  const [listeningLevel, setListeningLevel] = useState(0);
  const [done, setDone] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechTextRef = useRef("");
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const speakWithBrowser = useCallback(async (text: string) => {
    if (!("speechSynthesis" in window) || !text.trim()) return;
    await new Promise<void>((resolve) => {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.05;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    });
  }, []);

  const speakText = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setStatus("speaking");
      await speakWithBrowser(text);
    },
    [speakWithBrowser],
  );

  const handleInterviewerMessage = useCallback(
    async (message: string, nextSession: SessionState, nextHistory: ConversationTurn[], isDone: boolean) => {
      setCurrentInterviewerText(message);
      setSession(nextSession);
      setHistory(nextHistory);
      setDone(isDone);
      await speakText(message);
      if (isDone) setStatus("done");
      else setStatus("listening");
    },
    [speakText],
  );

  const beginViaRest = useCallback(async () => {
    if (!interviewId) return;
    const res = await fetch(`/api/interviews/${interviewId}/begin`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to begin");
    await handleInterviewerMessage(data.message, data.session, data.history, data.done);
  }, [interviewId, handleInterviewerMessage]);

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!interviewId || !answer.trim() || done) return;
      setStatus("processing");
      setLiveTranscript("");

      const res = await fetch(`/api/interviews/${interviewId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answer.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Turn failed");
      await handleInterviewerMessage(data.message, data.session, data.history, data.done);
    },
    [interviewId, done, handleInterviewerMessage],
  );

  const stopSpeechRecognition = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  const startSpeechRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return false;

    stopSpeechRecognition();
    speechTextRef.current = "";

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += piece;
        else interim += piece;
      }
      if (finalText) {
        speechTextRef.current = `${speechTextRef.current} ${finalText}`.trim();
      }
      setLiveTranscript(`${speechTextRef.current} ${interim}`.trim());
    };

    recognition.addEventListener("error", () => {
      /* browser may stop recognition between turns */
    });

    recognition.start();
    recognitionRef.current = recognition;
    return true;
  }, [stopSpeechRecognition]);

  const startRecordingAnswer = useCallback(() => {
    if (!startSpeechRecognition()) {
      setError("Speech recognition not supported. Use Chrome or Edge.");
    }
  }, [startSpeechRecognition]);

  const stopRecordingAndSubmit = useCallback(async () => {
    stopSpeechRecognition();
    const text = speechTextRef.current.trim();
    speechTextRef.current = "";
    setLiveTranscript("");
    if (text) await submitAnswer(text);
    return text;
  }, [submitAnswer, stopSpeechRecognition]);

  useEffect(() => {
    if (!interviewId) return;

    let cancelled = false;

    async function init() {
      try {
        setStatus("connecting");

        const metaRes = await fetch(`/api/interviews/${interviewId}`);
        const meta = await metaRes.json();

        const stream = await navigator.mediaDevices
          .getUserMedia({
            audio: true,
            video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          })
          .catch(async () =>
            navigator.mediaDevices.getUserMedia({
              audio: true,
              video: true,
            }),
          );

        if (!metaRes.ok) throw new Error(meta.error ?? "Interview not found");

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setPersona(meta.interview.interviewerPersona ?? "AI Interviewer");
        setMode(meta.interview.mode ?? "");
        streamRef.current = stream;
        setMediaStream(stream);

        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setListeningLevel(Math.min(100, avg * 1.2));
          animFrameRef.current = requestAnimationFrame(tick);
        };
        tick();

        await beginViaRest();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to initialize interview");
          setStatus("error");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      stopSpeechRecognition();
      window.speechSynthesis?.cancel();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [interviewId, beginViaRest, stopSpeechRecognition]);

  return {
    status,
    error,
    persona,
    mode,
    session,
    history,
    currentInterviewerText,
    listeningLevel,
    liveTranscript,
    done,
    mediaStream,
    startRecordingAnswer,
    stopRecordingAndSubmit,
    submitAnswer,
  };
}
