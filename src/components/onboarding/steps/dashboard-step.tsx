"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutDashboard, Loader2 } from "lucide-react";

import { getRegistryEntry } from "@/lib/dashboard/widget-registry";
import { cn } from "@/lib/utils";

interface SeededWidget {
  id: string;
  type: string;
  title: string;
}

interface DashboardStepProps {
  agentId: string;
  onComplete: () => void;
}

export function DashboardStep({ agentId, onComplete }: DashboardStepProps) {
  const [loading, setLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [widgets, setWidgets] = useState<SeededWidget[]>([]);
  const [error, setError] = useState("");

  const seedDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/seed-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to build dashboard");
      }

      setWidgets((body.widgets as SeededWidget[]) ?? []);
      setSeeded(true);

      await fetch("/api/user/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "chat",
          dashboardId: body.dashboardId,
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build dashboard");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void seedDashboard();
  }, [seedDashboard]);

  const handleContinue = () => {
    onComplete();
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-aria-text">
          Your dashboard
        </h2>
        <p className="mt-2 text-sm text-aria-text-secondary">
          We add widgets based on the apps your agent can access.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-aria-text-muted">
          <Loader2 className="size-4 animate-spin" />
          Building your dashboard…
        </div>
      )}

      {error && !loading && (
        <div className="space-y-4">
          <p className="text-sm text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => void seedDashboard()}
            className="text-sm text-aria-primary-light hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {seeded && !loading && (
        <>
          <div className="rounded-2xl border border-aria-border bg-aria-surface/60 p-5">
            <div className="mb-4 flex items-center gap-2">
              <LayoutDashboard className="size-5 text-aria-primary-light" />
              <span className="font-medium text-aria-text">My Dashboard</span>
            </div>

            {widgets.length === 0 ? (
              <p className="text-sm text-aria-text-secondary">
                No widgets yet — connect an app in the previous step, or add
                widgets later from the dashboard.
              </p>
            ) : (
              <ul className="space-y-2">
                {widgets.map((widget) => {
                  const reg = getRegistryEntry(widget.type);
                  return (
                    <li
                      key={widget.id}
                      className="flex items-center gap-3 rounded-xl border border-aria-border bg-aria-elevated/50 px-4 py-3"
                    >
                      <span className="text-lg">{reg?.label ? "📊" : "✨"}</span>
                      <div>
                        <p className="text-sm font-medium text-aria-text">
                          {widget.title}
                        </p>
                        <p className="text-xs text-aria-text-muted">
                          {reg?.label ?? widget.type}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className={cn(
              "flex h-11 w-full items-center justify-center rounded-full bg-aria-primary text-sm font-semibold text-white transition-opacity hover:opacity-90"
            )}
          >
            Continue to chat
          </button>
        </>
      )}
    </div>
  );
}
