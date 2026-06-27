"use client";

import { useState } from "react";
import { useSyncExternalStore } from "react";

import {
  readSettingsPrefsServerSnapshot,
  readSettingsPrefsSnapshot,
  subscribeToSettingsPrefs,
  writeNotificationPref,
  type NotificationPrefKey,
  type SettingsPrefsSnapshot,
} from "@/lib/settings/preferences";
import { ProfileSection } from "@/components/settings/profile-section";
import { WorkspaceProfileSection } from "@/components/settings/workspace-profile-section";
import { useLimits, useWorkspaces } from "@/hooks/use-workspaces";
import { cn } from "@/lib/utils";
import { writeVoiceModePreference } from "@/lib/voice/preferences";

const PREFERENCES: {
  key: keyof SettingsPrefsSnapshot;
  title: string;
  desc: string;
  default: boolean;
}[] = [
  {
    key: "email",
    title: "Email notifications",
    desc: "Get a daily digest of what your agents did.",
    default: true,
  },
  {
    key: "push",
    title: "Push notifications",
    desc: "Real-time alerts when an agent needs your input.",
    default: true,
  },
  {
    key: "proactive",
    title: "Proactive insights",
    desc: "Let agents surface suggestions before you ask.",
    default: true,
  },
  {
    key: "voice",
    title: "Voice mode",
    desc: "Enable voice replies in agent chats.",
    default: false,
  },
];

export default function SettingsPage() {
  const prefs = useSyncExternalStore(
    subscribeToSettingsPrefs,
    readSettingsPrefsSnapshot,
    readSettingsPrefsServerSnapshot
  );
  const { data: limitsData } = useLimits();
  const { data: workspacesData } = useWorkspaces();
  const [deleting, setDeleting] = useState(false);

  const activeWorkspaceId = limitsData?.workspaceId as string | undefined;
  const activeWorkspace = workspacesData?.workspaces.find(
    (w) => w.id === activeWorkspaceId
  );
  const canDelete =
    activeWorkspace?.member_role === "owner" && !activeWorkspace?.is_default;

  async function handleDeleteWorkspace() {
    if (!activeWorkspaceId || !canDelete) return;
    if (
      !window.confirm(
        "Delete this workspace and all its agents, dashboards, and data? This cannot be undone."
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete workspace");
      }
      window.location.href = "/dashboard";
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete workspace");
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[820px] px-7 pt-7 pb-12">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-aria-text">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-aria-text-secondary">
          Manage your profile, workspace, and preferences.
        </p>
      </div>

      {/* Profile */}
      <Card title="Profile">
        <ProfileSection />
      </Card>

      {/* Workspace */}
      <Card title="Workspace">
        <WorkspaceProfileSection />
      </Card>

      {/* Preferences */}
      <Card title="Preferences">
        {PREFERENCES.map((p) => (
          <div
            key={p.key}
            className="flex items-center justify-between gap-4 border-b border-aria-border-subtle pb-4 last:border-0 last:pb-0"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-aria-text">
                {p.title}
              </span>
              <span className="text-xs text-aria-text-secondary">{p.desc}</span>
            </div>
            <button
              onClick={() => {
                const next = !prefs[p.key];
                if (p.key === "voice") {
                  writeVoiceModePreference(next);
                } else {
                  writeNotificationPref(p.key as NotificationPrefKey, next);
                }
              }}
              aria-label={`Toggle ${p.title}`}
              className={cn(
                "flex h-6 w-[42px] shrink-0 items-center rounded-full p-0.5 transition-all",
                prefs[p.key]
                  ? "aria-gradient justify-end"
                  : "justify-start bg-aria-border"
              )}
            >
              <span className="block size-5 rounded-full bg-white shadow" />
            </button>
          </div>
        ))}
      </Card>

      {/* Danger zone */}
      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-aria-danger/30 bg-aria-danger/4 p-5">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-aria-danger uppercase">
          Danger zone
        </span>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] text-aria-text-secondary">
            Permanently delete your workspace and all associated data.
          </span>
          <button
            type="button"
            disabled={!canDelete || deleting}
            onClick={() => void handleDeleteWorkspace()}
            className="h-9 rounded-full border border-aria-danger/40 px-4 text-[13px] font-semibold text-aria-danger transition-colors hover:bg-aria-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-5 rounded-2xl border border-aria-border bg-aria-surface/70 p-6 backdrop-blur-md">
      <h2 className="font-heading text-[15px] font-semibold text-aria-text">
        {title}
      </h2>
      {children}
    </div>
  );
}

