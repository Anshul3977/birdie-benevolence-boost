
-- Draws
CREATE TYPE public.draw_status AS ENUM ('draft','open','closed','published');
CREATE TYPE public.verification_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.payout_status AS ENUM ('pending','paid');

CREATE TABLE public.draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  draw_month date NOT NULL,
  target_score integer NOT NULL CHECK (target_score BETWEEN 1 AND 45),
  prize_pool_cents integer NOT NULL DEFAULT 0,
  status public.draw_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can view published draws"
ON public.draws FOR SELECT TO authenticated
USING (status IN ('open','closed','published') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage draws"
ON public.draws FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Winners
CREATE TABLE public.winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  prize_cents integer NOT NULL DEFAULT 0,
  proof_path text,
  verification public.verification_status NOT NULL DEFAULT 'pending',
  payout public.payout_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (draw_id, user_id)
);

ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own winner records"
ON public.winners FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users update own proof"
ON public.winners FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND verification = 'pending')
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage winners"
ON public.winners FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_draws_touch BEFORE UPDATE ON public.draws
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_winners_touch BEFORE UPDATE ON public.winners
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('winner-proofs','winner-proofs', false);

CREATE POLICY "Winners upload own proof"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'winner-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Winners view own proof"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'winner-proofs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "Winners update own proof"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'winner-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
