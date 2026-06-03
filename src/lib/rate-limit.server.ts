import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getClientIp, hashIp } from "./session.server";

type Action = "post" | "comment" | "report" | "community" | "room";

const LIMITS: Record<Action, { count: number; windowMs: number }> = {
  post: { count: 5, windowMs: 60_000 },
  comment: { count: 20, windowMs: 60_000 },
  report: { count: 10, windowMs: 60 * 60_000 },
  community: { count: 3, windowMs: 60 * 60_000 },
  room: { count: 5, windowMs: 60 * 60_000 },
};

/**
 * Throws if the current IP has exceeded the action limit. Otherwise records the hit.
 */
export async function enforceRateLimit(action: Action): Promise<void> {
  const cfg = LIMITS[action];
  const ipHash = hashIp(getClientIp());
  const since = new Date(Date.now() - cfg.windowMs).toISOString();

  const { count } = await (supabaseAdmin as any)
    .from("rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("action", action)
    .gte("created_at", since);

  if ((count ?? 0) >= cfg.count) {
    const mins = Math.ceil(cfg.windowMs / 60_000);
    throw new Error(`Slow down — too many ${action}s. Try again in ${mins} min.`);
  }

  await (supabaseAdmin as any).from("rate_limits").insert({ ip_hash: ipHash, action });
}