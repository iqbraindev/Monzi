"use client";

import { useEffect, useRef } from "react";

const RING_ON_MS = 2000;
const RING_OFF_MS = 4000;
const RING_FREQS = [440, 480] as const;
const RING_GAIN = 0.06;

export function useCallRingtone(active: boolean) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const activeRef = useRef(active);

  activeRef.current = active;

  useEffect(() => {
    if (!active) return;

    function clearOscillators() {
      for (const osc of oscillatorsRef.current) {
        try {
          osc.stop();
        } catch {
          // already stopped
        }
      }
      oscillatorsRef.current = [];
    }

    function stopAll() {
      if (loopTimerRef.current) {
        clearTimeout(loopTimerRef.current);
        loopTimerRef.current = null;
      }
      clearOscillators();
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => undefined);
        audioCtxRef.current = null;
      }
    }

    function getContext() {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        return audioCtxRef.current;
      }

      const AudioContextClass =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) return null;

      audioCtxRef.current = new AudioContextClass();
      return audioCtxRef.current;
    }

    function playBurst() {
      if (!activeRef.current) return;

      const ctx = getContext();
      if (!ctx) return;

      void ctx.resume();
      clearOscillators();

      const master = ctx.createGain();
      master.gain.value = RING_GAIN;
      master.connect(ctx.destination);

      for (const freq of RING_FREQS) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(master);
        osc.start();
        oscillatorsRef.current.push(osc);
      }

      loopTimerRef.current = setTimeout(() => {
        clearOscillators();
        if (!activeRef.current) return;
        loopTimerRef.current = setTimeout(playBurst, RING_OFF_MS);
      }, RING_ON_MS);
    }

    playBurst();

    return stopAll;
  }, [active]);
}
