import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

interface Charity {
  id: string;
  name: string;
  description: string | null;
}

const schema = z.object({
  displayName: z.string().trim().min(1, "Add your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(100),
  charityId: z.string().uuid("Pick a charity"),
});

function SignupPage() {
  const navigate = useNavigate();
  const [charities, setCharities] = useState<Charity[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [charityId, setCharityId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("charities")
      .select("id,name,description")
      .order("name")
      .then(({ data }) => setCharities(data ?? []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ displayName, email, password, charityId });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          display_name: parsed.data.displayName,
          selected_charity_id: parsed.data.charityId,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome to BirdieCause.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-display text-4xl sm:text-5xl font-semibold mb-3">Join the cause</h1>
          <p className="text-muted-foreground">
            Create your account and pick the charity you'll play for.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-border surface-elevated p-6 sm:p-8 shadow-card"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Morgan"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Heart className="size-4 text-primary" />
              Choose your charity
            </Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {charities.map((c) => {
                const selected = charityId === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCharityId(c.id)}
                    className={`text-left rounded-xl border p-4 transition-all ${
                      selected
                        ? "border-primary bg-primary/10 shadow-glow"
                        : "border-border bg-surface/40 hover:border-primary/40"
                    }`}
                  >
                    <div className="font-medium text-sm">{c.name}</div>
                    {c.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {c.description}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? "Creating your account…" : "Create account"}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Already a member?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
