"use client";

import { useEffect, useRef, useState } from "react";

const BAR_COUNT = 64;

function emptyLevels(): number[] {
  return Array.from({ length: BAR_COUNT }, () => 0);
}

export function useAudioAnalyser(source: MediaStream | null, active: boolean) {
  const [levels, setLevels] = useState<number[]>(emptyLevels);
  const [averageLevel, setAverageLevel] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active || !source) {
      setLevels(emptyLevels());
      setAverageLevel(0);
      return;
    }

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;

    const sourceNode = ctx.createMediaStreamSource(source);
    sourceNode.connect(analyser);

    const buffer = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(buffer);
      const step = Math.max(1, Math.floor(buffer.length / BAR_COUNT));
      const next: number[] = [];
      let sum = 0;

      for (let i = 0; i < BAR_COUNT; i++) {
        let total = 0;
        for (let j = 0; j < step; j++) {
          total += buffer[i * step + j] ?? 0;
        }
        const value = total / step / 255;
        next.push(value);
        sum += value;
      }

      setLevels(next);
      setAverageLevel(sum / BAR_COUNT);
      rafRef.current = requestAnimationFrame(tick);
    };

    void ctx.resume();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      sourceNode.disconnect();
      analyser.disconnect();
      void ctx.close();
    };
  }, [source, active]);

  return { levels, averageLevel };
}
