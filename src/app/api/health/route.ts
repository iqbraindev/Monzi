import { getComposio } from "@/lib/composio/client";
import { getPlatformSecret } from "@/lib/platform/config";
import { getRedis } from "@/lib/redis/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const checks: Record<string, { ok: boolean; error?: string }> = {};

  const requiredEnvVars = [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "REDIS_URL",
  ];

  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
  checks.env = {
    ok: missingEnvVars.length === 0,
    error:
      missingEnvVars.length > 0
        ? `Missing: ${missingEnvVars.join(", ")}`
        : undefined,
  };

  if (
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const { error } = await getSupabaseAdmin()
        .from("packs")
        .select("id")
        .limit(1);
      checks.supabase = error
        ? { ok: false, error: error.message }
        : { ok: true };
    } catch (err) {
      checks.supabase = {
        ok: false,
        error: err instanceof Error ? err.message : "Connection failed",
      };
    }
  } else {
    checks.supabase = { ok: false, error: "Not configured" };
  }

  if (process.env.REDIS_URL) {
    try {
      const pong = await getRedis().ping();
      checks.redis = pong === "PONG" ? { ok: true } : { ok: false, error: "Unexpected ping response" };
    } catch (err) {
      checks.redis = {
        ok: false,
        error: err instanceof Error ? err.message : "Connection failed",
      };
    }
  } else {
    checks.redis = { ok: false, error: "Not configured" };
  }

  const composioKey = await getPlatformSecret("composio.api_key");
  if (composioKey) {
    try {
      await (await getComposio()).connectedAccounts.list({ limit: 1 });
      checks.composio = { ok: true };
    } catch (err) {
      checks.composio = {
        ok: false,
        error: err instanceof Error ? err.message : "Connection failed",
      };
    }
  } else {
    checks.composio = { ok: false, error: "Not configured" };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return Response.json(
    { status: allOk ? "healthy" : "degraded", checks },
    { status: allOk ? 200 : 503 }
  );
}
