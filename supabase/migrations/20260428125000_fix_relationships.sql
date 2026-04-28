-- Fix missing foreign key for subscriptions -> profiles/users
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Also ensure winners have FK to profiles/users for easier joining
ALTER TABLE public.winners
  ADD CONSTRAINT winners_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
