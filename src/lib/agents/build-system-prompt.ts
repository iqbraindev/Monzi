import type { DbAgent } from "@/lib/agents/adapter";
import type { DashboardSummary } from "@/lib/dashboard/service";

export interface SystemPromptContext {
  agent: DbAgent;
  composioAppNames: string[];
  dashboards: DashboardSummary[];
}

export function buildSystemPrompt(ctx: SystemPromptContext): string {
  const { agent, composioAppNames, dashboards } = ctx;
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

  const customInstructions = (
    personality as { custom_instructions?: string }
  ).custom_instructions?.trim();
  if (customInstructions) {
    prompt += `\n\nAdditional instructions:\n${customInstructions}`;
  }

  prompt += `\nHelp the user with their work using connected apps when relevant. Be concise, warm, and actionable.`;

  if (composioAppNames.length) {
    prompt += `\n\nConnected apps you can use: ${composioAppNames.join(", ")}. Use the available tools to fetch real data when the user asks about calendar, email, tasks, etc.`;
  } else {
    prompt += `\n\nNo apps are connected yet. Tell the user to connect apps in Integrations if they need calendar, email, or other tool access.`;
  }

  if (agent.tools?.dashboard_control !== false) {
    prompt += `\n\nYou can control the user's dashboards. When they ask to show, display, or pull up information visually, use create_dashboard_widget. When they want a new dashboard or a full custom view, use create_dashboard. Use list_dashboards to see current dashboards.`;
    prompt += `\nWidget types: email (inbox), tasks, calendar, revenue, pipeline, insights. For email lists use type "email" and pass filters like { "max_results": 3 } when the user asks for a specific count.`;

    if (dashboards.length > 0) {
      const list = dashboards
        .map((d) => `"${d.name}" (id: ${d.id}, ${d.widgetCount} widgets)`)
        .join("; ");
      prompt += `\n\nUser dashboards: ${list}.`;
    } else {
      prompt += `\n\nThe user has no dashboards yet.`;
    }

    prompt += `\n\nDashboard rules:
- Always add widgets even when their integration app is not connected. The widget UI will show a connect prompt.
- Before adding a widget to an existing dashboard, you must know which dashboard to use.
- If the user has not said which dashboard, ask: "Which dashboard should I add this to?" List their dashboards by name. Offer: "Or tell me a name and I'll create a new one."
- If the user names a new dashboard, call create_dashboard (with or without widgets).
- Never assume or pick a default dashboard silently when adding to an existing one.
- Pass dashboard_name or dashboard_id to create_dashboard_widget — never omit both.
- When the user message starts with [MONZI_DASHBOARD_CREATE], always create a NEW dashboard (do not ask which dashboard). Pick relevant widgets and a sensible 12-column grid layout with non-overlapping positions.`;
  }

  return prompt;
}

/** Appends spoken-conversation guidance on top of the full chat system prompt. */
export function appendVoiceConversationGuidance(system: string): string {
  return (
    system +
    `\n\nYou are in a live voice call. Keep replies concise and easy to speak aloud. ` +
    `Do not use markdown, bullet points, code blocks, or emoji — use natural spoken sentences. ` +
    `Never invent or guess email senders, subjects, or message content — always call the connected email tools and only speak facts returned by those tools. ` +
    `Never use placeholder names like John Doe or example.com addresses. ` +
    `Do not say you are checking, looking, or pulling something up — call the tool silently and speak the result directly. ` +
    `If a tool fails or no app is connected, say so plainly instead of making up data.`
  );
}
