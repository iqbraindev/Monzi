import { cn } from "@/lib/utils";
import { agentGradient } from "@/lib/aria/mock-data";

interface AgentOrbProps {
  color: string;
  size?: number;
  breathe?: boolean;
  className?: string;
}

/** The glowing colored avatar orb that represents an agent's identity. */
export function AgentOrb({
  color,
  size = 32,
  breathe = false,
  className,
}: AgentOrbProps) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full",
        breathe && "aria-breathe",
        className
      )}
      style={{
        width: size,
        height: size,
        background: agentGradient(color),
        boxShadow: `0 0 ${Math.round(size / 2)}px ${color}88`,
      }}
      aria-hidden
    />
  );
}
