import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { createCheckoutSession } from "@/server/stripe.functions";
import { toast } from "sonner";
import { Check } from "lucide-react";

export const Route = createFileRoute("/subscribe")({
  component: SubscribePage,
});

function SubscribePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const checkout = useServerFn(createCheckoutSession);
  const [busy, setBusy] = useState<"monthly" | "yearly" | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const start = async (plan: "monthly" | "yearly") => {
    try {
      setBusy(plan);
      const { url } = await checkout({ data: { plan } });
      if (url) window.location.href = url;
      else throw new Error("No checkout URL");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setBusy(null);
    }
  };

  const tiers = [
    {
      id: "monthly" as const,
      name: "Monthly",
      price: "£9.99",
      cadence: "/ month",
      tagline: "Flexible — cancel anytime.",
      perks: ["Enter every monthly draw", "Track unlimited rounds", "Support a featured charity"],
    },
    {
      id: "yearly" as const,
      name: "Yearly",
      price: "£99",
      cadence: "/ year",
      tagline: "Save ~17%. Best value.",
      perks: ["Everything in Monthly", "12 months of draw entries", "Priority winner verification"],
      featured: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-display text-5xl font-semibold md:text-6xl">
            Choose your <span className="text-gradient-primary">plan</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Subscribe to log scores, qualify for monthly draws, and turn every round into giving.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          {tiers.map((t) => (
            <div
              key={t.id}
              className={`relative rounded-2xl border p-8 transition-transform hover:-translate-y-1 ${
                t.featured
                  ? "border-primary/60 bg-gradient-to-br from-primary/10 to-transparent shadow-glow"
                  : "border-border bg-card"
              }`}
            >
              {t.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="text-2xl font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-display text-5xl font-semibold">{t.price}</span>
                <span className="text-muted-foreground">{t.cadence}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 text-primary" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                variant={t.featured ? "default" : "outline"}
                disabled={busy !== null}
                onClick={() => start(t.id)}
              >
                {busy === t.id ? "Redirecting…" : `Subscribe ${t.name}`}
              </Button>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-xs text-muted-foreground">
          Payments are processed securely by Stripe. Test mode — use card 4242 4242 4242 4242 with
          any future date and CVC.
        </p>
      </main>
    </div>
  );
}
