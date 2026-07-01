const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function pickRecorderMimeType(candidates = RECORDER_MIME_CANDIDATES): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function createMediaRecorder(stream: MediaStream, preferAudioOnly = true): MediaRecorder {
  const candidates = preferAudioOnly
    ? RECORDER_MIME_CANDIDATES.filter((t) => t.startsWith("audio/"))
    : RECORDER_MIME_CANDIDATES;

  const mimeType = pickRecorderMimeType(candidates);
  return mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
}

export function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}
