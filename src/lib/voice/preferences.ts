export const VOICE_MODE_STORAGE_KEY = "monzi:voice-mode";

export function readVoiceModePreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(VOICE_MODE_STORAGE_KEY) === "true";
}

export function writeVoiceModePreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VOICE_MODE_STORAGE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new Event("monzi:settings-prefs-changed"));
}
