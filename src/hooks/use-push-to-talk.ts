"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UsePushToTalkOptions {
  onFinalTranscript: (text: string) => void;
  onEmptyTranscript?: () => void;
  onListeningStop?: () => void;
  disabled?: boolean;
  lang?: string;
  /** Auto-stop after the user pauses speaking (default true). */
  autoStopOnSilence?: boolean;
}

const SILENCE_THRESHOLD = 0.022;
const SILENCE_DURATION_MS = 900;
const MIN_SPEECH_MS = 280;
const MAX_LISTEN_MS = 45_000;
const NO_SPEECH_TIMEOUT_MS = 14_000;

function getRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

function watchForSilence(
  stream: MediaStream,
  onSilence: () => void
): () => void {
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.45;

  const source = ctx.createMediaStreamSource(stream);
  source.connect(analyser);

  const samples = new Uint8Array(analyser.fftSize);
  let raf = 0;
  let hasSpoken = false;
  let speechStartedAt = 0;
  let lastSpeechAt = 0;
  const startedAt = performance.now();
  let stopped = false;

  const finish = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    source.disconnect();
    void ctx.close();
    onSilence();
  };

  const tick = () => {
    analyser.getByteTimeDomainData(samples);

    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      const sample = (samples[i]! - 128) / 128;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / samples.length);
    const now = performance.now();

    if (rms > SILENCE_THRESHOLD) {
      if (!hasSpoken) {
        hasSpoken = true;
        speechStartedAt = now;
      }
      lastSpeechAt = now;
    }

    if (
      hasSpoken &&
      now - speechStartedAt >= MIN_SPEECH_MS &&
      now - lastSpeechAt >= SILENCE_DURATION_MS
    ) {
      finish();
      return;
    }

    if (!hasSpoken && now - startedAt >= NO_SPEECH_TIMEOUT_MS) {
      finish();
      return;
    }

    if (now - startedAt >= MAX_LISTEN_MS) {
      finish();
      return;
    }

    raf = requestAnimationFrame(tick);
  };

  void ctx.resume();
  raf = requestAnimationFrame(tick);

  return finish;
}

export function usePushToTalk({
  onFinalTranscript,
  onEmptyTranscript,
  onListeningStop,
  disabled = false,
  lang = "en-US",
  autoStopOnSilence = true,
}: UsePushToTalkOptions) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [supported] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(
      navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function" &&
        typeof MediaRecorder !== "undefined" &&
        getRecorderMimeType()
    );
  });
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const activeRef = useRef(false);
  const mimeTypeRef = useRef("audio/webm");
  const silenceStopRef = useRef<(() => void) | null>(null);
  const onListeningStopRef = useRef(onListeningStop);
  const onEmptyTranscriptRef = useRef(onEmptyTranscript);

  onListeningStopRef.current = onListeningStop;
  onEmptyTranscriptRef.current = onEmptyTranscript;

  const cleanupStream = useCallback(() => {
    silenceStopRef.current?.();
    silenceStopRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    setMicStream(null);
  }, []);

  const transcribeBlob = useCallback(
    async (blob: Blob) => {
      setTranscribing(true);
      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("language", lang);

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        const data = (await res.json()) as { text?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Transcription failed");
        }

        const text = data.text?.trim();
        if (text) onFinalTranscript(text);
        else onEmptyTranscriptRef.current?.();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Voice recognition failed";
        setError(
          message.includes("not configured")
            ? "Voice input is not configured on the server"
            : "Voice recognition failed"
        );
      } finally {
        setTranscribing(false);
      }
    },
    [lang, onFinalTranscript]
  );

  const stopRecording = useCallback(() => {
    if (!activeRef.current) return;

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      activeRef.current = false;
      cleanupStream();
      setListening(false);
      onListeningStopRef.current?.();
      return;
    }

    recorder.onstop = () => {
      activeRef.current = false;
      setListening(false);
      mediaRecorderRef.current = null;
      cleanupStream();
      onListeningStopRef.current?.();

      const blob = new Blob(chunksRef.current, {
        type: mimeTypeRef.current || "audio/webm",
      });
      chunksRef.current = [];

      if (blob.size > 0) void transcribeBlob(blob);
      else onEmptyTranscriptRef.current?.();
    };

    recorder.stop();
  }, [cleanupStream, transcribeBlob]);

  const startListening = useCallback(async () => {
    if (disabled || !supported || activeRef.current) return;

    activeRef.current = true;
    setError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!activeRef.current) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }

      streamRef.current = stream;
      setMicStream(stream);

      const mimeType = getRecorderMimeType();
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setListening(true);

      if (autoStopOnSilence) {
        silenceStopRef.current = watchForSilence(stream, () => {
          stopRecording();
        });
      }
    } catch {
      activeRef.current = false;
      cleanupStream();
      setListening(false);
      onListeningStopRef.current?.();
      setError("Microphone access denied");
    }
  }, [autoStopOnSilence, cleanupStream, disabled, stopRecording, supported]);

  const cancelListening = useCallback(() => {
    activeRef.current = false;
    silenceStopRef.current?.();
    silenceStopRef.current = null;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        cleanupStream();
        setListening(false);
        onListeningStopRef.current?.();
      };
      recorder.stop();
      return;
    }

    cleanupStream();
    setListening(false);
    onListeningStopRef.current?.();
  }, [cleanupStream]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      mediaRecorderRef.current?.stop();
      cleanupStream();
    };
  }, [cleanupStream]);

  return {
    supported,
    listening,
    transcribing,
    micStream,
    interimTranscript: transcribing ? "Transcribing…" : "",
    error,
    startListening,
    cancelListening,
    stopRecording,
  };
}
