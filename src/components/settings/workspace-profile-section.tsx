"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Upload } from "lucide-react";

import { useLimits, useWorkspaces } from "@/hooks/use-workspaces";
import type { WorkspaceWithRole } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";

const ACTIVITY_DOMAINS = [
  "Marketing",
  "E-commerce",
  "Real estate",
  "Healthcare",
  "Finance",
  "Education",
  "Technology",
  "Consulting",
  "Legal",
  "Hospitality",
];

function workspaceLogoSrc(workspace: WorkspaceWithRole | undefined): string | null {
  if (!workspace?.logo_url) return null;
  return `${workspace.logo_url}?v=${encodeURIComponent(workspace.updated_at)}`;
}

export function WorkspaceProfileSection() {
  const { data: limitsData } = useLimits();
  const { data: workspacesData, refetch } = useWorkspaces();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeWorkspaceId = limitsData?.workspaceId as string | undefined;
  const activeWorkspace = workspacesData?.workspaces.find(
    (w) => w.id === activeWorkspaceId
  );
  const canEdit = activeWorkspace?.member_role === "owner";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [activityDomain, setActivityDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(activeWorkspace?.name ?? "");
    setDescription(activeWorkspace?.description ?? "");
    setActivityDomain(activeWorkspace?.activity_domain ?? "");
    setLogoPreview(workspaceLogoSrc(activeWorkspace));
  }, [activeWorkspace]);

  async function saveProfile() {
    if (!activeWorkspaceId || !canEdit || !activeWorkspace) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          activity_domain: activityDomain.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to update workspace");
      }
      setMessage("Workspace updated.");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update workspace");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File) {
    if (!activeWorkspaceId || !canEdit) return;

    setUploadingLogo(true);
    setError(null);
    setMessage(null);

    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/logo`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to upload logo");
      }

      setMessage("Logo updated.");
      await refetch();
    } catch (err) {
      setLogoPreview(workspaceLogoSrc(activeWorkspace));
      setError(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      URL.revokeObjectURL(previewUrl);
    }
  }

  if (!activeWorkspace) {
    return (
      <p className="text-sm text-aria-text-secondary">
        Loading workspace details...
      </p>
    );
  }

  const initials = activeWorkspace.name.slice(0, 1).toUpperCase();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        {logoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoPreview}
            alt={`${activeWorkspace.name} logo`}
            className="size-16 rounded-xl border border-aria-border object-cover"
          />
        ) : (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-aria-border bg-aria-elevated text-xl font-semibold text-aria-text">
            {initials}
          </span>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={!canEdit || uploadingLogo}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-aria-border bg-aria-elevated px-4 text-[13px] font-semibold text-aria-text transition-colors hover:bg-aria-subtle disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="size-4" />
            {uploadingLogo ? "Uploading..." : "Upload logo"}
          </button>
          <p className="text-xs text-aria-text-secondary">
            PNG or JPEG, up to 2 MB.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,.png,.jpg,.jpeg"
            className="hidden"
            disabled={!canEdit || uploadingLogo}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadLogo(file);
              event.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-xs font-semibold text-aria-text-secondary">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit || saving}
            className="h-[42px] rounded-[11px] border border-aria-border bg-aria-surface px-3.5 text-sm text-aria-text outline-none transition-all focus:border-aria-primary focus:shadow-[0_0_0_3px_rgba(124,58,237,0.14)] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-xs font-semibold text-aria-text-secondary">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit || saving}
            rows={3}
            placeholder="What does this workspace do?"
            className="rounded-[11px] border border-aria-border bg-aria-surface px-3.5 py-3 text-sm text-aria-text outline-none transition-all focus:border-aria-primary focus:shadow-[0_0_0_3px_rgba(124,58,237,0.14)] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-xs font-semibold text-aria-text-secondary">
            Domain of activity
          </span>
          <div className="relative">
            <Building2 className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-aria-text-secondary" />
            <input
              value={activityDomain}
              onChange={(e) => setActivityDomain(e.target.value)}
              disabled={!canEdit || saving}
              list="workspace-activity-domains"
              placeholder="e.g. Marketing, E-commerce"
              className="h-[42px] w-full rounded-[11px] border border-aria-border bg-aria-surface pr-3.5 pl-10 text-sm text-aria-text outline-none transition-all focus:border-aria-primary focus:shadow-[0_0_0_3px_rgba(124,58,237,0.14)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <datalist id="workspace-activity-domains">
            {ACTIVITY_DOMAINS.map((domain) => (
              <option key={domain} value={domain} />
            ))}
          </datalist>
        </label>
      </div>

      {!canEdit && (
        <p className="text-xs text-aria-text-secondary">
          Only the workspace owner can edit these details.
        </p>
      )}

      {canEdit && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving || !name.trim()}
            onClick={() => void saveProfile()}
            className="h-9 rounded-full bg-aria-primary px-4 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save workspace"}
          </button>
          {message && (
            <span className="text-xs font-medium text-emerald-400">{message}</span>
          )}
          {error && (
            <span className={cn("text-xs font-medium text-aria-danger")}>
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
