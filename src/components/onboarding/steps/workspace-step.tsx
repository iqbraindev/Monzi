"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Upload } from "lucide-react";

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

interface WorkspaceStepProps {
  workspaceId: string;
  initialName?: string;
  initialDescription?: string;
  initialActivityDomain?: string | null;
  onComplete: () => void;
}

export function WorkspaceStep({
  workspaceId,
  initialName = "",
  initialDescription = "",
  initialActivityDomain = "",
  onComplete,
}: WorkspaceStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName || "My Workspace");
  const [description, setDescription] = useState(initialDescription);
  const [activityDomain, setActivityDomain] = useState(
    initialActivityDomain ?? ""
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(initialName || "My Workspace");
    setDescription(initialDescription);
    setActivityDomain(initialActivityDomain ?? "");
  }, [initialName, initialDescription, initialActivityDomain]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Workspace name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
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

      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        const logoRes = await fetch(`/api/workspaces/${workspaceId}/logo`, {
          method: "POST",
          body: formData,
        });
        if (!logoRes.ok) {
          const logoBody = await logoRes.json().catch(() => ({}));
          throw new Error(logoBody.error ?? "Failed to upload logo");
        }
      }

      await fetch("/api/user/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "agent" }),
      });

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save workspace");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-lg space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-aria-text">
          Set up your workspace
        </h2>
        <p className="mt-2 text-sm text-aria-text-secondary">
          Name your workspace and tell us what you do. You can change this later
          in Settings.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-aria-border bg-aria-surface"
        >
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoPreview}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <Building2 className="size-7 text-aria-text-muted" />
          )}
        </button>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-sm text-aria-primary-light hover:underline"
          >
            <Upload className="size-3.5" />
            Upload logo
          </button>
          <p className="mt-1 text-xs text-aria-text-muted">Optional</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
          }}
        />
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-aria-text">Workspace name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 w-full rounded-xl border border-aria-border bg-aria-surface px-4 text-sm text-aria-text outline-none focus:border-aria-primary/50"
          placeholder="Acme Marketing"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-aria-text">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-aria-border bg-aria-surface px-4 py-3 text-sm text-aria-text outline-none focus:border-aria-primary/50"
          placeholder="What does this workspace focus on?"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-aria-text">Activity domain</span>
        <select
          value={activityDomain}
          onChange={(e) => setActivityDomain(e.target.value)}
          className="h-11 w-full rounded-xl border border-aria-border bg-aria-surface px-4 text-sm text-aria-text outline-none focus:border-aria-primary/50"
        >
          <option value="">Select a domain</option>
          {ACTIVITY_DOMAINS.map((domain) => (
            <option key={domain} value={domain}>
              {domain}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className={cn(
          "flex h-11 w-full items-center justify-center rounded-full bg-aria-primary text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        )}
      >
        {saving ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
