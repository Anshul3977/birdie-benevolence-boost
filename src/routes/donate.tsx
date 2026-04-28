import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Heart } from "lucide-react";

interface Charity {
  id: string;
  name: string;
}

export const Route = createFileRoute("/donate")({
  validateSearch: (s: Record<string, unknown>) => ({
    charityId: typeof s.charityId === "string" ? s.charityId : undefined,
  }),
  component: DonatePage,
});

function DonatePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [charities, setCharities] = useState<Charity[]>([]);
  const [charityId, setCharityId] = useState<string>(search.charityId ?? "");
  const [amount, setAmount] = useState("25");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    supabase
      .from("charities")
      .select("id,name")
      .order("name")
      .then(({ data }) => setCharities((data as Charity[]) ?? []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cents = Math.round(Number(amount) * 100);
    if (!charityId) return toast.error("Pick a charity");
    if (!Number.isFinite(cents) || cents <= 0) return toast.error("Enter an amount");
    if (cents > 1_000_000) return toast.error("Max £10,000 per donation");
    setSubmitting(true);
    const { error } = await supabase.from("donations").insert({
      user_id: user.id,
      charity_id: charityId,
      amount_cents: cents,
      note: note.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Thank you for your donation.");
    navigate({ to: "/dashboard" });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-md px-6 py-20 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-xl px-4 sm:px-6 py-12">
        <div className="text-center mb-8">
          <div className="mx-auto size-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4">
            <Heart className="size-6 text-primary-foreground" />
          </div>
          <h1 className="text-display text-4xl font-semibold">Make a donation</h1>
          <p className="text-muted-foreground mt-2">
            One-off, on top of your subscription. 100% goes to the charity.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-5 rounded-2xl border border-border surface-elevated p-6 sm:p-8 shadow-card"
        >
          <div className="space-y-2">
            <Label htmlFor="charity">Charity</Label>
            <select
              id="charity"
              value={charityId}
              onChange={(e) => setCharityId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Choose a charity…</option>
              {charities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (£)</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div className="flex gap-2 flex-wrap pt-1">
              {[10, 25, 50, 100].map((a) => (
                <button
                  type="button"
                  key={a}
                  onClick={() => setAmount(String(a))}
                  className="text-xs rounded-full border border-border px-3 py-1 hover:border-primary/50 transition-colors"
                >
                  £{a}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="In memory of…"
            />
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Processing…" : "Donate"}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            This records your pledge. Stripe one-off charges can be added later using the same
            account.
          </p>
        </form>
      </main>
    </div>
  );
}
