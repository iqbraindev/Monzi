/** Unlocks browser audio playback — call synchronously from a click/tap handler. */
export function unlockBrowserAudio(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext ??
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      void ctx.resume();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      void ctx.close();
    }
  } catch {
    // ignore — best-effort unlock
  }

  try {
    const audio = new Audio();
    audio.volume = 0.001;
    audio.src =
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkZXNjAAAAAA==";
    void audio.play().catch(() => undefined);
  } catch {
    // ignore
  }
}
