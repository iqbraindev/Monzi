/**
 * Standalone watch poller for Docker / self-hosted deployments.
 * Run: npx tsx src/workers/watch-poller.ts
 */
import { pollWatchesBatch } from "@/lib/watches/poller";
import { acquireWatchPollLock } from "@/lib/watches/redis-lock";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const POLL_INTERVAL_MS = Number(process.env.WATCH_POLL_INTERVAL_MS ?? 180_000);
const BATCH_SIZE = Number(process.env.WATCH_BATCH_SIZE ?? 50);

async function tick(): Promise<void> {
  const lock = await acquireWatchPollLock();
  if (!lock.acquired) {
    console.log("[watch-worker] Skipping tick — another worker holds the lock");
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const result = await pollWatchesBatch(supabase, BATCH_SIZE);
    console.log(
      `[watch-worker] processed=${result.processed} triggered=${result.triggered} errors=${result.errors}`
    );
  } catch (err) {
    console.error("[watch-worker] tick failed", err);
  } finally {
    await lock.release();
  }
}

async function main(): Promise<void> {
  console.log(
    `[watch-worker] Starting (interval=${POLL_INTERVAL_MS}ms batch=${BATCH_SIZE})`
  );

  await tick();
  setInterval(() => {
    void tick();
  }, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error("[watch-worker] Fatal error", err);
  process.exit(1);
});
