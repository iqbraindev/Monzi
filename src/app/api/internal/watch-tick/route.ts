import { pollWatchesBatch } from "@/lib/watches/poller";
import { acquireWatchPollLock } from "@/lib/watches/redis-lock";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const BATCH_SIZE = Number(process.env.WATCH_BATCH_SIZE ?? 50);

export async function POST(req: Request) {
  const secret = process.env.WATCH_WORKER_SECRET;
  const authHeader = req.headers.get("authorization");
  const provided = authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!secret || provided !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lock = await acquireWatchPollLock();
  if (!lock.acquired) {
    return Response.json({ ok: true, skipped: true, reason: "lock_held" });
  }

  try {
    const supabase = getSupabaseAdmin();
    const result = await pollWatchesBatch(supabase, BATCH_SIZE);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Watch tick failed";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await lock.release();
  }
}
