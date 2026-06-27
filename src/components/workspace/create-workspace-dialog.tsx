"use client";

import { useRef, useState } from "react";
import { Building2, Upload } from "lucide-react";

import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { useCreateWorkspace } from "@/hooks/use-workspaces";
import type { LimitExceededError } from "@/lib/workspaces/types";

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

const inputClassName =
  "h-[42px] rounded-[11px] border border-aria-border bg-aria-surface px-3.5 text-sm text-aria-text outline-none focus:border-aria-primary";

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [activityDomain, setActivityDomain] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<LimitExceededError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createWorkspace = useCreateWorkspace();

  function resetForm() {
    setName("");
    setDescription("");
    setActivityDomain("");
    setLogoFile(null);
    setLogoPreview(null);
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-aria-border bg-aria-elevated p-6 shadow-xl">
          <h2 className="font-heading text-lg font-semibold text-aria-text">
            Create workspace
          </h2>
          <p className="mt-1 text-sm text-aria-text-secondary">
            Each workspace has its own agents, dashboards, and connected apps.
          </p>

          <div className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-aria-text-secondary">
                Name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Marketing"
                className={inputClassName}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-aria-text-secondary">
                Description
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will this workspace be used for?"
                rows={3}
                className="rounded-[11px] border border-aria-border bg-aria-surface px-3.5 py-3 text-sm text-aria-text outline-none focus:border-aria-primary"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-aria-text-secondary">
                Domain of activity
              </span>
              <div className="relative">
                <Building2 className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-aria-text-secondary" />
                <input
                  value={activityDomain}
                  onChange={(e) => setActivityDomain(e.target.value)}
                  list="create-workspace-activity-domains"
                  placeholder="e.g. Marketing, E-commerce"
                  className={`${inputClassName} w-full pl-10`}
                />
              </div>
              <datalist id="create-workspace-activity-domains">
                {ACTIVITY_DOMAINS.map((domain) => (
                  <option key={domain} value={domain} />
                ))}
              </datalist>
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-aria-text-secondary">
                Logo
              </span>
              <div className="flex items-center gap-3">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="Workspace logo preview"
                    className="size-12 rounded-lg border border-aria-border object-cover"
                  />
                ) : (
                  <span className="flex size-12 items-center justify-center rounded-lg border border-dashed border-aria-border bg-aria-surface text-xs text-aria-text-secondary">
                    PNG/JPG
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-aria-border bg-aria-surface px-4 text-[13px] font-semibold text-aria-text hover:bg-aria-subtle"
                >
                  <Upload className="size-4" />
                  Choose logo
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setLogoFile(file);
                  setLogoPreview(file ? URL.createObjectURL(file) : null);
                  event.target.value = "";
                }}
              />
              <p className="text-xs text-aria-text-secondary">
                Optional. PNG or JPEG, up to 2 MB.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              className="h-9 rounded-full px-4 text-[13px] font-semibold text-aria-text-secondary hover:bg-aria-subtle"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!name.trim() || createWorkspace.isPending}
              onClick={() => {
                createWorkspace.mutate(
                  {
                    name: name.trim(),
                    description: description.trim() || null,
                    activity_domain: activityDomain.trim() || null,
                    logo: logoFile,
                  },
                  {
                    onSuccess: () => {
                      resetForm();
                      onOpenChange(false);
                    },
                    onError: (err: unknown) => {
                      if (
                        err &&
                        typeof err === "object" &&
                        "upgradeRequired" in err &&
                        (err as { upgradeRequired?: boolean }).upgradeRequired
                      ) {
                        setLimitError(err as LimitExceededError);
                        onOpenChange(false);
                      }
                    },
                  }
                );
              }}
              className="h-9 rounded-full bg-aria-primary px-4 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {createWorkspace.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>

      {limitError && (
        <UpgradePrompt
          error={limitError}
          open={Boolean(limitError)}
          onOpenChange={(next) => {
            if (!next) setLimitError(null);
          }}
        />
      )}
    </>
  );
}
