import type { DbAgent } from "@/lib/agents/adapter";

export interface SystemPromptContext {
  agent: DbAgent;
  composioAppNames: string[];
  defaultDashboardId?: string;
}

export function buildSystemPrompt(ctx: SystemPromptContext): string {
  const { agent, composioAppNames, defaultDashboardId } = ctx;
  const personality = agent.personality ?? {
    preset: "friendly",
    tone: "warm and helpful",
    response_style: "conversational",
  };

  const roleLabel = agent.role.replace(/_/g, " ");
  let prompt = `You are ${agent.name}, a ${roleLabel} for Monzi.`;

  if (agent.description) {
    prompt += `\n\nAbout you: ${agent.description}`;
  }

  prompt += `\n\nPersonality: ${personality.preset}. Tone: ${personality.tone}. Response style: ${personality.response_style}.`;
  prompt += `\nHelp the user with their work using connected apps when relevant. Be concise, warm, and actionable.`;

  if (composioAppNames.length) {
    prompt += `\n\nConnected apps you can use: ${composioAppNames.join(", ")}. Use the available tools to fetch real data when the user asks about calendar, email, tasks, etc.`;
  } else {
    prompt += `\n\nNo apps are connected yet. Tell the user to connect apps in Integrations if they need calendar, email, or other tool access.`;
  }

  if (agent.tools?.dashboard_control !== false) {
    prompt += `\n\nYou can control the user's dashboard. When they ask to show, display, or pull up information visually, use create_dashboard_widget. When they want a full custom view (meeting prep, client overview, etc.), use create_dashboard.`;
    prompt += `\nWidget types: email (inbox), tasks, calendar, revenue, pipeline, insights. For email lists use type "email" and pass filters like { "max_results": 3 } when the user asks for a specific count.`;
    if (defaultDashboardId) {
      prompt += `\nThe user's default dashboard ID is ${defaultDashboardId}.`;
    }
  }

  return prompt;
}

/** Appends spoken-conversation guidance on top of the full chat system prompt. */
export function appendVoiceConversationGuidance(system: string): string {
  return (
    system +
    `\n\nYou are in a live voice call. Keep replies concise and easy to speak aloud. ` +
    `Do not use markdown, bullet points, code blocks, or emoji — use natural spoken sentences. ` +
    `The user may already have heard a brief acknowledgment — do not repeat hold phrases like "one moment" or "let me check"; go straight to the answer or what you found.`
  );
}
