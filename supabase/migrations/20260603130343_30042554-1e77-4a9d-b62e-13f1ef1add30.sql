-- Remove public SELECT policies on user-linkable tables.
-- The app reads these exclusively via server functions using the service role
-- (supabaseAdmin), so RLS-locked tables continue to work and user data stops
-- leaking to anonymous visitors.

DROP POLICY IF EXISTS "public read votes" ON public.votes;
DROP POLICY IF EXISTS "public read reactions" ON public.reactions;
DROP POLICY IF EXISTS "public read poll_votes" ON public.poll_votes;
DROP POLICY IF EXISTS "public read presence" ON public.presence_pings;

-- Revoke direct table grants so anon/authenticated cannot read these via the
-- Data API even if a future permissive policy is added by mistake. Service role
-- retains full access for server-function use.
REVOKE SELECT ON public.votes FROM anon, authenticated;
REVOKE SELECT ON public.reactions FROM anon, authenticated;
REVOKE SELECT ON public.poll_votes FROM anon, authenticated;
REVOKE SELECT ON public.presence_pings FROM anon, authenticated;
GRANT ALL ON public.votes TO service_role;
GRANT ALL ON public.reactions TO service_role;
GRANT ALL ON public.poll_votes TO service_role;
GRANT ALL ON public.presence_pings TO service_role;

-- Tables with RLS enabled but no policies are already locked for anon/auth.
-- Belt-and-suspenders: ensure no leftover grants on sensitive admin tables.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.edit_history FROM anon, authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.moderation_log FROM anon, authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.ip_bindings FROM anon, authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.identities FROM anon, authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.rate_limits FROM anon, authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.reports FROM anon, authenticated;
GRANT ALL ON public.edit_history TO service_role;
GRANT ALL ON public.moderation_log TO service_role;
GRANT ALL ON public.ip_bindings TO service_role;
GRANT ALL ON public.identities TO service_role;
GRANT ALL ON public.rate_limits TO service_role;
GRANT ALL ON public.reports TO service_role;

-- Drop the permissive public-read policy on reports (was created earlier; it's
-- admin-only data and reads happen via service role).
DROP POLICY IF EXISTS "public read reports" ON public.reports;