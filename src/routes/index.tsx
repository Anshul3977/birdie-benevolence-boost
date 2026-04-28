import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Heart, Trophy, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

interface Charity {
  id: string;
  name: string;
  description: string | null;
  is_featured: boolean;
}

function Index() {
  const [featured, setFeatured] = useState<Charity | null>(null);

  useEffect(() => {
    supabase
      .from("charities")
      .select("id,name,description,is_featured")
      .eq("is_featured", true)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setFeatured(data));
  }, []);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-28 sm:pt-32 sm:pb-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 backdrop-blur px-3 py-1 text-xs text-muted-foreground mb-6">
              <Sparkles className="size-3 text-primary" />
              Charity-first golf subscription
            </div>
            <h1 className="text-display text-5xl sm:text-7xl lg:text-8xl font-semibold leading-[0.95] tracking-tight">
              Play golf. <span className="text-gradient-primary">Change lives.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
              A subscription where every swing supports a cause you care about. Track your scores,
              win monthly draws, and turn your game into giving.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/signup">
                  Start playing for good <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="xl">
                <Link to="/login">I have an account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Three pillars */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: Heart,
              title: "10% to charity",
              body: "Minimum 10% of every subscription goes to your chosen cause. Give more if you want.",
            },
            {
              icon: Trophy,
              title: "Monthly draws",
              body: "Match your Stableford scores in our monthly draw. Win a share of the pool.",
            },
            {
              icon: Sparkles,
              title: "Track your game",
              body: "Log scores, watch your form, and play with purpose every single round.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-surface/40 backdrop-blur p-6 hover:border-primary/30 hover:bg-surface/70 transition-all"
            >
              <div className="size-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4">
                <Icon className="size-5 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-2">
            How it works
          </div>
          <h2 className="text-display text-3xl sm:text-5xl font-semibold max-w-2xl">
            Three steps. One round at a time.
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              n: "01",
              t: "Subscribe & pick a cause",
              b: "Choose a charity that matters to you. A slice of every payment goes straight to them.",
            },
            {
              n: "02",
              t: "Log your Stableford scores",
              b: "We keep your most recent five rounds. No spreadsheets, no fuss.",
            },
            {
              n: "03",
              t: "Win the monthly draw",
              b: "Match the target score and split the prize pool with other winners.",
            },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-surface/40 p-6">
              <div className="text-display text-5xl font-semibold text-gradient-primary mb-3 tabular-nums">
                {s.n}
              </div>
              <h3 className="text-xl font-semibold mb-1">{s.t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Emotion banner */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="rounded-3xl border border-border surface-elevated p-10 sm:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-primary opacity-10" />
          <div className="relative">
            <p className="text-display text-2xl sm:text-4xl font-medium leading-tight max-w-3xl mx-auto">
              "It stopped being just a round of golf. Every score I log, someone, somewhere is
              getting a little more help."
            </p>
            <div className="mt-6 text-sm text-muted-foreground">— A BirdieCause member</div>
          </div>
        </div>
      </section>

      {/* Featured charity */}
      {featured && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-32">
          <div className="rounded-3xl border border-border surface-elevated p-8 sm:p-12 shadow-elegant relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-accent opacity-5" />
            <div className="relative">
              <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-3">
                Spotlight charity
              </div>
              <h2 className="text-display text-3xl sm:text-5xl font-semibold mb-3">
                {featured.name}
              </h2>
              <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
                {featured.description}
              </p>
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-sm text-muted-foreground flex flex-wrap justify-between gap-2">
          <span>© BirdieCause</span>
          <span>Built with intention.</span>
        </div>
      </footer>
    </div>
  );
}
