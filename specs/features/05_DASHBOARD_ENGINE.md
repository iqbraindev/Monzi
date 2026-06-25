# 05 — Dashboard Engine Specification

---

## 🎛️ Dashboard Data Model

```typescript
interface Dashboard {
  id: string
  user_id: string
  name: string                          // "Morning Briefing", "Work", "Clients"
  description?: string
  is_default: boolean
  is_pinned: boolean
  created_by: 'user' | 'agent'
  icon?: string                         // emoji or icon name
  color?: string                        // tab accent color
  created_at: string
}

interface Widget {
  id: string
  dashboard_id: string
  type: WidgetType
  title: string
  data_source: WidgetDataSource
  layout: WidgetLayout
  style: WidgetStyle
  created_by: 'user' | 'agent'
  is_highlighted?: boolean              // agent draws attention to this
  created_at: string
}

type WidgetType =
  | 'email_inbox'
  | 'email_unread_count'
  | 'task_list'
  | 'kanban_board'
  | 'calendar_today'
  | 'calendar_week'
  | 'crm_contacts'
  | 'crm_pipeline'
  | 'finance_revenue'
  | 'finance_invoices'
  | 'slack_messages'
  | 'github_prs'
  | 'analytics_traffic'
  | 'chart_bar'
  | 'chart_line'
  | 'ai_insights'
  | 'custom_list'

interface WidgetDataSource {
  integration: string                   // 'gmail' | 'notion' | 'hubspot'...
  composio_tool: string                 // exact Composio tool name
  filters: Record<string, any>          // e.g. { status: 'unread', limit: 10 }
  refresh_interval_sec: number          // how often to refetch
}

interface WidgetLayout {
  x: number
  y: number
  w: number                             // grid units (max 12)
  h: number                             // grid units
  min_w?: number
  min_h?: number
}

interface WidgetStyle {
  theme: 'default' | 'compact' | 'detailed' | 'card'
  accent_color?: string
  show_title: boolean
  show_last_updated: boolean
}
```

---

## 🔧 Widget Registry

All widget types must be registered here. Each entry defines how to fetch and render.

```typescript
// src/lib/dashboard/widget-registry.ts

export const WIDGET_REGISTRY: Record<WidgetType, WidgetDefinition> = {
  email_inbox: {
    label: 'Email Inbox',
    icon: '📧',
    category: 'Communication',
    integration: 'gmail',
    composio_tool: 'GMAIL_FETCH_EMAILS',
    default_filters: { limit: 10, status: 'all' },
    default_layout: { w: 6, h: 4, min_w: 4, min_h: 3 },
    default_refresh: 60,
    component: EmailWidget,
  },
  task_list: {
    label: 'Tasks',
    icon: '✅',
    category: 'Productivity',
    integration: 'notion',
    composio_tool: 'NOTION_FETCH_TASKS',
    default_filters: { status: 'in_progress', limit: 20 },
    default_layout: { w: 4, h: 4, min_w: 3, min_h: 3 },
    default_refresh: 120,
    component: TasksWidget,
  },
  // ... all other widget types
}
```

---

## 📐 Dashboard Grid System

Using `react-grid-layout`:

```typescript
// src/components/dashboard/DashboardGrid.tsx

import GridLayout, { WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'

const ResponsiveGridLayout = WidthProvider(GridLayout)

export function DashboardGrid({ dashboardId }: { dashboardId: string }) {
  const { widgets, updateLayout } = useDashboard(dashboardId)
  const { listenForAgentEvents } = useRealtimeDashboard(dashboardId)

  // Listen for agent-driven widget additions
  useEffect(() => {
    listenForAgentEvents()
  }, [])

  const layouts = widgets.map(w => ({
    i: w.id,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
    minW: w.layout.min_w,
    minH: w.layout.min_h,
  }))

  return (
    <ResponsiveGridLayout
      className="layout"
      layout={layouts}
      cols={12}
      rowHeight={80}
      isDraggable={true}
      isResizable={true}
      onLayoutChange={(newLayout) => updateLayout(dashboardId, newLayout)}
      draggableHandle=".widget-drag-handle"
    >
      {widgets.map(widget => (
        <div key={widget.id}>
          <WidgetWrapper
            widget={widget}
            isHighlighted={widget.is_highlighted}
          />
        </div>
      ))}
    </ResponsiveGridLayout>
  )
}
```

---

## ⚡ Widget Data Fetching

Each widget fetches its own data independently:

```typescript
// src/hooks/useWidget.ts

export function useWidgetData(widget: Widget) {
  const cacheKey = `widget:${widget.id}:data`

  return useQuery({
    queryKey: ['widget', widget.id],
    queryFn: async () => {
      // Check Redis cache first
      const cached = await redis.get(cacheKey)
      if (cached) return JSON.parse(cached)

      // Fetch from Composio via our API
      const response = await fetch('/api/composio/execute', {
        method: 'POST',
        body: JSON.stringify({
          tool: widget.data_source.composio_tool,
          filters: widget.data_source.filters,
          widgetId: widget.id
        })
      })

      const data = await response.json()

      // Cache with TTL
      await redis.set(cacheKey, JSON.stringify(data), {
        ex: widget.data_source.refresh_interval_sec
      })

      return data
    },
    refetchInterval: widget.data_source.refresh_interval_sec * 1000,
    staleTime: (widget.data_source.refresh_interval_sec - 10) * 1000,
  })
}
```

---

## 🔴 Widget States & Error Handling

```typescript
// src/components/dashboard/WidgetWrapper.tsx

export function WidgetWrapper({ widget, isHighlighted }: WidgetProps) {
  const { data, isLoading, isError, error, refetch } = useWidgetData(widget)
  const WidgetComponent = WIDGET_REGISTRY[widget.type].component

  return (
    <div className={cn(
      "widget-shell rounded-xl border bg-card h-full flex flex-col",
      isHighlighted && "ring-2 ring-primary ring-offset-2 animate-pulse-border"
    )}>
      {/* Drag handle + header */}
      <WidgetHeader widget={widget} onRefresh={refetch} />

      {/* Content */}
      <div className="flex-1 overflow-hidden p-3">
        {isLoading && <WidgetSkeleton type={widget.type} />}
        {isError && <WidgetError error={error} onRetry={refetch} />}
        {data && <WidgetComponent data={data} widget={widget} />}
      </div>

      {/* Footer: last updated + quick AI actions */}
      <WidgetFooter widget={widget} data={data} />
    </div>
  )
}
```

---

## 🗂️ Dashboard Tab System

Users can have multiple dashboards, switched via tabs:

```
[ 🌅 Morning Briefing ] [ 💼 Work ] [ 👥 Clients ] [ 💰 Finance ] [ + New ]
```

```typescript
// src/components/dashboard/DashboardTabs.tsx
// - Click tab to switch active dashboard
// - "+" opens CreateDashboardModal (manual) or triggers agent command
// - Agent-created dashboards show ✨ icon
// - Long-press on tab to rename/delete
```

---

## 💡 AI Insight Bar

Persistent bar at top of every dashboard page:

```typescript
// src/components/agents/AgentInsightBar.tsx
// Fetches proactive insights from active agent every 10 minutes
// Shows the most important alert/insight
// Actions: "Tell me more" (opens chat) | "Dismiss"

// Example insights generated by agent:
// "You have 3 unread emails from clients marked urgent"
// "Invoice #204 is 5 days overdue — want me to send a reminder?"
// "Your meeting with Acme Corp is in 45 minutes"
// "You're 80% through your monthly message quota"
```

---

## ➕ Add Widget Flow

```
User clicks "+ Add Widget"
    → WidgetPicker modal opens
    → Browse by category (Communication, Tasks, Finance...)
    → OR search by name
    → Click widget type
    → If integration not connected: "Connect [App] first" → Composio OAuth
    → If connected: Configure filters (optional) → Add to Dashboard
    → Widget animates into grid at bottom
```
