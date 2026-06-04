-- Phone OTP + Supabase Auth integration
-- Links existing custom identities to auth.users without breaking cookie sessions

ALTER TABLE public.identities
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS phone text UNIQUE;

CREATE INDEX IF NOT EXISTS identities_auth_user_id_idx ON public.identities(auth_user_id);
CREATE INDEX IF NOT EXISTS identities_phone_idx ON public.identities(phone);

-- Helper: case-insensitive username uniqueness (defensive)
CREATE UNIQUE INDEX IF NOT EXISTS identities_username_lower_idx ON public.identities(lower(username));