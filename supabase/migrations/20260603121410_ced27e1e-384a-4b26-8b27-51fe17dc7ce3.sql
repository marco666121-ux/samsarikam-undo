-- Phase 5: slug aliases for rename safety
CREATE TABLE public.slug_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  old_slug text NOT NULL,
  new_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, old_slug)
);
GRANT SELECT ON public.slug_aliases TO anon, authenticated;
GRANT ALL ON public.slug_aliases TO service_role;
ALTER TABLE public.slug_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read slug_aliases" ON public.slug_aliases FOR SELECT USING (true);
CREATE INDEX idx_slug_aliases_lookup ON public.slug_aliases (entity_type, old_slug);

-- Phase 6: rate limits per ip
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (ip_hash, action, created_at DESC);

-- Phase 6: reports table
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid,
  reporter_ip_hash text,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read reports" ON public.reports FOR SELECT USING (true);
CREATE INDEX idx_reports_entity ON public.reports (entity_type, entity_id);

-- Phase 6: auto-hide flag + report count on posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS auto_hidden boolean NOT NULL DEFAULT false;

-- Phase 6: ip suspicion score on ip_bindings
ALTER TABLE public.ip_bindings ADD COLUMN IF NOT EXISTS suspicion_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.ip_bindings ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false;