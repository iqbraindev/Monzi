"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseAgentSpeechOptions {
  voiceId?: string;
  speed?: number;
  provider?: "openai" | "elevenlabs" | "none";
}

function sanitizeForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "code block omitted")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^[-*]\s/gm, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

function speakWithBrowser(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function useAgentSpeech({
  voiceId = "nova",
  speed = 1,
  provider = "openai",
}: UseAgentSpeechOptions = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [playbackStream, setPlaybackStream] = useState<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      void audioCtxRef.current?.close();
      audioCtxRef.current = null;
      setPlaybackStream(null);
    };
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setPlaybackStream(null);
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const sanitized = sanitizeForSpeech(text);
      if (!sanitized) return;

      stop();
      setSpeaking(true);
      const controller = new AbortController();
      abortRef.current = controller;

      const fetchTts = async (): Promise<ArrayBuffer | null> => {
        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: sanitized,
              voice_id: voiceId,
              voice: voiceId,
              provider,
              speed,
            }),
            signal: controller.signal,
          });
          if (!res.ok) return null;
          return res.arrayBuffer();
        } catch (err) {
          if (controller.signal.aborted) throw err;
          return null;
        }
      };

      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const destination = ctx.createMediaStreamDestination();
        const analyser = ctx.createAnalyser();
        analyser.connect(destination);
        analyser.connect(ctx.destination);
        setPlaybackStream(destination.stream);

        const playBuffer = async (arrayBuffer: ArrayBuffer): Promise<void> => {
          if (controller.signal.aborted) return;
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(analyser);
          await new Promise<void>((resolve, reject) => {
            source.onended = () => resolve();
            try {
              source.start(0);
            } catch (err) {
              reject(err);
            }
          });
        };

        const buffer = await fetchTts();
        if (buffer && !controller.signal.aborted) {
          await playBuffer(buffer);
        } else if (!controller.signal.aborted) {
          await speakWithBrowser(sanitized);
        }
      } catch {
        if (!controller.signal.aborted) {
          await speakWithBrowser(sanitized);
        }
      } finally {
        if (!controller.signal.aborted) {
          void audioCtxRef.current?.close();
          audioCtxRef.current = null;
          setPlaybackStream(null);
          setSpeaking(false);
        }
      }
    },
    [stop, voiceId, speed, provider]
  );

  return { speak, stop, speaking, playbackStream };
}
