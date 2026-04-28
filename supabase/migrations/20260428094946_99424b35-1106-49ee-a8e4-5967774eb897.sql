
-- =========================
-- Draws upgrade
-- =========================
DO $$ BEGIN
  CREATE TYPE public.draw_kind AS ENUM ('random','weighted_frequent','weighted_infrequent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.draws
  ADD COLUMN IF NOT EXISTS target_numbers integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS kind public.draw_kind NOT NULL DEFAULT 'random',
  ADD COLUMN IF NOT EXISTS rollover_cents integer NOT NULL DEFAULT 0;

-- target_score stays for back-compat (nullable now)
ALTER TABLE public.draws ALTER COLUMN target_score DROP NOT NULL;

-- =========================
-- Winners upgrade
-- =========================
DO $$ BEGIN
  CREATE TYPE public.winner_tier AS ENUM ('match5','match4','match3');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.winners
  ADD COLUMN IF NOT EXISTS tier public.winner_tier,
  ADD COLUMN IF NOT EXISTS matched_count integer;

-- Drop legacy uniqueness if it exists; allow multiple rows per (draw,user,tier)
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.winners'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.winners DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.winners
  ADD CONSTRAINT winners_draw_user_tier_unique UNIQUE (draw_id, user_id, tier);

-- =========================
-- Charity admin write policies
-- =========================
DROP POLICY IF EXISTS "Admins manage charities" ON public.charities;
CREATE POLICY "Admins manage charities"
  ON public.charities
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Charity events
-- =========================
CREATE TABLE IF NOT EXISTS public.charity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_id uuid NOT NULL REFERENCES public.charities(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  location text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.charity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view events" ON public.charity_events;
CREATE POLICY "Anyone can view events"
  ON public.charity_events FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins manage events" ON public.charity_events;
CREATE POLICY "Admins manage events"
  ON public.charity_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- Profiles: contribution percent
-- =========================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contribution_percent integer NOT NULL DEFAULT 10
    CHECK (contribution_percent >= 10 AND contribution_percent <= 100);

-- =========================
-- Donations
-- =========================
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  charity_id uuid NOT NULL REFERENCES public.charities(id) ON DELETE RESTRICT,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own donations" ON public.donations;
CREATE POLICY "Users view own donations"
  ON public.donations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users create own donations" ON public.donations;
CREATE POLICY "Users create own donations"
  ON public.donations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS donations_user_idx ON public.donations(user_id);
CREATE INDEX IF NOT EXISTS donations_charity_idx ON public.donations(charity_id);
CREATE INDEX IF NOT EXISTS charity_events_charity_idx ON public.charity_events(charity_id);
CREATE INDEX IF NOT EXISTS charity_events_date_idx ON public.charity_events(event_date);
