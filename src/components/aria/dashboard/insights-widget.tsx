import { AGENT_INSIGHTS } from "@/lib/aria/mock-data";

export function InsightsWidget() {
  return (
    <section className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-aria-primary/30 bg-linear-[135deg,rgba(124,58,237,0.12),rgba(6,182,212,0.06)] backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-aria-primary/20 px-3 py-3.5">
        <div className="widget-drag-handle flex min-w-0 flex-1 cursor-grab items-center gap-2.5 active:cursor-grabbing">
          <span className="aria-gradient size-6 shrink-0 rounded-full shadow-[0_0_12px_rgba(124,58,237,0.5)]" />
          <span className="truncate font-heading text-[15px] font-semibold text-aria-text">
            Agent Insights
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-aria-primary/15 px-2 py-0.5 text-[11px] font-semibold text-aria-primary-light">
          ✨ Live
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto p-4">
        {AGENT_INSIGHTS.map((i) => (
          <div
            key={i.id}
            className="flex items-center gap-3 rounded-xl border border-aria-border bg-aria-surface/60 px-3 py-2.5"
          >
            <span className="shrink-0 text-lg">{i.icon}</span>
            <span className="min-w-0 flex-1 text-[13px] leading-snug text-aria-text">
              {i.text}
            </span>
            <button className="aria-gradient h-[30px] shrink-0 rounded-full px-3.5 text-xs font-semibold whitespace-nowrap text-white transition-[filter] hover:brightness-110">
              {i.action}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
