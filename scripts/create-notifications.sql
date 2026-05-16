-- 내발문자 알림 시스템 스키마
-- Supabase SQL Editor에서 실행합니다.
-- 기존 notifications 테이블(body/href/read_at 기반)이 있어도 새 구조로 확장합니다.

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  link_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP POLICY IF EXISTS "notifications_owner_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_owner_update" ON public.notifications;
DROP POLICY IF EXISTS "알림 읽기 허용" ON public.notifications;
DROP POLICY IF EXISTS "알림 읽음 처리 허용" ON public.notifications;
DROP POLICY IF EXISTS "알림 생성 허용" ON public.notifications;

DO $$
DECLARE
  fk_name TEXT;
BEGIN
  FOR fk_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'notifications'
      AND con.contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS %I', fk_name);
  END LOOP;
END $$;

ALTER TABLE public.notifications
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT,
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN title SET NOT NULL;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS link_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'body'
  ) THEN
    EXECUTE 'UPDATE public.notifications SET content = COALESCE(content, body, '''') WHERE content IS NULL';
  ELSE
    UPDATE public.notifications SET content = COALESCE(content, '') WHERE content IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'href'
  ) THEN
    EXECUTE 'UPDATE public.notifications SET link_url = COALESCE(link_url, href, ''/'') WHERE link_url IS NULL';
  ELSE
    UPDATE public.notifications SET link_url = COALESCE(link_url, '/') WHERE link_url IS NULL;
  END IF;

  UPDATE public.notifications
  SET is_read = COALESCE(is_read, read_at IS NOT NULL, FALSE);
END $$;

ALTER TABLE public.notifications
  ALTER COLUMN content SET NOT NULL,
  ALTER COLUMN link_url SET NOT NULL,
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN is_read SET DEFAULT FALSE,
  ALTER COLUMN created_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_type_check'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_type_check
      CHECK (type IN ('reply', 'status_response', 'trust', 'place_update', 'system'))
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (user_id, is_read, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key
  ON public.notifications (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "알림 읽기 허용"
  ON public.notifications
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
    OR user_id LIKE 'u-%'
  );

CREATE POLICY "알림 읽음 처리 허용"
  ON public.notifications
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
    OR user_id LIKE 'u-%'
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
    OR user_id LIKE 'u-%'
  );

CREATE POLICY "알림 생성 허용"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
