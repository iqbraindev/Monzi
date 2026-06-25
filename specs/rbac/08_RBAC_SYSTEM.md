# 08 — RBAC & Limits Enforcement

---

## 🔐 Clerk Middleware (Role Enforcement)

```typescript
// middleware.ts (root level)

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)'])
const isUserRoute = createRouteMatcher(['/dashboard(.*)', '/agents(.*)', '/billing(.*)'])
const isSubaccountBlocked = createRouteMatcher(['/billing(.*)', '/subaccounts(.*)', '/api/admin(.*)'])
const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)', '/api/webhooks(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next()

  const { userId, sessionClaims } = await auth()

  // Not authenticated
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  const role = sessionClaims?.publicMetadata?.role as string
  const planStatus = sessionClaims?.publicMetadata?.plan_status as string

  // Super admin only routes
  if (isAdminRoute(req) && role !== 'super_admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Subaccount restrictions
  if (role === 'subaccount' && isSubaccountBlocked(req)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Past due subscription — allow billing page only
  if (planStatus === 'past_due' && !req.nextUrl.pathname.startsWith('/billing')) {
    return NextResponse.redirect(new URL('/billing?status=past_due', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

---

## ⚖️ LimitEnforcer Service

```typescript
// src/lib/limits/enforcer.ts

import { redis } from '@/lib/redis/client'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface EnforcementResult {
  allowed: boolean
  reason?: string
  message?: string
  current?: number
  limit?: number
  upgradeRequired?: boolean
  currentPlan?: string
}

export class LimitEnforcer {
  private static instance: LimitEnforcer
  static getInstance() {
    if (!this.instance) this.instance = new LimitEnforcer()
    return this.instance
  }

  // ── Get effective limits (pack + custom overrides) ──────────────
  async getEffectiveLimits(userId: string) {
    const cacheKey = `limits:${userId}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached as string)

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*, packs(*, pack_limits(*))')
      .eq('user_id', userId)
      .single()

    if (!sub) throw new Error('No subscription found')

    const packLimits = sub.packs.pack_limits[0]
    const effectiveLimits = sub.custom_limits
      ? { ...packLimits, ...sub.custom_limits }
      : packLimits

    await redis.set(cacheKey, JSON.stringify(effectiveLimits), { ex: 300 })
    return effectiveLimits
  }

  // ── Get current usage ───────────────────────────────────────────
  async getCurrentUsage(userId: string, metric: string): Promise<number> {
    const cacheKey = `usage:${userId}:${metric}`
    const cached = await redis.get(cacheKey)
    if (cached) return parseInt(cached as string)

    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data } = await supabaseAdmin
      .from('usage_tracking')
      .select(metric)
      .eq('user_id', userId)
      .gte('period_start', periodStart)
      .single()

    const value = data?.[metric] || 0
    await redis.set(cacheKey, value.toString(), { ex: 60 })
    return value
  }

  // ── Check AI message limit ──────────────────────────────────────
  async canSendMessage(userId: string): Promise<EnforcementResult> {
    const limits = await this.getEffectiveLimits(userId)

    if (limits.ai_messages_per_month === -1) return { allowed: true }

    const used = await this.getCurrentUsage(userId, 'ai_messages_used')

    if (used >= limits.ai_messages_per_month) {
      return {
        allowed: false,
        reason: 'monthly_message_limit_reached',
        message: `You've used all ${limits.ai_messages_per_month} monthly messages.`,
        current: used,
        limit: limits.ai_messages_per_month,
        upgradeRequired: true
      }
    }

    // Daily limit
    if (limits.ai_messages_per_day !== -1) {
      const dailyUsed = await this.getDailyUsage(userId, 'ai_messages')
      if (dailyUsed >= limits.ai_messages_per_day) {
        return {
          allowed: false,
          reason: 'daily_message_limit_reached',
          message: `You've reached your daily limit of ${limits.ai_messages_per_day} messages. Resets tomorrow.`,
          current: dailyUsed,
          limit: limits.ai_messages_per_day,
          upgradeRequired: false
        }
      }
    }

    return { allowed: true, current: used, limit: limits.ai_messages_per_month }
  }

  // ── Check agent creation limit ──────────────────────────────────
  async canCreateAgent(userId: string): Promise<EnforcementResult> {
    const limits = await this.getEffectiveLimits(userId)
    if (limits.max_agents === -1) return { allowed: true }

    const { count } = await supabaseAdmin
      .from('agents')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_active', true)

    if ((count || 0) >= limits.max_agents) {
      return {
        allowed: false,
        reason: 'agent_limit_reached',
        message: `Your plan allows ${limits.max_agents} agent(s). Upgrade to create more.`,
        current: count || 0,
        limit: limits.max_agents,
        upgradeRequired: true
      }
    }

    return { allowed: true }
  }

  // ── Check subaccount creation limit ────────────────────────────
  async canCreateSubaccount(userId: string): Promise<EnforcementResult> {
    const limits = await this.getEffectiveLimits(userId)
    if (limits.max_subaccounts === -1) return { allowed: true }

    if (limits.max_subaccounts === 0) {
      return {
        allowed: false,
        reason: 'subaccounts_not_available',
        message: 'Your plan does not include subaccounts. Upgrade to add team members.',
        upgradeRequired: true
      }
    }

    const { count } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact' })
      .eq('parent_user_id', userId)

    if ((count || 0) >= limits.max_subaccounts) {
      return {
        allowed: false,
        reason: 'subaccount_limit_reached',
        message: `Your plan allows ${limits.max_subaccounts} subaccount(s).`,
        current: count || 0,
        limit: limits.max_subaccounts,
        upgradeRequired: true
      }
    }

    return { allowed: true }
  }

  // ── Check feature access ────────────────────────────────────────
  async canUseFeature(userId: string, feature: keyof PackLimits): Promise<EnforcementResult> {
    const limits = await this.getEffectiveLimits(userId)
    const allowed = limits[feature] === true

    return {
      allowed,
      reason: allowed ? undefined : 'feature_not_in_plan',
      message: allowed ? undefined : `This feature requires a higher plan. Upgrade to unlock it.`,
      upgradeRequired: !allowed
    }
  }

  // ── Increment usage counter ─────────────────────────────────────
  async incrementUsage(userId: string, metric: string, amount = 1) {
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
    const today = now.toISOString().split('T')[0]

    // Upsert monthly tracking
    await supabaseAdmin.rpc('increment_usage', {
      p_user_id: userId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_metric: metric,
      p_amount: amount
    })

    // Upsert daily tracking
    if (metric === 'ai_messages_used') {
      await supabaseAdmin.rpc('increment_daily_usage', {
        p_user_id: userId,
        p_date: today,
        p_amount: amount
      })
    }

    // Invalidate cache
    await redis.del(`usage:${userId}:${metric}`)
  }

  private async getDailyUsage(userId: string, metric: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabaseAdmin
      .from('usage_daily')
      .select(metric)
      .eq('user_id', userId)
      .eq('date', today)
      .single()
    return data?.[metric] || 0
  }
}

export const limitEnforcer = LimitEnforcer.getInstance()
```

---

## 🚦 API Route Guard Helper

```typescript
// src/lib/limits/checker.ts
// Wrap any API route with limit checks

import { auth } from '@clerk/nextjs/server'
import { limitEnforcer } from './enforcer'

export async function withLimitCheck(
  checkFn: (userId: string) => Promise<EnforcementResult>,
  handler: (userId: string) => Promise<Response>
): Promise<Response> {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await checkFn(userId)

  if (!result.allowed) {
    return Response.json({
      error: result.reason,
      message: result.message,
      upgrade_required: result.upgradeRequired,
      current: result.current,
      limit: result.limit,
      upgrade_url: '/billing'
    }, { status: 402 })
  }

  return handler(userId)
}

// Usage in API route:
// export async function POST(req: Request) {
//   return withLimitCheck(
//     (userId) => limitEnforcer.canSendMessage(userId),
//     async (userId) => { /* handle chat */ }
//   )
// }
```

---

## 🛡️ Client-Side Limit Awareness

```typescript
// src/hooks/useLimits.ts
// Show limits in UI before hitting server

export function useLimits() {
  const { data: limits } = useQuery({
    queryKey: ['user-limits'],
    queryFn: () => fetch('/api/user/limits').then(r => r.json()),
    staleTime: 5 * 60 * 1000
  })

  const { data: usage } = useQuery({
    queryKey: ['user-usage'],
    queryFn: () => fetch('/api/user/usage').then(r => r.json()),
    staleTime: 60 * 1000
  })

  const isNearLimit = (metric: string, threshold = 0.8) => {
    if (!limits || !usage) return false
    const limit = limits[metric]
    if (limit === -1) return false
    return (usage[metric] / limit) >= threshold
  }

  const isAtLimit = (metric: string) => {
    if (!limits || !usage) return false
    const limit = limits[metric]
    if (limit === -1) return false
    return usage[metric] >= limit
  }

  return { limits, usage, isNearLimit, isAtLimit }
}
```

---

## UpgradePrompt Component

```typescript
// src/components/billing/UpgradePrompt.tsx
// Shown automatically when a limit is hit

export function UpgradePrompt({ reason, message }: {
  reason: string
  message: string
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
      <span className="text-2xl">⚡</span>
      <div className="flex-1">
        <p className="font-medium text-amber-900">{message}</p>
        <Link href="/billing" className="mt-2 inline-block text-sm font-medium text-amber-700 underline">
          Upgrade your plan →
        </Link>
      </div>
    </div>
  )
}
```
