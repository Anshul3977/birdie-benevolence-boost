import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import {
  Trash2,
  Pencil,
  Heart,
  X,
  Check,
  Trophy,
  CalendarDays,
  Timer,
  Activity,
} from "lucide-react";
import { WinningsPanel } from "@/components/WinningsPanel";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

interface Score {
  id: string;
  score: number;
  played_on: string;
}

interface Profile {
  display_name: string | null;
  selected_charity_id: string | null;
  contribution_percent: number;
  charities: { name: string } | null;
}

interface Draw {
  id: string;
  title: string;
  draw_month: string;
  status: "draft" | "open" | "closed" | "published";
}

const scoreSchema = z.object({
  score: z.number().int().min(1, "Min 1").max(45, "Max 45"),
  played_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
});

// ── Countdown hook ──────────────────────────────────────────────────────────
function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    mins: number;
    secs: number;
  } | null>(null);

  useEffect(() => {
    if (!targetDate) return;
    const calc = () => {
      // draw_month is stored as YYYY-MM-01; the draw runs end-of-month
      const end = new Date(targetDate);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0); // last day of the draw month
      end.setHours(23, 59, 59, 0);
      const diff = end.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
        return;
      }
      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      const mins = Math.floor((diff % 3_600_000) / 60_000);
      const secs = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft({ days, hours, mins, secs });
    };
    calc();
    const id = setInterval(calc, 1_000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

// ── Pad helper ───────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");

// ── Main page ────────────────────────────────────────────────────────────────
function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [subPlan, setSubPlan] = useState<string | null>(null);
  const [subEnd, setSubEnd] = useState<string | null>(null);
  const [subLoaded, setSubLoaded] = useState(false);
  const [drawsEntered, setDrawsEntered] = useState(0);
  const [nextDraw, setNextDraw] = useState<Draw | null>(null);

  // Score-entry form
  const [score, setScore] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState("");

  // Track existing dates client-side for instant duplicate detection
  const existingDates = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [{ data: prof }, { data: scs }, { data: sub }, { data: winnerRows }, { data: draws }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, selected_charity_id, contribution_percent, charities(name)")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("scores")
          .select("id,score,played_on")
          .eq("user_id", user.id)
          .order("played_on", { ascending: false })
          .limit(5),
        supabase
          .from("subscriptions")
          .select("status, plan, current_period_end")
          .eq("user_id", user.id)
          .maybeSingle(),
        // Count draws where this user appears as a winner (proxy for "entered")
        supabase
          .from("winners")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        // Next open draw (soonest draw_month)
        supabase
          .from("draws")
          .select("id,title,draw_month,status")
          .in("status", ["open", "closed"])
          .order("draw_month", { ascending: true })
          .limit(1),
      ]);

    setProfile(prof as Profile | null);
    setScores(scs ?? []);
    existingDates.current = new Set((scs ?? []).map((s) => s.played_on));
    setSubStatus(sub?.status ?? null);
    setSubPlan(sub?.plan ?? null);
    setSubEnd(sub?.current_period_end ?? null);
    setSubLoaded(true);
    setDrawsEntered((winnerRows as unknown as { count: number } | null)?.count ?? 0);
    setNextDraw((draws?.[0] as Draw) ?? null);
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = scoreSchema.safeParse({ score: Number(score), played_on: date });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    // Client-side duplicate check — instant feedback before DB round-trip
    if (existingDates.current.has(parsed.data.played_on)) {
      toast.error(
        "You already have a score for this date. Please edit the existing entry instead.",
        { duration: 5000 },
      );
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from("scores")
      .insert({ user_id: user.id, score: parsed.data.score, played_on: parsed.data.played_on });
    setSubmitting(false);

    if (error) {
      // 23505 = unique_violation (DB-level safety net)
      if (error.code === "23505") {
        toast.error(
          "You already have a score for this date. Please edit the existing entry instead.",
          { duration: 5000 },
        );
      } else {
        toast.error(error.message);
      }
      return;
    }
    setScore("");
    toast.success("Score logged.");
    loadAll();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("scores").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed.");
    loadAll();
  };

  const handleSaveEdit = async (id: string) => {
    const parsed = z.number().int().min(1).max(45).safeParse(Number(editScore));
    if (!parsed.success) {
      toast.error("Score must be 1–45");
      return;
    }
    const { error } = await supabase.from("scores").update({ score: parsed.data }).eq("id", id);
    if (error) return toast.error(error.message);
    setEditingId(null);
    toast.success("Updated.");
    loadAll();
  };

  // ── Loading / no-sub guards ─────────────────────────────────────────────
  if (authLoading || !user || !subLoaded) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-4xl px-6 py-20 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const isActive = subStatus === "active" || subStatus === "trialing";

  if (!isActive) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <h1 className="text-display text-4xl font-semibold">
            Subscribe to unlock your dashboard
          </h1>
          <p className="mt-3 text-muted-foreground">
            {subStatus
              ? `Your subscription is ${subStatus}. Reactivate to keep playing.`
              : "An active subscription is required to log scores and enter the monthly draw."}
          </p>
          <div className="mt-8">
            <Button onClick={() => navigate({ to: "/subscribe" })}>View plans</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 space-y-10">
        {/* Greeting */}
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-display text-4xl sm:text-5xl font-semibold">
            {profile?.display_name ?? "Golfer"}
          </h1>
        </div>

        {/* Subscription + charity */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border surface-elevated p-6 shadow-card">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              Subscription
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="font-medium capitalize">
                {subStatus} {subPlan ? `· ${subPlan}` : ""}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {subEnd ? `Renews ${new Date(subEnd).toLocaleDateString()}` : "Active subscription"}
            </p>
          </div>

          <div className="rounded-2xl border border-border surface-elevated p-6 shadow-card">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
              <Heart className="size-3 text-primary" /> Your charity
            </div>
            <div className="font-medium">{profile?.charities?.name ?? "None selected"}</div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Contribution from your subscription</span>
                <span className="text-foreground font-semibold">
                  {profile?.contribution_percent ?? 10}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={profile?.contribution_percent ?? 10}
                onChange={async (e) => {
                  const pct = Number(e.target.value);
                  setProfile((p) => (p ? { ...p, contribution_percent: pct } : p));
                  const { error } = await supabase
                    .from("profiles")
                    .update({ contribution_percent: pct })
                    .eq("id", user.id);
                  if (error) toast.error(error.message);
                }}
                className="w-full accent-primary"
              />
              <div className="mt-3">
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to="/donate">Make a one-off donation</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Participation Summary ── */}
        <ParticipationSummary
          drawsEntered={drawsEntered}
          nextDraw={nextDraw}
          totalScores={scores.length}
        />

        {/* Score entry */}
        <div className="rounded-2xl border border-border surface-elevated p-6 sm:p-8 shadow-card">
          <h2 className="text-display text-2xl font-semibold mb-1">Log a round</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Stableford 1–45. One score per date. Only your latest 5 are kept.
          </p>
          <form onSubmit={handleAdd} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3">
            <div className="space-y-2">
              <Label htmlFor="score-input">Score</Label>
              <Input
                id="score-input"
                type="number"
                min={1}
                max={45}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="36"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-input">Date played</Label>
              <Input
                id="date-input"
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              {/* Instant duplicate warning */}
              {existingDates.current.has(date) && (
                <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                  ⚠ You already have a score for this date — edit it below instead.
                </p>
              )}
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full sm:w-auto"
                disabled={submitting || existingDates.current.has(date)}
              >
                {submitting ? "Saving…" : "Add score"}
              </Button>
            </div>
          </form>
        </div>

        {/* Score list */}
        <div>
          <h2 className="text-display text-2xl font-semibold mb-4">Recent rounds</h2>
          {scores.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              No scores yet. Log your first round above.
            </div>
          ) : (
            <ul className="space-y-2">
              {scores.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-border bg-surface/50 hover:bg-surface px-5 py-4 flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex items-center gap-5 min-w-0">
                    {editingId === s.id ? (
                      <div className="flex flex-col gap-1">
                        <Input
                          type="number"
                          min={1}
                          max={45}
                          value={editScore}
                          onChange={(e) => setEditScore(e.target.value)}
                          className="w-20"
                          autoFocus
                          aria-label="Edit score"
                        />
                        {/* Date is read-only during edit per PRD */}
                        <span className="text-[11px] text-muted-foreground">
                          Date cannot be changed
                        </span>
                      </div>
                    ) : (
                      <div className="text-display text-3xl font-semibold text-gradient-primary tabular-nums">
                        {s.score}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      {new Date(s.played_on + "T12:00:00").toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {editingId === s.id ? (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSaveEdit(s.id)}
                          aria-label="Save score"
                        >
                          <Check className="size-4 text-primary" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          aria-label="Cancel edit"
                        >
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(s.id);
                            setEditScore(String(s.score));
                          }}
                          aria-label="Edit score"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(s.id)}
                          aria-label="Delete score"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Winnings */}
        <WinningsPanel userId={user.id} />
      </div>
    </div>
  );
}

// ── Participation Summary Component ─────────────────────────────────────────
function ParticipationSummary({
  drawsEntered,
  nextDraw,
  totalScores,
}: {
  drawsEntered: number;
  nextDraw: Draw | null;
  totalScores: number;
}) {
  const countdown = useCountdown(nextDraw?.draw_month ?? null);

  const statusColor: Record<string, string> = {
    open: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    closed: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    published: "bg-primary/15 text-primary border-primary/30",
    draft: "bg-muted/30 text-muted-foreground border-border",
  };

  return (
    <div className="rounded-2xl border border-border surface-elevated p-6 sm:p-8 shadow-card">
      <h2 className="text-display text-2xl font-semibold mb-5 flex items-center gap-2">
        <Trophy className="size-5 text-accent" /> Participation
      </h2>

      <div className="grid sm:grid-cols-3 gap-4">
        {/* Draws entered */}
        <div className="rounded-xl border border-border bg-surface/40 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Activity className="size-3" /> Draws won
          </div>
          <div className="text-display text-3xl font-semibold text-gradient-primary tabular-nums">
            {drawsEntered}
          </div>
          <div className="text-xs text-muted-foreground">total prize draws</div>
        </div>

        {/* Scores on file */}
        <div className="rounded-xl border border-border bg-surface/40 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <CalendarDays className="size-3" /> Scores on file
          </div>
          <div className="text-display text-3xl font-semibold tabular-nums">{totalScores}</div>
          <div className="text-xs text-muted-foreground">of 5 maximum</div>
        </div>

        {/* Next draw */}
        <div className="rounded-xl border border-border bg-surface/40 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Timer className="size-3" /> Next draw closes
          </div>
          {nextDraw ? (
            <>
              <div className="font-semibold text-sm truncate" title={nextDraw.title}>
                {nextDraw.title}
              </div>
              <span
                className={`self-start text-[10px] uppercase tracking-wider rounded-full border px-2 py-0.5 mb-1 ${statusColor[nextDraw.status] ?? statusColor.draft}`}
              >
                {nextDraw.status}
              </span>
              {countdown ? (
                <div className="flex items-center gap-1 tabular-nums font-mono text-sm">
                  <span className="text-primary font-bold">{pad(countdown.days)}</span>
                  <span className="text-muted-foreground text-xs">d</span>
                  <span className="text-primary font-bold">{pad(countdown.hours)}</span>
                  <span className="text-muted-foreground text-xs">h</span>
                  <span className="text-primary font-bold">{pad(countdown.mins)}</span>
                  <span className="text-muted-foreground text-xs">m</span>
                  <span className="text-primary font-bold">{pad(countdown.secs)}</span>
                  <span className="text-muted-foreground text-xs">s</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Calculating…</div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No upcoming draws</div>
          )}
        </div>
      </div>
    </div>
  );
}
