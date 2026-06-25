# 06 — AI ↔ Dashboard Bridge Specification

---

## 🌉 Concept

The bridge allows AI agents to **read from and write to** the dashboard in real-time.
When an agent calls a dashboard tool, the frontend receives the event via
Supabase Realtime and immediately updates the UI.

---

## 🛠️ Dashboard Tools (Agent-Callable)

```typescript
// src/lib/langchain/tools/dashboard.tools.ts

import { tool } from '@langchain/core/tools'
import { z } from 'zod'

// ── Tool 1: Create a new widget ──────────────────────────────────
export const createWidgetTool = tool({
  name: 'create_dashboard_widget',
  description: 'Create a new widget on the user\'s dashboard to display data visually. Use this when the user asks to "show me", "display", or "pull up" information.',
  schema: z.object({
    dashboard_id: z.string().describe('Target dashboard ID. Use active dashboard if not specified.'),
    type: z.enum(WIDGET_TYPES).describe('Widget type to create'),
    title: z.string().describe('Widget title shown to user'),
    integration: z.string().describe('Composio app name (gmail, notion, hubspot...)'),
    composio_tool: z.string().describe('Specific Composio tool to fetch data'),
    filters: z.record(z.any()).optional().describe('Data filters (status, limit, date range...)'),
    size: z.enum(['small', 'medium', 'large']).default('medium')
  }),
  func: async (params, config) => {
    const userId = config.configurable.userId
    const sizeMap = { small: { w: 3, h: 3 }, medium: { w: 6, h: 4 }, large: { w: 9, h: 5 } }

    const widget = await dashboardService.createWidget({
      dashboard_id: params.dashboard_id,
      type: params.type,
      title: params.title,
      data_source: {
        integration: params.integration,
        composio_tool: params.composio_tool,
        filters: params.filters || {},
        refresh_interval_sec: 120
      },
      layout: { x: 0, y: 999, ...sizeMap[params.size] }, // y:999 = append at bottom
      created_by: 'agent'
    })

    // Broadcast to frontend
    await supabase.channel(`dashboard:${params.dashboard_id}`).send({
      type: 'broadcast',
      event: 'widget:created',
      payload: { widget }
    })

    return `Widget "${params.title}" has been added to your dashboard.`
  }
})

// ── Tool 2: Create a full dashboard ─────────────────────────────
export const createDashboardTool = tool({
  name: 'create_dashboard',
  description: 'Create a complete custom dashboard with multiple widgets. Use when user asks to build a view for a specific purpose (meeting prep, project review, client overview...)',
  schema: z.object({
    name: z.string(),
    description: z.string(),
    widgets: z.array(z.object({
      type: z.enum(WIDGET_TYPES),
      title: z.string(),
      integration: z.string(),
      composio_tool: z.string(),
      filters: z.record(z.any()).optional(),
      size: z.enum(['small', 'medium', 'large'])
    }))
  }),
  func: async (params, config) => {
    const userId = config.configurable.userId

    // Create dashboard
    const dashboard = await dashboardService.createDashboard({
      user_id: userId,
      name: params.name,
      description: params.description,
      created_by: 'agent',
      is_pinned: false
    })

    // Auto-layout widgets in a grid
    const layout = generateAutoLayout(params.widgets)

    // Create all widgets
    const widgets = await Promise.all(
      params.widgets.map((w, i) =>
        dashboardService.createWidget({ ...w, dashboard_id: dashboard.id, layout: layout[i] })
      )
    )

    // Broadcast: open this new dashboard
    await supabase.channel(`user:${userId}`).send({
      type: 'broadcast',
      event: 'dashboard:created',
      payload: { dashboard, widgets, autoSwitch: true }
    })

    return `I've created the "${params.name}" dashboard with ${widgets.length} widgets and switched you to it.`
  }
})

// ── Tool 3: Highlight data in a widget ──────────────────────────
export const highlightWidgetTool = tool({
  name: 'highlight_widget_data',
  description: 'Highlight specific items in a dashboard widget to draw the user\'s attention',
  schema: z.object({
    widget_id: z.string(),
    item_ids: z.array(z.string()).describe('IDs of items to highlight'),
    reason: z.string().describe('Why these items are being highlighted')
  }),
  func: async (params, config) => {
    const dashboardId = await dashboardService.getDashboardByWidget(params.widget_id)

    await supabase.channel(`dashboard:${dashboardId}`).send({
      type: 'broadcast',
      event: 'widget:highlight',
      payload: {
        widget_id: params.widget_id,
        item_ids: params.item_ids,
        reason: params.reason
      }
    })

    return `I've highlighted ${params.item_ids.length} items in your dashboard.`
  }
})

// ── Tool 4: Open/focus a widget ──────────────────────────────────
export const openWidgetTool = tool({
  name: 'open_dashboard_widget',
  description: 'Switch to a dashboard tab and focus on a specific widget type',
  schema: z.object({
    widget_type: z.enum(WIDGET_TYPES),
    filters: z.record(z.any()).optional()
  }),
  func: async (params, config) => {
    const userId = config.configurable.userId

    await supabase.channel(`user:${userId}`).send({
      type: 'broadcast',
      event: 'widget:focus',
      payload: { widget_type: params.widget_type, filters: params.filters }
    })

    return `I've opened the ${params.widget_type.replace(/_/g, ' ')} view for you.`
  }
})

// ── Tool 5: Read widget data ─────────────────────────────────────
export const readWidgetDataTool = tool({
  name: 'read_dashboard_data',
  description: 'Read current data from an existing dashboard widget to answer user questions',
  schema: z.object({
    widget_type: z.enum(WIDGET_TYPES).describe('Type of data to read'),
    filters: z.record(z.any()).optional()
  }),
  func: async (params, config) => {
    const userId = config.configurable.userId

    // Fetch live data from Composio
    const widgetDef = WIDGET_REGISTRY[params.widget_type]
    const data = await composioService.execute({
      tool: widgetDef.composio_tool,
      userId,
      params: params.filters || widgetDef.default_filters
    })

    return JSON.stringify(data)
  }
})
```

---

## 📡 Frontend Realtime Listener

```typescript
// src/hooks/useRealtimeDashboard.ts

export function useRealtimeDashboard(dashboardId: string) {
  const store = useDashboardStore()
  const { toast } = useToast()

  useEffect(() => {
    // Dashboard-specific events (widget changes)
    const dashboardChannel = supabase
      .channel(`dashboard:${dashboardId}`)
      .on('broadcast', { event: 'widget:created' }, ({ payload }) => {
        store.addWidget(payload.widget)
        toast({
          title: '✨ New widget added',
          description: `${payload.widget.title} was added by your agent`
        })
      })
      .on('broadcast', { event: 'widget:highlight' }, ({ payload }) => {
        store.highlightWidget(payload.widget_id, payload.item_ids)
      })
      .subscribe()

    // User-level events (new dashboard created)
    const userChannel = supabase
      .channel(`user:${userId}`)
      .on('broadcast', { event: 'dashboard:created' }, ({ payload }) => {
        store.addDashboard(payload.dashboard)
        store.setWidgets(payload.dashboard.id, payload.widgets)
        if (payload.autoSwitch) {
          store.setActiveDashboard(payload.dashboard.id)
          toast({
            title: `✨ "${payload.dashboard.name}" dashboard created`,
            description: 'Your agent built this for you'
          })
        }
      })
      .on('broadcast', { event: 'widget:focus' }, ({ payload }) => {
        store.focusWidgetType(payload.widget_type)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(dashboardChannel)
      supabase.removeChannel(userChannel)
    }
  }, [dashboardId])
}
```

---

## ⌨️ Command Palette (Cmd+K)

```typescript
// src/components/layout/CommandPalette.tsx
// Uses cmdk library

// Command categories:
// ─ Ask your agent ──────────────────────────
//   > [free text] — sends to active agent
//
// ─ Dashboard ───────────────────────────────
//   Show my emails
//   Show overdue invoices
//   Build a meeting prep view
//   Add calendar widget
//
// ─ Navigate ────────────────────────────────
//   Go to Dashboard
//   Go to Agents
//   Go to Billing
//
// ─ Quick Actions ───────────────────────────
//   Create new agent
//   Connect an app
//   Upgrade plan

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { sendToAgent } = useChat()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleFreeText = (text: string) => {
    setOpen(false)
    sendToAgent(text)  // Routes to active agent
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Ask your agent or search..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query && (
          <CommandItem onSelect={() => handleFreeText(query)}>
            Ask: "{query}"
          </CommandItem>
        )}
        <CommandGroup heading="Dashboard">
          <CommandItem onSelect={() => handleFreeText('Show my emails')}>
            Show my emails
          </CommandItem>
          <CommandItem onSelect={() => handleFreeText('Show overdue invoices')}>
            Show overdue invoices
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
```

---

## 🧮 Auto-Layout Algorithm

When the agent creates multiple widgets at once, auto-position them:

```typescript
// src/lib/dashboard/layout.ts

export function generateAutoLayout(
  widgets: { size: 'small' | 'medium' | 'large' }[]
): WidgetLayout[] {
  const sizeMap = {
    small: { w: 3, h: 3 },
    medium: { w: 6, h: 4 },
    large: { w: 12, h: 5 }
  }

  const layouts: WidgetLayout[] = []
  let currentX = 0, currentY = 0, rowHeight = 0

  for (const widget of widgets) {
    const { w, h } = sizeMap[widget.size]

    if (currentX + w > 12) {
      currentX = 0
      currentY += rowHeight
      rowHeight = 0
    }

    layouts.push({ x: currentX, y: currentY, w, h })
    currentX += w
    rowHeight = Math.max(rowHeight, h)
  }

  return layouts
}
```
