
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'subscriber');

-- ============ CHARITIES ============
CREATE TABLE public.charities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view charities" ON public.charities FOR SELECT USING (true);

-- Seed a few example charities
INSERT INTO public.charities (name, description, is_featured) VALUES
  ('Greenfield Junior Golf', 'Bringing golf to underserved youth across the country.', true),
  ('Veterans on the Green', 'Supporting veterans through golf-based therapy and community.', false),
  ('Caddies for a Cure', 'Funding rare disease research through golfing communities.', false),
  ('First Tee Foundation', 'Empowering young people through golf and life skills.', false),
  ('Fairway Forward', 'Mental health support for amateur and professional golfers.', false);

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  selected_charity_id UUID REFERENCES public.charities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============ SCORES ============
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
  played_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, played_on)
);
CREATE INDEX scores_user_played_idx ON public.scores (user_id, played_on DESC);
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own scores" ON public.scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scores" ON public.scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scores" ON public.scores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scores" ON public.scores FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all scores" ON public.scores FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ============ ROLLING-5 TRIGGER ============
-- After insert, prune oldest scores so each user keeps at most 5.
CREATE OR REPLACE FUNCTION public.enforce_rolling_five_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.scores
  WHERE user_id = NEW.user_id
    AND id IN (
      SELECT id FROM public.scores
      WHERE user_id = NEW.user_id
      ORDER BY played_on DESC, created_at DESC
      OFFSET 5
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER scores_rolling_five
AFTER INSERT ON public.scores
FOR EACH ROW EXECUTE FUNCTION public.enforce_rolling_five_scores();

-- ============ AUTO-CREATE PROFILE + DEFAULT ROLE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, selected_charity_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    NULLIF(NEW.raw_user_meta_data->>'selected_charity_id', '')::uuid
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'subscriber');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
