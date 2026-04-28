-- =========================
-- Scores: enforce one score per user per date
-- =========================
ALTER TABLE public.scores
  ADD CONSTRAINT scores_user_date_unique UNIQUE (user_id, played_on);

-- =========================
-- Storage: winner-proofs bucket RLS policies
-- =========================
-- RLS is usually enabled by default on storage.objects in Supabase.
-- If not, it must be enabled via the Dashboard or a superuser.

-- Allow authenticated winners to upload their own proof
-- Folder structure: {user_id}/{winner_id}.{ext}
DROP POLICY IF EXISTS "Winners can upload proof" ON storage.objects;
CREATE POLICY "Winners can upload proof"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'winner-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to read their own proofs
DROP POLICY IF EXISTS "Winners can read own proof" ON storage.objects;
CREATE POLICY "Winners can read own proof"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'winner-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow admins to read all proofs
DROP POLICY IF EXISTS "Admins can read all proofs" ON storage.objects;
CREATE POLICY "Admins can read all proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'winner-proofs'
    AND public.has_role(auth.uid(), 'admin')
  );

-- Allow admins to delete proofs
DROP POLICY IF EXISTS "Admins can delete proofs" ON storage.objects;
CREATE POLICY "Admins can delete proofs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'winner-proofs'
    AND public.has_role(auth.uid(), 'admin')
  );

-- Allow upsert (update) of existing proof by owner
DROP POLICY IF EXISTS "Winners can replace own proof" ON storage.objects;
CREATE POLICY "Winners can replace own proof"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'winner-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
