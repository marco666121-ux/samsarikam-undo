import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "stopped" | "error";

export function useVoiceRecorder(maxSeconds = 120) {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone not supported in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("stopped");
        cleanup();
      };
      rec.start();
      recorderRef.current = rec;
      setSeconds(0);
      setAudioUrl(null);
      setState("recording");
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= maxSeconds) {
            rec.stop();
          }
          return next;
        });
      }, 1000);
    } catch (e: any) {
      setError(e?.message ?? "Microphone permission denied");
      setState("error");
      cleanup();
    }
  }, [maxSeconds, cleanup]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSeconds(0);
    setState("idle");
    setError(null);
  }, [audioUrl, cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { state, seconds, audioUrl, error, start, stop, reset };
}