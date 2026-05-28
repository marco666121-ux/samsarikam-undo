
-- Soft delete + edit tracking columns
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS restored_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS restored_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS restored_at timestamptz;

ALTER TABLE public.identities
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS restored_at timestamptz;

-- Edit history: snapshot of every edit
CREATE TABLE IF NOT EXISTS public.edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  prev_state jsonb NOT NULL,
  new_state jsonb NOT NULL,
  editor_id uuid,
  editor_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS edit_history_entity_idx
  ON public.edit_history (entity_type, entity_id, created_at DESC);

GRANT ALL ON public.edit_history TO service_role;
ALTER TABLE public.edit_history ENABLE ROW LEVEL SECURITY;

-- Moderation log: every admin action, undoable
CREATE TABLE IF NOT EXISTS public.moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_label text NOT NULL DEFAULT 'admin',
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  prev_state jsonb,
  new_state jsonb,
  reason text,
  undone_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderation_log_created_idx
  ON public.moderation_log (created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_log_entity_idx
  ON public.moderation_log (entity_type, entity_id, created_at DESC);

GRANT ALL ON public.moderation_log TO service_role;
ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;
