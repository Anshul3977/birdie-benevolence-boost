import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { simulateDraw, publishDraw } from "@/server/draws.functions";
import { toast } from "sonner";
import {
  ShieldAlert,
  Users,
  Heart,
  Activity,
  Trophy,
  Plus,
  Check,
  X,
  ImageIcon,
  Banknote,
  Pencil,
  Trash2,
  Sparkles,
  Send,
  HandCoins,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

interface Draw {
  id: string;
  title: string;
  description: string | null;
  draw_month: string;
  target_numbers: number[];
  prize_pool_cents: number;
  rollover_cents: number;
  status: "draft" | "open" | "closed" | "published";
}

interface WinnerAdmin {
  id: string;
  user_id: string;
  prize_cents: number;
  proof_path: string | null;
  verification: "pending" | "approved" | "rejected";
  payout: "pending" | "paid";
  tier: "match5" | "match4" | "match3" | null;
  matched_count: number | null;
  admin_notes: string | null;
  created_at: string;
  draws: { title: string } | null;
  profiles: { display_name: string | null } | null;
}

const fmtMoney = (c: number) => `£${(c / 100).toFixed(2)}`;

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{
    users: number;
    activeSubs: number;
    charities: number;
    scores: number;
    prizePool: number;
    donationsTotal: number;
    estCharity: number;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const loadStats = useCallback(async () => {
    if (!isAdmin) return;
    const [p, c, s, d, subs, donations] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("charities").select("id", { count: "exact", head: true }),
      supabase.from("scores").select("id", { count: "exact", head: true }),
      supabase.from("draws").select("prize_pool_cents,rollover_cents"),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .in("status", ["active", "trialing"]),
      supabase.from("donations").select("amount_cents"),
    ]);
    const pool = (d.data ?? []).reduce(
      (sum, r) => sum + (r.prize_pool_cents ?? 0) + (r.rollover_cents ?? 0),
      0,
    );
    const donationsTotal = (donations.data ?? []).reduce(
      (sum, r) => sum + (r.amount_cents ?? 0),
      0,
    );
    const estCharity = Math.round((subs.count ?? 0) * 999 * 0.1) + donationsTotal;
    setStats({
      users: p.count ?? 0,
      activeSubs: subs.count ?? 0,
      charities: c.count ?? 0,
      scores: s.count ?? 0,
      prizePool: pool,
      donationsTotal,
      estCharity,
    });
  }, [isAdmin]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-4xl px-6 py-20 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <div className="size-14 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <ShieldAlert className="size-7 text-destructive" />
          </div>
          <h1 className="text-display text-3xl font-semibold mb-2">Admins only</h1>
          <p className="text-muted-foreground text-sm">Your account doesn't have admin access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 space-y-12">
        <div>
          <p className="text-sm text-muted-foreground">Operations</p>
          <h1 className="text-display text-4xl sm:text-5xl font-semibold">Admin</h1>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Members", value: stats?.users ?? "—", icon: Users },
            { label: "Active subs", value: stats?.activeSubs ?? "—", icon: Activity },
            { label: "Charities", value: stats?.charities ?? "—", icon: Heart },
            {
              label: "Prize pool (all)",
              value: stats ? fmtMoney(stats.prizePool) : "—",
              icon: Trophy,
            },
            {
              label: "Donations",
              value: stats ? fmtMoney(stats.donationsTotal) : "—",
              icon: HandCoins,
            },
            {
              label: "Est. charity total",
              value: stats ? fmtMoney(stats.estCharity) : "—",
              icon: Heart,
            },
            { label: "Scores logged", value: stats?.scores ?? "—", icon: Activity },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-border surface-elevated p-6 shadow-card"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  {label}
                </span>
                <Icon className="size-4 text-primary" />
              </div>
              <div className="text-display text-3xl font-semibold tabular-nums">{value}</div>
            </div>
          ))}
        </div>

        <DrawsSection onChange={loadStats} />
        <WinnersSection />
        <CharitiesSection onChange={loadStats} />
        <UsersSection />
        <ReportsSection />
      </div>
    </div>
  );
}

// ============================================================
// Users Management
// ============================================================

interface UserAdminRow {
  id: string;
  display_name: string | null;
  subscriptions: {
    status: string;
    plan: string | null;
    current_period_end: string | null;
  }[];
}

function UsersSection() {
  const [users, setUsers] = useState<UserAdminRow[]>([]);
  const [editing, setEditing] = useState<UserAdminRow | null>(null);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    // Note: subscriptions returns an array
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, subscriptions(status, plan, current_period_end)")
      .order("display_name");
    
    if (error) {
      console.error("Users load error:", error);
      return;
    }
    setUsers((data as unknown as UserAdminRow[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("User updated");
    setEditing(null);
    load();
  };

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-display text-2xl font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">Manage members and subscriptions.</p>
        </div>
      </div>

      {editing && (
        <form
          onSubmit={save}
          className="rounded-2xl border border-border surface-elevated p-6 shadow-card mb-4 flex flex-col gap-4"
        >
          <div className="space-y-2">
            <Label htmlFor="u-name">Display Name</Label>
            <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero">
              Save changes
            </Button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="rounded-xl border border-border bg-surface/50 px-5 py-4 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="font-semibold">{u.display_name ?? "Unknown"}</div>
              <div className="text-xs text-muted-foreground">
                {u.subscriptions?.[0]?.status ? (
                  <span className="capitalize text-primary font-medium">
                    {u.subscriptions[0].status} · {u.subscriptions[0].plan ?? "free"}
                  </span>
                ) : (
                  "No subscription"
                )}
                {u.subscriptions?.[0]?.current_period_end &&
                  ` · Ends ${new Date(u.subscriptions[0].current_period_end).toLocaleDateString()}`}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setEditing(u);
                setName(u.display_name ?? "");
              }}
            >
              <Pencil className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ============================================================
// Reports
// ============================================================

function ReportsSection() {
  const [charityTotals, setCharityTotals] = useState<{ name: string; total: number }[]>([]);
  const [drawStats, setDrawStats] = useState<
    { title: string; pool: number; winners: number; rollover: number }[]
  >([]);

  const load = useCallback(async () => {
    // 1. Charity totals
    const { data: chars } = await supabase.from("charities").select("id, name");
    const { data: don } = await supabase.from("donations").select("charity_id, amount_cents");
    // Also estimate from active subs assigned to charities
    const { data: profs } = await supabase
      .from("profiles")
      .select("selected_charity_id, subscriptions!inner(status)")
      .in("subscriptions.status", ["active", "trialing"]);

    const totals = (chars ?? []).map((c) => {
      const direct = (don ?? [])
        .filter((d) => d.charity_id === c.id)
        .reduce((sum, r) => sum + r.amount_cents, 0);
      const subCount = (profs ?? []).filter((p) => p.selected_charity_id === c.id).length;
      // Est £1 per active sub (10% of £9.99)
      const estSub = subCount * 100;
      return { name: c.name, total: direct + estSub };
    });
    setCharityTotals(totals.sort((a, b) => b.total - a.total));

    // 2. Draw stats
    const { data: draws } = await supabase
      .from("draws")
      .select("id, title, prize_pool_cents, rollover_cents, status, winners(id)")
      .eq("status", "published")
      .order("draw_month", { ascending: false });

    const ds = (draws ?? []).map((d) => ({
      title: d.title,
      pool: d.prize_pool_cents,
      winners: (d.winners as unknown as any[])?.length ?? 0,
      rollover: d.rollover_cents,
    }));
    setDrawStats(ds);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-display text-2xl font-semibold mb-4">Financial Reports</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border surface-elevated p-6 shadow-card">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Charity Contributions
            </h3>
            <ul className="space-y-3">
              {charityTotals.map((ct) => (
                <li key={ct.name} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{ct.name}</span>
                  <span className="font-semibold">{fmtMoney(ct.total)}</span>
                </li>
              ))}
              {charityTotals.length === 0 && (
                <li className="text-sm text-muted-foreground">No data yet</li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-border surface-elevated p-6 shadow-card">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Draw History
            </h3>
            <ul className="space-y-3">
              {drawStats.map((ds) => (
                <li key={ds.title} className="text-sm border-b border-border pb-2 last:border-0">
                  <div className="flex justify-between font-semibold">
                    <span>{ds.title}</span>
                    <span>{fmtMoney(ds.pool)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ds.winners} winner(s) · Rollover from prev: {fmtMoney(ds.rollover)}
                  </div>
                </li>
              ))}
              {drawStats.length === 0 && (
                <li className="text-sm text-muted-foreground">No published draws</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Draws
// ============================================================

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

function DrawsSection({ onChange }: { onChange: () => void }) {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targets, setTargets] = useState<string[]>(["", "", "", "", ""]);
  const [prize, setPrize] = useState("500");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [sim, setSim] = useState<SimResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const simFn = useServerFn(simulateDraw);
  const pubFn = useServerFn(publishDraw);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("draws")
      .select(
        "id,title,description,draw_month,target_numbers,prize_pool_cents,rollover_cents,status",
      )
      .order("draw_month", { ascending: false });
    setDraws((data as Draw[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const nums = targets.map((t) => Number(t));
    if (nums.some((n) => !Number.isFinite(n) || n < 1 || n > 45)) {
      return toast.error("All 5 targets must be 1–45");
    }
    if (new Set(nums).size !== 5) return toast.error("Targets must be unique");
    const p = Math.round(Number(prize) * 100);
    if (!title || !month || p < 0) return toast.error("Check your inputs");

    const { error } = await supabase.from("draws").insert({
      title,
      description: description || null,
      draw_month: `${month}-01`,
      target_numbers: nums,
      target_score: nums[0], // legacy column
      prize_pool_cents: p,
      status: "open",
    });
    if (error) return toast.error(error.message);
    toast.success("Draw created.");
    setShowForm(false);
    setTitle("");
    setDescription("");
    setTargets(["", "", "", "", ""]);
    load();
    onChange();
  };

  const setStatus = async (id: string, status: Draw["status"]) => {
    const { error } = await supabase.from("draws").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const runSim = async (id: string) => {
    setBusy(id);
    setSim(null);
    try {
      const r = (await simFn({ data: { drawId: id } })) as SimResult;
      setSim(r);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setBusy(null);
    }
  };

  const runPublish = async (id: string) => {
    if (!confirm("Publish this draw? Winners will be created.")) return;
    setBusy(id);
    try {
      const r = (await pubFn({ data: { drawId: id } })) as { winnersCreated: number };
      toast.success(`Published — ${r.winnersCreated} winner(s)`);
      setSim(null);
      load();
      onChange();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-display text-2xl font-semibold">Draws</h2>
          <p className="text-sm text-muted-foreground">
            5 target numbers · 5/4/3 match tiers · 40/35/25 split · jackpot rolls over.
          </p>
        </div>
        <Button size="sm" variant="hero" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-4" /> New draw
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={create}
          className="rounded-2xl border border-border surface-elevated p-6 shadow-card mb-4 grid sm:grid-cols-2 gap-4"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="d-title">Title</Label>
            <Input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="d-desc">Description</Label>
            <Textarea
              id="d-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d-month">Month</Label>
            <Input
              id="d-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d-prize">Base prize (£)</Label>
            <Input
              id="d-prize"
              type="number"
              min={0}
              step="0.01"
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>5 target Stableford scores (1–45, unique)</Label>
            <div className="grid grid-cols-5 gap-2">
              {targets.map((t, i) => (
                <Input
                  key={i}
                  type="number"
                  min={1}
                  max={45}
                  value={t}
                  onChange={(e) => {
                    const next = [...targets];
                    next[i] = e.target.value;
                    setTargets(next);
                  }}
                  required
                />
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero">
              Create draw
            </Button>
          </div>
        </form>
      )}

      {draws.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
          No draws yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {draws.map((d) => (
            <li key={d.id} className="rounded-xl border border-border bg-surface/50 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold flex items-center gap-2 flex-wrap">
                    {d.title}
                    <span className="text-[10px] uppercase tracking-wider rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                      {d.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(d.draw_month).toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    · Targets {(d.target_numbers ?? []).join(", ") || "—"} · Base{" "}
                    {fmtMoney(d.prize_pool_cents)}
                    {d.rollover_cents > 0 && ` + rollover ${fmtMoney(d.rollover_cents)}`}
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {d.status === "open" && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(d.id, "closed")}>
                      Close
                    </Button>
                  )}
                  {(d.status === "closed" || d.status === "open") && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runSim(d.id)}
                        disabled={busy === d.id}
                      >
                        <Sparkles className="size-3.5" /> Simulate
                      </Button>
                      <Button
                        size="sm"
                        variant="hero"
                        onClick={() => runPublish(d.id)}
                        disabled={busy === d.id}
                      >
                        <Send className="size-3.5" /> Publish
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {sim && sim.drawId === d.id && (
                <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
                  <div className="text-xs text-muted-foreground mb-2">
                    Total pool {fmtMoney(sim.pool)} · {sim.totalEntries} entries
                  </div>
                  {sim.perTier.map((t) => (
                    <div key={t.tier} className="py-1">
                      <span className="font-semibold capitalize">
                        {t.tier.replace("match", "")}-match
                      </span>{" "}
                      · pool {fmtMoney(t.poolCents)} ·{" "}
                      {t.winners.length === 0 ? (
                        <span className="text-warning">no winners → rolls over</span>
                      ) : (
                        <span>
                          {t.winners.length} winner(s) · {fmtMoney(t.winners[0]?.share ?? 0)} each
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ============================================================
// Winners (unchanged behavior, adds tier badge)
// ============================================================

function WinnersSection() {
  const [winners, setWinners] = useState<WinnerAdmin[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    let q = supabase
      .from("winners")
      .select(
        "id,user_id,prize_cents,proof_path,verification,payout,tier,matched_count,admin_notes,created_at,draws(title),profiles!inner(display_name)",
      )
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("verification", filter);
    const { data, error } = await q;
    if (error) return toast.error(error.message);
    setWinners((data as unknown as WinnerAdmin[]) ?? []);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const viewProof = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("winner-proofs")
      .createSignedUrl(path, 60 * 5);
    if (error || !data) return toast.error("Could not load proof");
    setProofUrl(data.signedUrl);
  };

  const decide = async (id: string, verification: "approved" | "rejected") => {
    let admin_notes: string | null = null;
    if (verification === "rejected") {
      admin_notes = window.prompt("Reason for rejection?") || "Rejected";
    }
    const { error } = await supabase
      .from("winners")
      .update({ verification, admin_notes })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(verification === "approved" ? "Approved" : "Rejected");
    load();
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("winners").update({ payout: "paid" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked paid");
    load();
  };

  return (
    <section>
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-display text-2xl font-semibold">Winners</h2>
          <p className="text-sm text-muted-foreground">Verify proof, manage payouts.</p>
        </div>
        <div className="flex gap-1 rounded-full border border-border p-1">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full capitalize transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {winners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
          Nothing here.
        </div>
      ) : (
        <ul className="space-y-2">
          {winners.map((w) => (
            <li
              key={w.id}
              className="rounded-xl border border-border bg-surface/50 px-5 py-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-semibold">
                  {w.profiles?.display_name ?? "Member"}
                  <span className="text-muted-foreground font-normal"> · {w.draws?.title}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {fmtMoney(w.prize_cents)}
                  {w.tier && ` · ${w.tier.replace("match", "")}-match`}
                  {" · "}
                  <span className="capitalize">{w.verification}</span> · payout{" "}
                  <span className="capitalize">{w.payout}</span>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap">
                {w.proof_path ? (
                  <Button size="sm" variant="ghost" onClick={() => viewProof(w.proof_path!)}>
                    <ImageIcon className="size-3.5" /> View proof
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground self-center">No proof yet</span>
                )}
                {w.verification === "pending" && w.proof_path && (
                  <>
                    <Button size="sm" variant="accent" onClick={() => decide(w.id, "approved")}>
                      <Check className="size-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => decide(w.id, "rejected")}>
                      <X className="size-3.5 text-destructive" /> Reject
                    </Button>
                  </>
                )}
                {w.verification === "approved" && w.payout === "pending" && (
                  <Button size="sm" variant="hero" onClick={() => markPaid(w.id)}>
                    <Banknote className="size-3.5" /> Mark paid
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {proofUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setProofUrl(null)}
        >
          <img
            src={proofUrl}
            alt="Proof"
            className="max-h-[90vh] max-w-full rounded-2xl border border-border shadow-elegant"
          />
        </div>
      )}
    </section>
  );
}

// ============================================================
// Charities CRUD
// ============================================================

interface CharityRow {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_featured: boolean;
}

function CharitiesSection({ onChange }: { onChange: () => void }) {
  const [charities, setCharities] = useState<CharityRow[]>([]);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [featured, setFeatured] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("charities")
      .select("id,name,description,image_url,is_featured")
      .order("name");
    setCharities((data as CharityRow[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => {
    setEditingId("new");
    setName("");
    setDescription("");
    setImageUrl("");
    setFeatured(false);
  };

  const startEdit = (c: CharityRow) => {
    setEditingId(c.id);
    setName(c.name);
    setDescription(c.description ?? "");
    setImageUrl(c.image_url ?? "");
    setFeatured(c.is_featured);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name required");
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      is_featured: featured,
    };
    if (editingId === "new") {
      const { error } = await supabase.from("charities").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Charity added");
    } else if (editingId) {
      const { error } = await supabase.from("charities").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Saved");
    }
    setEditingId(null);
    load();
    onChange();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this charity?")) return;
    const { error } = await supabase.from("charities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
    onChange();
  };

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-display text-2xl font-semibold">Charities</h2>
          <p className="text-sm text-muted-foreground">Add, edit, feature, remove.</p>
        </div>
        <Button size="sm" variant="hero" onClick={startNew}>
          <Plus className="size-4" /> Add charity
        </Button>
      </div>

      {editingId && (
        <form
          onSubmit={save}
          className="rounded-2xl border border-border surface-elevated p-6 shadow-card mb-4 grid sm:grid-cols-2 gap-4"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="c-desc">Description</Label>
            <Textarea
              id="c-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="c-img">Image URL</Label>
            <Input
              id="c-img"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2 text-sm">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            Featured on homepage
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero">
              Save
            </Button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {charities.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-border bg-surface/50 px-5 py-4 flex items-center justify-between gap-3"
          >
            <div className="min-w-0 flex items-center gap-3">
              {c.image_url ? (
                <img src={c.image_url} alt="" className="size-10 rounded-lg object-cover" />
              ) : (
                <div className="size-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Heart className="size-4 text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold flex items-center gap-2">
                  {c.name}
                  {c.is_featured && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                      Featured
                    </span>
                  )}
                </div>
                {c.description && (
                  <div className="text-xs text-muted-foreground line-clamp-1">{c.description}</div>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => startEdit(c)} aria-label="Edit">
                <Pencil className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(c.id)} aria-label="Delete">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
