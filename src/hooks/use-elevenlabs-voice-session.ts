"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Conversation,
  type Mode,
  type Status,
} from "@elevenlabs/client";

import { subscribeToSettingsPrefs } from "@/lib/settings/preferences";
import {
  readVoiceModePreference,
  writeVoiceModePreference,
} from "@/lib/voice/preferences";

export type VoiceSessionState =
  | "idle"
  | "connecting"
  | "greeting"
  | "listening"
  | "user-speaking"
  | "thinking"
  | "speaking"
  | "error";

export interface UseElevenLabsVoiceSessionOptions {
  agentId: string;
  conversationId: string | null;
  voiceAllowed: boolean;
  voiceEnabledOnAgent: boolean;
  onTranscription?: (
    text: string,
    isFinal: boolean,
    role: "user" | "assistant"
  ) => void;
  onConversationId?: (id: string) => void;
}

interface VoiceSessionResponse {
  signedUrl: string;
  conversationId: string;
  agentName: string;
  voiceToken: string;
  userId: string;
  overrides: {
    agent: {
      prompt: { prompt: string };
      firstMessage: string;
      language: string;
    };
    tts?: { voiceId: string; speed?: number };
  };
}

type ActiveConversation = Awaited<ReturnType<typeof Conversation.startSession>>;

const VAD_SPEAKING_THRESHOLD = 0.6;

export function useElevenLabsVoiceSession({
  agentId,
  conversationId,
  voiceAllowed,
  voiceEnabledOnAgent,
  onTranscription,
  onConversationId,
}: UseElevenLabsVoiceSessionOptions) {
  const [state, setState] = useState<VoiceSessionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  const conversationRef = useRef<ActiveConversation | null>(null);
  const connectingRef = useRef(false);
  const intentionalDisconnectRef = useRef(false);
  const greetingDoneRef = useRef(false);
  const agentSpeakingRef = useRef(false);
  const conversationIdRef = useRef<string | null>(conversationId);
  const reportedTranscriptsRef = useRef(new Set<string>());

  const canUseVoice = voiceAllowed && voiceEnabledOnAgent;
  const voiceEnabled = useSyncExternalStore(
    subscribeToSettingsPrefs,
    readVoiceModePreference,
    () => false
  );

  const setVoiceEnabled = useCallback(
    (enabled: boolean) => {
      if (enabled && !canUseVoice) return;
      writeVoiceModePreference(enabled);
      if (!enabled) setError(null);
    },
    [canUseVoice]
  );

  const disconnect = useCallback(async () => {
    intentionalDisconnectRef.current = true;
    greetingDoneRef.current = false;
    agentSpeakingRef.current = false;
    connectingRef.current = false;

    const conversation = conversationRef.current;
    conversationRef.current = null;

    if (conversation) {
      try {
        conversation.setVolume({ volume: 0 });
      } catch {
        // ignore — session may already be torn down
      }
      await conversation.endSession().catch(() => undefined);
    }

    setMicStream((stream) => {
      stream?.getTracks().forEach((track) => track.stop());
      return null;
    });
    reportedTranscriptsRef.current.clear();
    setState("idle");
  }, []);

  const connect = useCallback(async () => {
    if (!canUseVoice || connectingRef.current) return;
    if (conversationRef.current) return;

    connectingRef.current = true;
    intentionalDisconnectRef.current = false;
    greetingDoneRef.current = false;
    agentSpeakingRef.current = false;
    setState("connecting");
    setError(null);

    try {
      const res = await fetch("/api/elevenlabs/voice-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, conversationId }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to start voice session");
      }

      const data = (await res.json()) as VoiceSessionResponse;

      conversationIdRef.current = data.conversationId;
      if (data.conversationId && data.conversationId !== conversationId) {
        onConversationId?.(data.conversationId);
      }

      // Request mic access in the click handler stack so the browser grants it.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      const conversation = await Conversation.startSession({
        signedUrl: data.signedUrl,
        connectionType: "websocket",
        micMuted: false,
        userId: data.userId,
        overrides: data.overrides as never,
        customLlmExtraBody: {
          monzi_voice_token: data.voiceToken,
        },
        dynamicVariables: {
          monzi_voice_token: data.voiceToken,
        },
        onConnect: () => {
          setState("greeting");
        },
        onDisconnect: (details) => {
          conversationRef.current = null;
          if (intentionalDisconnectRef.current) {
            intentionalDisconnectRef.current = false;
            setState("idle");
            return;
          }
          const reason =
            details && "reason" in details && details.reason === "error"
              ? ("message" in details ? details.message : "Voice connection lost")
              : "Voice connection ended unexpectedly. Check that your custom LLM URL is publicly reachable.";
          setError(reason);
          setState("error");
        },
        onError: (message: string) => {
          setError(
            message ||
              "Voice connection error. If you're on localhost, set ELEVENLABS_CUSTOM_LLM_URL to your ngrok URL and run scripts/configure-elevenlabs-custom-llm.mjs."
          );
          setState("error");
        },
        onStatusChange: ({ status }: { status: Status }) => {
          if (status === "connecting") setState("connecting");
        },
        onModeChange: ({ mode }: { mode: Mode }) => {
          if (mode === "speaking") {
            agentSpeakingRef.current = true;
            setState(greetingDoneRef.current ? "speaking" : "greeting");
          } else {
            agentSpeakingRef.current = false;
            greetingDoneRef.current = true;
            setState("listening");
          }
        },
        onVadScore: ({ vadScore }: { vadScore: number }) => {
          if (!greetingDoneRef.current || agentSpeakingRef.current) return;
          if (vadScore >= VAD_SPEAKING_THRESHOLD) {
            setState("user-speaking");
          }
        },
        onMessage: ({
          message,
          source,
        }: {
          message: string;
          source: "user" | "ai";
        }) => {
          const trimmed = message?.trim();
          if (!trimmed) return;

          const role = source === "user" ? "user" : "assistant";
          const key = `${role}:${trimmed.toLowerCase()}`;
          if (reportedTranscriptsRef.current.has(key)) return;
          reportedTranscriptsRef.current.add(key);

          if (source === "user") {
            onTranscription?.(trimmed, true, "user");
            if (!agentSpeakingRef.current) setState("thinking");
          } else {
            greetingDoneRef.current = true;
            onTranscription?.(trimmed, true, "assistant");
          }
        },
      });

      conversationRef.current = conversation;
      try {
        conversation.setVolume({ volume: 1 });
      } catch {
        // ignore
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Voice connection failed";
      setError(message);
      setState("error");
      await disconnect();
    } finally {
      connectingRef.current = false;
    }
  }, [
    agentId,
    conversationId,
    canUseVoice,
    onConversationId,
    onTranscription,
    disconnect,
  ]);

  const beginVoiceSession = useCallback(async () => {
    if (!canUseVoice || connectingRef.current) return;
    if (conversationRef.current) return;
    writeVoiceModePreference(true);
    await connect();
  }, [canUseVoice, connect]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (!voiceEnabled) {
      void disconnect();
    }
  }, [voiceEnabled, disconnect]);

  useEffect(() => {
    return () => {
      void conversationRef.current?.endSession().catch(() => undefined);
    };
  }, []);

  const toggleMicrophone = useCallback(async () => {
    const conversation = conversationRef.current;
    if (!conversation) return;
    const next = !micMuted;
    setMicMuted(next);
    conversation.setMicMuted(next);
  }, [micMuted]);

  const isConnected =
    state !== "idle" && state !== "error" && state !== "connecting";

  return {
    voiceEnabled,
    setVoiceEnabled,
    beginVoiceSession,
    // ElevenLabs unlocks audio on the user gesture that starts the session.
    unlockAudio: async () => {},
    needsAudioUnlock: false,
    canUseVoice,
    state,
    error,
    isConnected,
    isListening: state === "listening" || state === "user-speaking",
    isSpeaking: state === "speaking" || state === "greeting",
    isThinking: state === "thinking",
    isUserSpeaking: state === "user-speaking",
    toggleMicrophone,
    isMicrophoneEnabled: isConnected && !micMuted,
    micStream,
    disconnect,
  };
}
