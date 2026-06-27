# 03 — Environment Variables

## `.env.local` — Full Reference

```bash
# ─────────────────────────────────────────
# APP
# ─────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Monzi
NODE_ENV=development

# ─────────────────────────────────────────
# CLERK — Auth
# https://dashboard.clerk.com
# ─────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx            # From Clerk Dashboard > Webhooks

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# ─────────────────────────────────────────
# SUPABASE — Database + Storage + Realtime
# https://supabase.com/dashboard
# ─────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx          # Server-side only, never expose

# ─────────────────────────────────────────
# UPSTASH REDIS — Cache + Rate Limiting
# https://console.upstash.com
# ─────────────────────────────────────────
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# ─────────────────────────────────────────
# OPENAI — LLM + Embeddings + STT + TTS
# https://platform.openai.com
# ─────────────────────────────────────────
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o                       # Primary model
OPENAI_MODEL_FAST=gpt-4o-mini             # For simple/fast queries
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_TTS_MODEL=tts-1
OPENAI_STT_MODEL=whisper-1

# ─────────────────────────────────────────
# ANTHROPIC — Fallback LLM (long context)
# https://console.anthropic.com
# ─────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# ─────────────────────────────────────────
# ELEVENLABS — Conversational AI live voice (STT + LLM + TTS)
# https://elevenlabs.io
# Run scripts/setup-elevenlabs-agent.mjs once to create the agent and get its id.
# ─────────────────────────────────────────
ELEVENLABS_API_KEY=xxx
ELEVENLABS_AGENT_ID=agent_xxx
ELEVENLABS_DEFAULT_VOICE_ID=cjVigY5qzO86Huf0OWal
# Bearer token ElevenLabs sends to POST /api/elevenlabs/v1/chat/completions
ELEVENLABS_CUSTOM_LLM_SECRET=monzi-voice-llm-dev-secret
# Public URL for custom LLM in local dev (ngrok). Production uses NEXT_PUBLIC_APP_URL.
# ELEVENLABS_CUSTOM_LLM_URL=https://your-subdomain.ngrok-free.app

# ─────────────────────────────────────────
# DEEPGRAM — Real-time STT
# https://deepgram.com
# ─────────────────────────────────────────
DEEPGRAM_API_KEY=xxx

# OPENAI — fallback STT/TTS for the push-to-talk side panel (optional)
OPENAI_API_KEY=sk-xxx

# OPENROUTER — STT/TTS models for the push-to-talk side panel (/api/transcribe, /api/tts)
OPENROUTER_STT_MODEL=openai/whisper-large-v3
OPENROUTER_TTS_MODEL=sesame/csm-1b

# ─────────────────────────────────────────
# COMPOSIO — App Integrations
# https://app.composio.dev
# ─────────────────────────────────────────
COMPOSIO_API_KEY=xxx
NEXT_PUBLIC_COMPOSIO_CLIENT_ID=xxx

# ─────────────────────────────────────────
# STRIPE — Billing
# https://dashboard.stripe.com
# ─────────────────────────────────────────
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx           # From Stripe Dashboard > Webhooks

# Stripe Product Price IDs (create in Stripe Dashboard)
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_YEARLY=price_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
STRIPE_PRICE_BUSINESS_MONTHLY=price_xxx
STRIPE_PRICE_BUSINESS_YEARLY=price_xxx

# ─────────────────────────────────────────
# LANGFUSE — LLM Observability
# https://langfuse.com
# ─────────────────────────────────────────
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_SECRET_KEY=sk-lf-xxx
LANGFUSE_HOST=https://cloud.langfuse.com

# ─────────────────────────────────────────
# POSTHOG — Analytics
# https://posthog.com
# ─────────────────────────────────────────
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# ─────────────────────────────────────────
# SENTRY — Error Tracking
# https://sentry.io
# ─────────────────────────────────────────
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# ─────────────────────────────────────────
# PLATFORM SECRETS (Admin integrations UI)
# ─────────────────────────────────────────
PLATFORM_SECRETS_ENCRYPTION_KEY=your-32-byte-hex-or-base64-key

# ─────────────────────────────────────────
# SUPER ADMIN
# ─────────────────────────────────────────
SUPER_ADMIN_EMAIL=admin@aria.app          # Used to auto-assign role on signup
SUPER_ADMIN_CLERK_ID=user_xxx             # Set after first login
```

## Setup Order

1. Create Supabase project → get URL + keys
2. Create Clerk application → get keys + configure webhooks
3. Create Stripe account → create products + get webhook secret
4. Create Composio account → get API key
5. Create OpenAI account → get API key
6. Create Upstash Redis → get URL + token
7. Set up Langfuse + PostHog + Sentry
8. Copy all to `.env.local`
9. Run `supabase/migrations/*.sql` against your DB
10. Run `supabase/seed.sql` to create default packs
