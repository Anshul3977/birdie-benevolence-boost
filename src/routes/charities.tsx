import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Heart, Search, Star, Calendar, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/charities")({
  component: CharitiesPage,
  head: () => ({
    meta: [
      { title: "Charities — BirdieCause" },
      {
        name: "description",
        content: "Browse the charities BirdieCause members support and donate directly.",
      },
    ],
  }),
});

interface Charity {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_featured: boolean;
}
interface Event {
  id: string;
  charity_id: string;
  title: string;
  event_date: string;
  location: string | null;
}

function CharitiesPage() {
  const { user } = useAuth();
  const [charities, setCharities] = useState<Charity[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [q, setQ] = useState("");
  const [onlyFeatured, setOnlyFeatured] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase
        .from("charities")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("name"),
      supabase
        .from("charity_events")
        .select("id,charity_id,title,event_date,location")
        .gte("event_date", new Date().toISOString().slice(0, 10))
        .order("event_date"),
    ]).then(([c, e]) => {
      setCharities((c.data as Charity[]) ?? []);
      setEvents((e.data as Event[]) ?? []);
    });
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return charities.filter((c) => {
      if (onlyFeatured && !c.is_featured) return false;
      if (!term) return true;
      return (
        c.name.toLowerCase().includes(term) || (c.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [charities, q, onlyFeatured]);

  const eventsBy = useMemo(() => {
    const m = new Map<string, Event[]>();
    for (const e of events) {
      const arr = m.get(e.charity_id) ?? [];
      arr.push(e);
      m.set(e.charity_id, arr);
    }
    return m;
  }, [events]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-display text-4xl sm:text-6xl font-semibold">
            Causes worth <span className="text-gradient-primary">playing for</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Pick a charity, give every round a purpose, and donate directly any time.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search charities…"
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant={onlyFeatured ? "hero" : "outline"}
            onClick={() => setOnlyFeatured((v) => !v)}
          >
            <Star className="size-4" />
            Featured only
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No charities match your search.
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((c) => {
              const evs = eventsBy.get(c.id) ?? [];
              return (
                <li
                  key={c.id}
                  className="rounded-2xl border border-border surface-elevated overflow-hidden shadow-card hover:shadow-elegant transition-shadow"
                >
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-40 w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Heart className="size-10 text-primary" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{c.name}</h3>
                      {c.is_featured && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                          Featured
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{c.description}</p>
                    )}

                    {evs.length > 0 && (
                      <div className="mt-4 space-y-1.5 border-t border-border pt-3">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Upcoming
                        </div>
                        {evs.slice(0, 2).map((e) => (
                          <div key={e.id} className="text-xs">
                            <div className="font-medium flex items-center gap-1.5">
                              <Calendar className="size-3 text-primary" />
                              {e.title}
                            </div>
                            <div className="text-muted-foreground ml-4 flex flex-wrap gap-2">
                              <span>{new Date(e.event_date).toLocaleDateString()}</span>
                              {e.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="size-3" /> {e.location}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <Button asChild variant="hero" size="sm" className="flex-1">
                        <Link to="/donate" search={{ charityId: c.id }}>
                          Donate
                        </Link>
                      </Button>
                      {!user && (
                        <Button asChild variant="outline" size="sm">
                          <Link to="/signup">Play for them</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
