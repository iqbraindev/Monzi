# Proactive Watches — Manual E2E Checklist

## Prerequisites

- Run migration: `npm run db:migrate:013` then `npm run db:reload-schema`
- Start stack: `docker compose up` (includes `watch-worker`)
- Connect at least one Composio app (e.g. Gmail) in Integrations

## Scenarios

### 1. Create watch via agent (connected app)

1. Open an agent chat with Gmail connected
2. Say: "Watch if anyone emails about pricing for our product"
3. Agent should call `create_watch` and confirm an active watch
4. Open `/watches` — watch appears as **Active**

### 2. Missing app connection

1. Disconnect or use an agent without Slack connected
2. Say: "Watch Slack for mentions of Monzi"
3. Agent should return a connect link to `/integrations?connect=slack`
4. No incomplete watch row should be created

### 3. Worker fires notification

1. With an active Gmail watch, send a matching test email
2. Within ~3 minutes (poll interval), check:
   - Notification bell shows unread count
   - Agent insight bar shows the alert
   - `/watches` shows updated **Last checked**

### 4. Pause and resume

1. On `/watches`, pause an active watch
2. Confirm no new notifications after further matching events
3. Resume — polling continues

### 5. Dedupe

1. Trigger the same source item twice (re-poll without new email)
2. Only one notification should exist for that item

### 6. Plan limit

1. On free plan, create watches until limit (default: 2 active)
2. Third create should return upgrade/limit error

### 7. Proactive pref off

1. Settings → disable **Proactive insights**
2. Trigger a watch match
3. No in-app notification (trigger event still logged in DB)

### 8. HTTP tick (optional)

```bash
curl -X POST http://localhost:3000/api/internal/watch-tick \
  -H "Authorization: Bearer $WATCH_WORKER_SECRET"
```
