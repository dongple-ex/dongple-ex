-- user_id TEXT 단일 축 통합 마이그레이션
-- 목적:
-- - 로그인 사용자는 auth.users.id 문자열을 user_id에 저장합니다.
-- - 익명 사용자는 localStorage 기반 `u-...` 문자열을 user_id에 저장합니다.
-- - 기존 anonymous_id 데이터는 user_id로 흡수한 뒤 anonymous_id 컬럼을 제거합니다.

DO $$
DECLARE
  policy_row RECORD;
BEGIN
  -- user_id 타입 변경을 막는 RLS policy 의존성을 먼저 제거합니다.
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'posts', 'live_status', 'post_comments', 'notifications')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  END LOOP;
END $$;

DO $$
DECLARE
  fk_name TEXT;
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profiles', 'posts', 'live_status', 'post_comments', 'notifications']
  LOOP
    FOR fk_name IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = table_name
        AND con.contype = 'f'
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', table_name, fk_name);
    END LOOP;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL DEFAULT '새 알림',
  content TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '/',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS user_id TEXT;

ALTER TABLE public.live_status
  ADD COLUMN IF NOT EXISTS user_id TEXT;

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS user_id TEXT;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_id TEXT;

ALTER TABLE public.profiles
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.posts
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.live_status
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.post_comments
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE public.notifications
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'posts'
      AND column_name = 'anonymous_id'
  ) THEN
    EXECUTE 'UPDATE public.posts SET user_id = anonymous_id WHERE user_id IS NULL AND anonymous_id IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'live_status'
      AND column_name = 'anonymous_id'
  ) THEN
    EXECUTE 'UPDATE public.live_status SET user_id = anonymous_id WHERE user_id IS NULL AND anonymous_id IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'post_comments'
      AND column_name = 'anonymous_id'
  ) THEN
    EXECUTE 'UPDATE public.post_comments SET user_id = anonymous_id WHERE user_id IS NULL AND anonymous_id IS NOT NULL';
  END IF;
END $$;

ALTER TABLE public.posts DROP COLUMN IF EXISTS anonymous_id;
ALTER TABLE public.live_status DROP COLUMN IF EXISTS anonymous_id;
ALTER TABLE public.post_comments DROP COLUMN IF EXISTS anonymous_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS anonymous_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS legacy_anonymous_id;

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS idx_live_status_user_id ON public.live_status (user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "모두에게 읽기 허용"
  ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "프로필 최초 생성 허용"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    user_id LIKE 'u-%'
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  );

CREATE POLICY "프로필 본인 수정 허용"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT);

CREATE POLICY "모두에게 읽기 허용"
  ON public.posts
  FOR SELECT
  USING (true);

CREATE POLICY "모두에게 쓰기 허용"
  ON public.posts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "본인 글 수정 허용"
  ON public.posts
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
    OR user_id LIKE 'u-%'
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
    OR user_id LIKE 'u-%'
  );

CREATE POLICY "모두에게 읽기 허용"
  ON public.live_status
  FOR SELECT
  USING (true);

CREATE POLICY "모두에게 쓰기 허용"
  ON public.live_status
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "본인 상황 수정 허용"
  ON public.live_status
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
    OR user_id LIKE 'u-%'
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
    OR user_id LIKE 'u-%'
  );

CREATE POLICY "모두에게 읽기 허용"
  ON public.post_comments
  FOR SELECT
  USING (true);

CREATE POLICY "모두에게 쓰기 허용"
  ON public.post_comments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "본인 댓글 수정 허용"
  ON public.post_comments
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
    OR user_id LIKE 'u-%'
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
    OR user_id LIKE 'u-%'
  );

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

-- Supabase 대시보드에서 API schema cache refresh가 필요할 수 있습니다.
