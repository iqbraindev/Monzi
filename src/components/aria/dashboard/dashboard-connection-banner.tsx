"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import {
  CreateDashboardConnectionHints,
  type ConnectionHintItem,
  setDashboardConnectionHintsFlag,
} from "@/components/aria/dashboard/create-dashboard-connection-hints";

const STORAGE_KEY = "monzi-dashboard-connection-hints";

export function DashboardConnectionBanner() {
  const [hints, setHints] = useState<ConnectionHintItem[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ConnectionHintItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setHints(parsed);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const dismiss = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setHints([]);
  };

  if (hints.length === 0) return null;

  return (
    <div className="relative mx-6 mt-3">
      <CreateDashboardConnectionHints hints={hints} />
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-lg text-aria-text-muted hover:bg-aria-subtle hover:text-aria-text"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
