# 13 — Composio Integration

---

## Setup

```typescript
// src/lib/composio/client.ts
import { Composio } from 'composio-core'

export const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY!
})
```

---

## Tool Loading Per Agent

```typescript
// src/lib/composio/tools.ts
import { LangchainToolSet } from 'composio-core'

export async function getComposioToolsForAgent(
  apps: string[],
  userId: string
): Promise<Tool[]> {
  const toolset = new LangchainToolSet({
    apiKey: process.env.COMPOSIO_API_KEY!,
    entityId: userId                          // Per-user OAuth tokens
  })

  return toolset.getTools({ apps })
}
```

---

## OAuth Connect Flow

```typescript
// src/app/api/composio/connect/route.ts

export async function POST(req: Request) {
  const { userId } = await auth()
  const { app } = await req.json()

  const entity = composio.getEntity(userId)
  const connection = await entity.initiateConnection({ appName: app })

  return Response.json({ redirect_url: connection.redirectUrl })
}

// src/app/api/composio/callback/route.ts
export async function GET(req: Request) {
  // Composio handles the OAuth callback
  // Redirect user back to integrations page
  return NextResponse.redirect(new URL('/integrations?connected=true', req.url))
}
```

---

## Tool Execution (Widget Data)

```typescript
// src/app/api/composio/execute/route.ts

export async function POST(req: Request) {
  const { userId } = await auth()
  const { tool, params } = await req.json()

  // Rate limit check
  const limit = await ratelimit.limit(userId)
  if (!limit.success) {
    return Response.json({ error: 'Rate limited' }, { status: 429 })
  }

  const entity = composio.getEntity(userId)
  const result = await entity.execute(tool, params)

  return Response.json(result)
}
```

---

## Popular Tool Mappings

```typescript
// Widget type → Composio tool mapping
export const COMPOSIO_TOOL_MAP = {
  // Gmail
  email_inbox:         'GMAIL_FETCH_EMAILS',
  email_unread_count:  'GMAIL_GET_UNREAD_COUNT',

  // Google Calendar
  calendar_today:      'GOOGLECALENDAR_GET_TODAY_EVENTS',
  calendar_week:       'GOOGLECALENDAR_GET_WEEK_EVENTS',

  // Notion
  task_list:           'NOTION_FETCH_TASKS',

  // HubSpot
  crm_contacts:        'HUBSPOT_GET_CONTACTS',
  crm_pipeline:        'HUBSPOT_GET_PIPELINE',

  // Slack
  slack_messages:      'SLACK_GET_MESSAGES',

  // GitHub
  github_prs:          'GITHUB_GET_PULL_REQUESTS',

  // Stripe
  finance_revenue:     'STRIPE_GET_REVENUE',
  finance_invoices:    'STRIPE_GET_INVOICES',
}
```

---

# 14 — Clerk Integration

---

## User Metadata Structure

```typescript
// Clerk publicMetadata (visible to client)
interface ClerkPublicMetadata {
  role: 'super_admin' | 'user' | 'subaccount'
  plan: 'free' | 'starter' | 'pro' | 'business'
  plan_status: 'active' | 'trialing' | 'past_due' | 'canceled'
  onboarding_completed: boolean
}

// Clerk privateMetadata (server-side only)
interface ClerkPrivateMetadata {
  stripe_customer_id: string
  parent_user_id?: string           // subaccounts only
  custom_limits?: Partial<PackLimits>
}
```

---

## Clerk Webhook Handler

```typescript
// src/app/api/webhooks/clerk/route.ts

import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)

  // Verify webhook signature
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
  let event: WebhookEvent

  try {
    event = wh.verify(payload, headers) as WebhookEvent
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'user.created': {
      const { id, email_addresses, first_name, last_name, image_url } = event.data
      const email = email_addresses[0].email_address

      // 1. Create user in DB
      await supabaseAdmin.from('users').insert({
        id,
        email,
        full_name: `${first_name} ${last_name}`.trim(),
        avatar_url: image_url,
        role: email === process.env.SUPER_ADMIN_EMAIL ? 'super_admin' : 'user'
      })

      // 2. Create Stripe customer
      const customer = await stripe.customers.create({ email, metadata: { clerk_id: id } })

      // 3. Create free subscription
      const freePack = await supabaseAdmin.from('packs').select('id').eq('slug', 'free').single()
      await supabaseAdmin.from('subscriptions').insert({
        user_id: id,
        pack_id: freePack.data!.id,
        status: 'active',
        stripe_customer_id: customer.id
      })

      // 4. Update Clerk metadata
      await clerkClient.users.updateUserMetadata(id, {
        publicMetadata: {
          role: email === process.env.SUPER_ADMIN_EMAIL ? 'super_admin' : 'user',
          plan: 'free',
          plan_status: 'active',
          onboarding_completed: false
        },
        privateMetadata: { stripe_customer_id: customer.id }
      })

      // 5. Create default agent
      await supabaseAdmin.from('agents').insert({
        user_id: id,
        name: 'Monzi',
        slug: 'aria',
        role: 'general_assistant',
        is_default: true
      })

      // 6. Create default dashboard
      await supabaseAdmin.from('dashboards').insert({
        user_id: id,
        name: 'My Dashboard',
        is_default: true
      })

      break
    }

    case 'user.deleted': {
      // Cascade delete handled by DB foreign keys
      await supabaseAdmin.from('users').delete().eq('id', event.data.id)
      break
    }
  }

  return Response.json({ success: true })
}
```

---

## Metadata Helper Functions

```typescript
// src/lib/clerk/metadata.ts

export async function updateUserPlan(
  userId: string,
  plan: string,
  status: string
) {
  await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: { plan, plan_status: status }
  })
  // Invalidate limits cache
  await redis.del(`limits:${userId}`)
}

export async function getUserRole(userId: string): Promise<string> {
  const user = await clerkClient.users.getUser(userId)
  return (user.publicMetadata.role as string) || 'user'
}

export async function impersonateUser(
  adminId: string,
  targetUserId: string
): Promise<string> {
  // Log the impersonation
  await supabaseAdmin.from('audit_log').insert({
    actor_id: adminId,
    target_type: 'user',
    target_id: targetUserId,
    action: 'admin.impersonate'
  })
  // Return a sign-in token (Clerk feature)
  const token = await clerkClient.users.createSignInToken({
    userId: targetUserId,
    expiresInSeconds: 3600
  })
  return token.token
}
```
