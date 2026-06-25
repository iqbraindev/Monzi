# 15 — Stripe Integration

---

## Stripe Products Setup (one-time in Stripe Dashboard)

Create these products and prices, copy price IDs to `.env.local`:

```
Product: Monzi Starter
  Price: $19/mo (monthly) → STRIPE_PRICE_STARTER_MONTHLY
  Price: $190/yr (yearly) → STRIPE_PRICE_STARTER_YEARLY

Product: Monzi Pro
  Price: $49/mo → STRIPE_PRICE_PRO_MONTHLY
  Price: $490/yr → STRIPE_PRICE_PRO_YEARLY

Product: Monzi Business
  Price: $99/mo → STRIPE_PRICE_BUSINESS_MONTHLY
  Price: $990/yr → STRIPE_PRICE_BUSINESS_YEARLY
```

---

## Checkout Session

```typescript
// src/app/api/stripe/checkout/route.ts

export async function POST(req: Request) {
  const { userId } = await auth()
  const { plan, cycle } = await req.json()   // cycle: 'monthly' | 'yearly'

  const priceMap: Record<string, Record<string, string>> = {
    starter:  { monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY!, yearly: process.env.STRIPE_PRICE_STARTER_YEARLY! },
    pro:      { monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,     yearly: process.env.STRIPE_PRICE_PRO_YEARLY! },
    business: { monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY!, yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY! },
  }

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  const session = await stripe.checkout.sessions.create({
    customer: sub.stripe_customer_id,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceMap[plan][cycle], quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    metadata: { userId, plan, cycle },
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId }
    }
  })

  return Response.json({ url: session.url })
}
```

---

## Customer Portal (Manage Billing)

```typescript
// src/app/api/stripe/portal/route.ts

export async function POST(req: Request) {
  const { userId } = await auth()

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`
  })

  return Response.json({ url: session.url })
}
```

---

## Stripe Webhook Handler

```typescript
// src/app/api/webhooks/stripe/route.ts

const PLAN_SLUG_MAP: Record<string, string> = {
  [process.env.STRIPE_PRICE_STARTER_MONTHLY!]: 'starter',
  [process.env.STRIPE_PRICE_STARTER_YEARLY!]:  'starter',
  [process.env.STRIPE_PRICE_PRO_MONTHLY!]:     'pro',
  [process.env.STRIPE_PRICE_PRO_YEARLY!]:      'pro',
  [process.env.STRIPE_PRICE_BUSINESS_MONTHLY!]:'business',
  [process.env.STRIPE_PRICE_BUSINESS_YEARLY!]: 'business',
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      const userId = session.metadata?.userId!
      const plan = session.metadata?.plan!
      const cycle = session.metadata?.cycle!

      const pack = await supabaseAdmin.from('packs').select('id').eq('slug', plan).single()

      await supabaseAdmin.from('subscriptions').update({
        pack_id: pack.data!.id,
        status: 'active',
        billing_cycle: cycle,
        stripe_subscription_id: session.subscription as string,
        current_period_start: new Date().toISOString(),
      }).eq('user_id', userId)

      await updateUserPlan(userId, plan, 'active')
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = invoice.subscription as string

      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subId)
        .single()

      if (sub) {
        // Reset monthly usage
        const now = new Date()
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

        await supabaseAdmin.from('usage_tracking').upsert({
          user_id: sub.user_id,
          period_start: periodStart,
          period_end: periodEnd,
          ai_messages_used: 0,
          ai_tokens_used: 0
        }, { onConflict: 'user_id,period_start' })

        // Update period dates
        const stripeSub = await stripe.subscriptions.retrieve(subId)
        await supabaseAdmin.from('subscriptions').update({
          status: 'active',
          current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
        }).eq('stripe_subscription_id', subId)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = invoice.subscription as string

      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subId)
        .single()

      if (sub) {
        await supabaseAdmin.from('subscriptions').update({ status: 'past_due' })
          .eq('stripe_subscription_id', subId)
        await updateUserPlan(sub.user_id, 'free', 'past_due')
        // TODO: Send payment failure email
      }
      break
    }

    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object as Stripe.Subscription
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', stripeSub.id)
        .single()

      if (sub) {
        const freePack = await supabaseAdmin.from('packs').select('id').eq('slug', 'free').single()
        await supabaseAdmin.from('subscriptions').update({
          status: 'canceled',
          pack_id: freePack.data!.id,
          canceled_at: new Date().toISOString()
        }).eq('stripe_subscription_id', stripeSub.id)

        await updateUserPlan(sub.user_id, 'free', 'active')
      }
      break
    }
  }

  return Response.json({ received: true })
}
```
