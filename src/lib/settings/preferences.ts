import { readVoiceModePreference } from "@/lib/voice/preferences";

export const NOTIFICATION_PREFS_STORAGE_KEY = "monzi:notification-prefs";

export type NotificationPrefKey = "email" | "push" | "proactive";

export type NotificationPrefs = Record<NotificationPrefKey, boolean>;

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email: true,
  push: true,
  proactive: true,
};

export function readNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFS;

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export function writeNotificationPref(
  key: NotificationPrefKey,
  enabled: boolean
): void {
  if (typeof window === "undefined") return;

  const current = readNotificationPrefs();
  window.localStorage.setItem(
    NOTIFICATION_PREFS_STORAGE_KEY,
    JSON.stringify({ ...current, [key]: enabled })
  );
  notifySettingsPrefsChanged();
}

const SETTINGS_PREFS_CHANGE_EVENT = "monzi:settings-prefs-changed";

export function notifySettingsPrefsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SETTINGS_PREFS_CHANGE_EVENT));
}

export function subscribeToSettingsPrefs(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener(SETTINGS_PREFS_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SETTINGS_PREFS_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export type SettingsPrefsSnapshot = {
  email: boolean;
  push: boolean;
  proactive: boolean;
  voice: boolean;
};

const SERVER_SETTINGS_PREFS_SNAPSHOT: SettingsPrefsSnapshot = {
  email: DEFAULT_NOTIFICATION_PREFS.email,
  push: DEFAULT_NOTIFICATION_PREFS.push,
  proactive: DEFAULT_NOTIFICATION_PREFS.proactive,
  voice: false,
};

let cachedSettingsPrefsSnapshot: SettingsPrefsSnapshot | null = null;

export function readSettingsPrefsSnapshot(): SettingsPrefsSnapshot {
  const notificationPrefs = readNotificationPrefs();
  const next: SettingsPrefsSnapshot = {
    email: notificationPrefs.email,
    push: notificationPrefs.push,
    proactive: notificationPrefs.proactive,
    voice: readVoiceModePreference(),
  };

  if (
    cachedSettingsPrefsSnapshot &&
    cachedSettingsPrefsSnapshot.email === next.email &&
    cachedSettingsPrefsSnapshot.push === next.push &&
    cachedSettingsPrefsSnapshot.proactive === next.proactive &&
    cachedSettingsPrefsSnapshot.voice === next.voice
  ) {
    return cachedSettingsPrefsSnapshot;
  }

  cachedSettingsPrefsSnapshot = next;
  return next;
}

export function readSettingsPrefsServerSnapshot(): SettingsPrefsSnapshot {
  return SERVER_SETTINGS_PREFS_SNAPSHOT;
}
