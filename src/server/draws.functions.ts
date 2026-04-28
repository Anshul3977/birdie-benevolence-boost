import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const TIER_SPLIT = { match5: 0.4, match4: 0.35, match3: 0.25 } as const;
const MONTHLY_CONTRIBUTION_CENTS = 999; // £9.99 baseline per active sub
const POOL_SHARE_OF_REVENUE = 0.5; // 50% of revenue goes to prize pool

async function requireAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Admin only");
}

interface SimResult {
  drawId: string;
  pool: number;
  rollover: number;
  totalEntries: number;
  perTier: {
    tier: "match5" | "match4" | "match3";
    poolCents: number;
    winners: { user_id: string; matched: number; share: number }[];
    rolledOver: boolean;
  }[];
}

async function buildSimulation(drawId: string): Promise<SimResult> {
  const { data: draw, error } = await supabaseAdmin
    .from("draws")
    .select("id, target_numbers, prize_pool_cents, rollover_cents, kind")
    .eq("id", drawId)
    .single();
  if (error || !draw) throw new Error("Draw not found");

  const targets = (draw.target_numbers ?? []) as number[];
  if (!targets || targets.length !== 5) {
    throw new Error("Draw must have exactly 5 target numbers");
  }

  // Active subscribers
  const { count: activeCount } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id", { count: "exact", head: true })
    .in("status", ["active", "trialing"]);
  const activeSubs = activeCount ?? 0;

  // Auto pool: 50% of (active * monthly) + admin-set base + rollover
  const autoPool = Math.floor(activeSubs * MONTHLY_CONTRIBUTION_CENTS * POOL_SHARE_OF_REVENUE);
  const totalPool = autoPool + (draw.prize_pool_cents ?? 0) + (draw.rollover_cents ?? 0);

  // Get latest 5 scores per active subscriber
  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .in("status", ["active", "trialing"]);
  const userIds = (subs ?? []).map((s) => s.user_id);

  const matchesPerUser = new Map<string, number>();
  if (userIds.length > 0) {
    const { data: scores } = await supabaseAdmin
      .from("scores")
      .select("user_id, score, played_on")
      .in("user_id", userIds)
      .order("played_on", { ascending: false });

    // Take latest 5 per user
    const latestByUser = new Map<string, number[]>();
    for (const row of scores ?? []) {
      const arr = latestByUser.get(row.user_id) ?? [];
      if (arr.length < 5) {
        arr.push(row.score);
        latestByUser.set(row.user_id, arr);
      }
    }
    const targetSet = new Set(targets);
    for (const [uid, arr] of latestByUser) {
      let m = 0;
      const seen = new Set<number>();
      for (const v of arr) {
        if (targetSet.has(v) && !seen.has(v)) {
          seen.add(v);
          m += 1;
        }
      }
      if (m >= 3) matchesPerUser.set(uid, m);
    }
  }

  const tiers: SimResult["perTier"] = [];
  for (const [tierName, pct] of Object.entries(TIER_SPLIT) as [
    "match5" | "match4" | "match3",
    number,
  ][]) {
    const want = tierName === "match5" ? 5 : tierName === "match4" ? 4 : 3;
    const poolCents = Math.floor(totalPool * pct);
    const winners = Array.from(matchesPerUser.entries())
      .filter(([, m]) => m === want)
      .map(([user_id, matched]) => ({ user_id, matched, share: 0 }));

    if (winners.length === 0) {
      tiers.push({ tier: tierName, poolCents, winners, rolledOver: true });
    } else {
      const share = Math.floor(poolCents / winners.length);
      tiers.push({
        tier: tierName,
        poolCents,
        winners: winners.map((w) => ({ ...w, share })),
        rolledOver: false,
      });
    }
  }

  return {
    drawId: draw.id,
    pool: totalPool,
    rollover: draw.rollover_cents ?? 0,
    totalEntries: userIds.length,
    perTier: tiers,
  };
}

export const simulateDraw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ drawId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    return await buildSimulation(data.drawId);
  });

export const publishDraw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ drawId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const sim = await buildSimulation(data.drawId);

    // Insert winners
    const rows = sim.perTier.flatMap((t) =>
      t.winners.map((w) => ({
        draw_id: sim.drawId,
        user_id: w.user_id,
        tier: t.tier,
        matched_count: w.matched,
        prize_cents: w.share,
      })),
    );
    if (rows.length > 0) {
      const { error } = await supabaseAdmin.from("winners").upsert(rows, {
        onConflict: "draw_id,user_id,tier",
      });
      if (error) throw new Error(error.message);
    }

    // Calculate rollover for next draw (jackpot tier 5 only rolls)
    const rollover = sim.perTier
      .filter((t) => t.tier === "match5" && t.rolledOver)
      .reduce((sum, t) => sum + t.poolCents, 0);

    // Mark this draw published
    await supabaseAdmin
      .from("draws")
      .update({ status: "published", prize_pool_cents: sim.pool })
      .eq("id", sim.drawId);

    // If rollover, push it to the next draft/open draw chronologically after this one
    if (rollover > 0) {
      const { data: thisDraw } = await supabaseAdmin
        .from("draws")
        .select("draw_month")
        .eq("id", sim.drawId)
        .single();
      if (thisDraw) {
        const { data: nextDraw } = await supabaseAdmin
          .from("draws")
          .select("id, rollover_cents")
          .gt("draw_month", thisDraw.draw_month)
          .in("status", ["draft", "open"])
          .order("draw_month", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (nextDraw) {
          await supabaseAdmin
            .from("draws")
            .update({ rollover_cents: (nextDraw.rollover_cents ?? 0) + rollover })
            .eq("id", nextDraw.id);
        }
      }
    }

    return { ...sim, rolloverToNext: rollover, winnersCreated: rows.length };
  });
