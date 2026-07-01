"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Radio, Video, VideoOff } from "lucide-react";
import { useInterviewSession } from "@/hooks/useInterviewSession";
import { createMediaRecorder } from "@/lib/media-recorder";

function Waveform({ level, active }: { level: number; active: boolean }) {
  return (
    <div className="flex h-12 items-end justify-center gap-1">
      {Array.from({ length: 12 }).map((_, i) => {
        const h = active ? Math.max(8, (level / 100) * 48 * (0.5 + (i % 5) * 0.12)) : 8;
        return (
          <div
            key={i}
            className="w-1.5 rounded-full bg-blue-500 transition-all duration-100"
            style={{ height: `${h}px`, opacity: active ? 0.6 + (i % 3) * 0.15 : 0.25 }}
          />
        );
      })}
    </div>
  );
}

function InterviewRoom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewId = searchParams.get("id");

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [timer, setTimer] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isRecordingAnswer, setIsRecordingAnswer] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const {
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
  } = useInterviewSession(interviewId);

  const attachVideoStream = useCallback(async (video: HTMLVideoElement, stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      setCameraError("No camera detected. Check that a webcam is connected.");
      return;
    }

    setCameraError("");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    try {
      await video.play();
    } catch {
      /* may need user gesture on some browsers */
    }
  }, []);

  const videoCallbackRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node && mediaStream && cameraOn) {
        void attachVideoStream(node, mediaStream);
      }
    },
    [mediaStream, cameraOn, attachVideoStream],
  );

  useEffect(() => {
    if (!mediaStream || !videoRef.current || !cameraOn) return;
    void attachVideoStream(videoRef.current, mediaStream);
  }, [mediaStream, cameraOn, status, attachVideoStream]);

  useEffect(() => {
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!mediaStream) return;
    mediaStream.getVideoTracks().forEach((track) => {
      track.enabled = cameraOn;
    });
    if (cameraOn && videoRef.current) {
      void attachVideoStream(videoRef.current, mediaStream);
    }
  }, [mediaStream, cameraOn, attachVideoStream]);

  useEffect(() => {
    if (!mediaStream || status === "connecting") return;

    let recorder: MediaRecorder | null = null;
    const startTimer = window.setTimeout(() => {
      try {
        recorder = createMediaRecorder(mediaStream, true);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.start(1000);
        mediaRecorderRef.current = recorder;
      } catch {
        /* optional session recording */
      }
    }, 1500);

    return () => {
      window.clearTimeout(startTimer);
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
      mediaRecorderRef.current = null;
    };
  }, [mediaStream, status]);

  useEffect(() => {
    if (status === "listening" && micOn && !isRecordingAnswer && !done) {
      setIsRecordingAnswer(true);
      startRecordingAnswer();
    }
  }, [status, micOn, isRecordingAnswer, done, startRecordingAnswer]);

  const finishInterview = useCallback(async () => {
    if (!interviewId || submitting) return;
    setSubmitting(true);

    try {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          recorder.stop();
        });
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        if (blob.size > 0) {
          const formData = new FormData();
          formData.append("recording", blob, `${interviewId}.webm`);
          await fetch(`/api/interviews/${interviewId}/recording`, { method: "POST", body: formData });
        }
      }

      const submitRes = await fetch(`/api/interviews/${interviewId}/submit`, { method: "POST" });
      if (!submitRes.ok) {
        const data = await submitRes.json();
        throw new Error(data.error ?? "Failed to generate report");
      }
      router.push(`/dashboard/interviews/${interviewId}/report`);
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  }, [interviewId, submitting, router]);

  useEffect(() => {
    if (done && !submitting) {
      const t = setTimeout(() => finishInterview(), 2000);
      return () => clearTimeout(t);
    }
  }, [done, submitting, finishInterview]);

  async function handleMicRelease() {
    if (!isRecordingAnswer) return;
    setIsRecordingAnswer(false);
    await stopRecordingAndSubmit();
  }

  const minutes = String(Math.floor(timer / 60)).padStart(2, "0");
  const seconds = String(timer % 60).padStart(2, "0");
  const statusLabel =
    status === "speaking"
      ? "Interviewer speaking"
      : status === "listening"
        ? "Listening — speak your answer"
        : status === "processing"
          ? "Evaluating..."
          : status === "connecting"
            ? "Starting..."
            : status === "done"
              ? "Interview complete"
              : "Ready";

  if (!interviewId) {
    return <main className="min-h-screen bg-zinc-950 p-8 text-red-300">Missing interview session.</main>;
  }

  if (status === "connecting" && history.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
        <div className="h-16 w-16 animate-pulse rounded-full bg-blue-600/30 ring-2 ring-blue-500" />
        <p className="mt-4 text-zinc-400">Starting your interview with {persona}...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-white">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400">Voice interview · {mode}</p>
          <h1 className="text-xl font-semibold">{persona}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300">
            <Radio className="h-3 w-3" /> Live
          </span>
          <div className="rounded-xl bg-zinc-900 px-4 py-2 font-mono text-sm">
            {minutes}:{seconds}
          </div>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-800 to-zinc-900 p-8">
            <div className="flex flex-col items-center text-center">
              <div
                className={`mb-4 flex h-28 w-28 items-center justify-center rounded-full ring-2 ${
                  status === "speaking" ? "animate-pulse bg-blue-600/40 ring-blue-400" : "bg-zinc-700/50 ring-zinc-600"
                }`}
              >
                <span className="text-3xl">🎙</span>
              </div>
              <p className="text-lg font-medium">{persona}</p>
              <p className="mt-1 text-sm text-zinc-400">{statusLabel}</p>
              <div className="mt-6 w-full max-w-md">
                <Waveform level={listeningLevel} active={status === "listening" && micOn} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              {session
                ? `Topic ${session.topicsCovered.length}/${session.topicTarget} · Difficulty ${session.difficulty.toFixed(1)}`
                : "Interview in progress"}
            </p>
            <p className="mt-3 text-lg leading-relaxed">{currentInterviewerText || "..."}</p>
            {status === "listening" && liveTranscript ? (
              <p className="mt-3 rounded-lg bg-zinc-900/80 p-3 text-sm text-zinc-300">{liveTranscript}</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="mb-3 text-sm font-medium text-zinc-300">Conversation</p>
            <div className="max-h-48 space-y-2 overflow-y-auto text-sm">
              {history.map((turn, i) => (
                <div
                  key={`${turn.timestamp}-${i}`}
                  className={`rounded-lg px-3 py-2 ${
                    turn.role === "interviewer" ? "bg-blue-500/10 text-blue-100" : "bg-zinc-800/80 text-zinc-200"
                  }`}
                >
                  <span className="text-xs uppercase text-zinc-500">{turn.role}</span>
                  <p className="mt-0.5">{turn.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
            {cameraOn ? (
              <video
                ref={videoCallbackRef}
                autoPlay
                muted
                playsInline
                className="h-48 w-full object-cover [transform:scaleX(-1)]"
              />
            ) : (
              <div className="flex h-48 items-center justify-center bg-zinc-950 text-sm text-zinc-500">Camera off</div>
            )}
            {cameraOn && cameraError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 p-4 text-center text-sm text-amber-300">
                {cameraError}
              </div>
            ) : null}
            <p className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-red-300">● Recording</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMicOn((v) => !v)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 ${
                micOn ? "border-green-500/30 bg-green-500/10" : "border-white/10 bg-zinc-900"
              }`}
            >
              {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              {micOn ? "Mic on" : "Muted"}
            </button>
            <button
              type="button"
              onClick={() => setCameraOn((v) => !v)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 ${
                cameraOn ? "border-green-500/30 bg-green-500/10" : "border-white/10 bg-zinc-900"
              }`}
            >
              {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              Camera
            </button>
          </div>

          {status === "listening" && micOn ? (
            <button
              type="button"
              onClick={handleMicRelease}
              className="w-full rounded-xl bg-blue-600 py-3 font-medium hover:bg-blue-500"
            >
              Done speaking
            </button>
          ) : null}

          <button
            type="button"
            onClick={finishInterview}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-medium disabled:opacity-50"
          >
            <PhoneOff className="h-4 w-4" />
            {submitting ? "Generating report..." : "End interview"}
          </button>
        </section>
      </div>
    </main>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950 p-8 text-white">Loading interview room...</main>}>
      <InterviewRoom />
    </Suspense>
  );
}
