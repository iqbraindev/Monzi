"use client";

import { useCallback, useEffect, useState } from "react";

export function useCallDuration(callActive: boolean, voiceConnected: boolean) {
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!callActive) return;
    if (voiceConnected && callStartTime === null) {
      setCallStartTime(Date.now());
    }
  }, [callActive, voiceConnected, callStartTime]);

  useEffect(() => {
    if (!callStartTime) return;
    const tick = () => {
      setElapsedSeconds(Math.floor((Date.now() - callStartTime) / 1000));
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [callStartTime]);

  const resetCallDuration = useCallback(() => {
    setCallStartTime(null);
    setElapsedSeconds(0);
  }, []);

  return { elapsedSeconds, resetCallDuration };
}
