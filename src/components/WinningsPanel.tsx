import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trophy, Upload, Check, Clock, X } from "lucide-react";
import { toast } from "sonner";

interface WinnerRow {
  id: string;
  prize_cents: number;
  proof_path: string | null;
  verification: "pending" | "approved" | "rejected";
  payout: "pending" | "paid";
  tier: "match5" | "match4" | "match3" | null;
  matched_count: number | null;
  admin_notes: string | null;
  draws: { title: string; draw_month: string } | null;
}

const fmtMoney = (c: number) => `£${(c / 100).toFixed(2)}`;

export function WinningsPanel({ userId }: { userId: string }) {
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("winners")
      .select(
        "id,prize_cents,proof_path,verification,payout,tier,matched_count,admin_notes,draws(title,draw_month)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setWinners((data as unknown as WinnerRow[]) ?? []);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (winnerId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    if (!file.type.startsWith("image/")) return toast.error("Image files only");
    setUploading(winnerId);
    const ext = file.name.split(".").pop();
    const path = `${userId}/${winnerId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("winner-proofs")
      .upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(null);
      return toast.error(upErr.message);
    }
    const { error } = await supabase
      .from("winners")
      .update({ proof_path: path, verification: "pending" })
      .eq("id", winnerId);
    setUploading(null);
    if (error) return toast.error(error.message);
    toast.success("Proof uploaded — under review.");
    load();
  };

  const totalWon = winners
    .filter((w) => w.verification === "approved")
    .reduce((sum, w) => sum + w.prize_cents, 0);

  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-display text-2xl font-semibold flex items-center gap-2">
          <Trophy className="size-5 text-accent" /> Winnings
        </h2>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Total won</div>
          <div className="text-display text-2xl font-semibold text-gradient-primary tabular-nums">
            {fmtMoney(totalWon)}
          </div>
        </div>
      </div>

      {winners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
          No winnings yet. Match a draw's target score to be entered.
        </div>
      ) : (
        <ul className="space-y-3">
          {winners.map((w) => (
            <li
              key={w.id}
              className="rounded-2xl border border-border surface-elevated p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold">{w.draws?.title ?? "Draw"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {w.tier ? `${w.tier.replace("match", "")}-match` : "Win"} · Prize{" "}
                    {fmtMoney(w.prize_cents)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill kind="verify" v={w.verification} />
                  <StatusPill kind="pay" v={w.payout} />
                </div>
              </div>

              {w.verification === "rejected" && w.admin_notes && (
                <div className="mt-3 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                  {w.admin_notes}
                </div>
              )}

              {w.verification !== "approved" && (
                <div className="mt-4">
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading === w.id}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(w.id, f);
                        e.target.value = "";
                      }}
                    />
                    <Button asChild size="sm" variant={w.proof_path ? "ghost" : "accent"}>
                      <span>
                        <Upload className="size-3.5" />
                        {uploading === w.id
                          ? "Uploading…"
                          : w.proof_path
                            ? "Replace proof"
                            : "Upload proof screenshot"}
                      </span>
                    </Button>
                  </label>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ kind, v }: { kind: "verify" | "pay"; v: string }) {
  const map: Record<string, { label: string; cls: string; Icon: typeof Check }> = {
    pending: { label: "Pending", cls: "bg-warning/10 text-warning border-warning/30", Icon: Clock },
    approved: {
      label: "Approved",
      cls: "bg-primary/10 text-primary border-primary/30",
      Icon: Check,
    },
    rejected: {
      label: "Rejected",
      cls: "bg-destructive/10 text-destructive border-destructive/30",
      Icon: X,
    },
    paid: { label: "Paid", cls: "bg-primary/10 text-primary border-primary/30", Icon: Check },
  };
  const m = map[v] ?? map.pending;
  const Icon = m.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${m.cls}`}
    >
      <Icon className="size-3" /> {kind === "pay" ? `Payout · ${m.label}` : m.label}
    </span>
  );
}
