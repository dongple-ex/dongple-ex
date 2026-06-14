-- Dongple security hardening policies
-- Apply this in the Supabase SQL editor after checking the current production schema.
-- This keeps public reads for community content, but prevents admin/private data leaks
-- and removes anonymous "owner" updates that cannot be verified by RLS.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT TRUE
      FROM public.profiles
      WHERE user_id = auth.uid()::TEXT
        AND is_admin = TRUE
      LIMIT 1
    ),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon, authenticated;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.live_status ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "모두에게 읽기 허용" ON public.profiles;
DROP POLICY IF EXISTS "프로필 최초 생성 허용" ON public.profiles;
DROP POLICY IF EXISTS "프로필 본인 수정 허용" ON public.profiles;

CREATE POLICY "profiles select self anonymous or admin"
  ON public.profiles
  FOR SELECT
  USING (
    public.is_admin_user()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
    OR user_id LIKE 'u-%'
  );

CREATE POLICY "profiles insert self or anonymous without private fields"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    (
      user_id LIKE 'u-%'
      AND email IS NULL
      AND provider IS NULL
      AND avatar_url IS NULL
      AND is_admin IS DISTINCT FROM TRUE
    )
    OR (
      auth.uid() IS NOT NULL
      AND user_id = auth.uid()::TEXT
      AND is_admin IS DISTINCT FROM TRUE
    )
  );

CREATE POLICY "profiles update self without admin escalation or admin"
  ON public.profiles
  FOR UPDATE
  USING (
    public.is_admin_user()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  )
  WITH CHECK (
    public.is_admin_user()
    OR (
      auth.uid() IS NOT NULL
      AND user_id = auth.uid()::TEXT
      AND is_admin IS DISTINCT FROM TRUE
    )
  );

DROP POLICY IF EXISTS "모두에게 읽기 허용" ON public.posts;
DROP POLICY IF EXISTS "모두에게 쓰기 허용" ON public.posts;
DROP POLICY IF EXISTS "본인 글 수정 허용" ON public.posts;

CREATE POLICY "posts public read visible"
  ON public.posts
  FOR SELECT
  USING (COALESCE(is_hidden, FALSE) = FALSE OR public.is_admin_user());

CREATE POLICY "posts public insert bounded"
  ON public.posts
  FOR INSERT
  WITH CHECK (
    char_length(COALESCE(content, '')) BETWEEN 2 AND 1200
    AND char_length(COALESCE(title, '')) <= 120
    AND char_length(COALESCE(category, '')) <= 40
    AND (
      user_id IS NULL
      OR user_id LIKE 'u-%'
      OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
    )
    AND COALESCE(is_hidden, FALSE) = FALSE
  );

CREATE POLICY "posts update authenticated owner or admin"
  ON public.posts
  FOR UPDATE
  USING (
    public.is_admin_user()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  )
  WITH CHECK (
    public.is_admin_user()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  );

DROP POLICY IF EXISTS "모두에게 읽기 허용" ON public.live_status;
DROP POLICY IF EXISTS "모두에게 쓰기 허용" ON public.live_status;
DROP POLICY IF EXISTS "본인 상황 수정 허용" ON public.live_status;

CREATE POLICY "live_status public read visible"
  ON public.live_status
  FOR SELECT
  USING (COALESCE(is_hidden, FALSE) = FALSE OR public.is_admin_user());

CREATE POLICY "live_status public insert bounded"
  ON public.live_status
  FOR INSERT
  WITH CHECK (
    char_length(COALESCE(place_name, '')) BETWEEN 1 AND 100
    AND char_length(COALESCE(status, '')) BETWEEN 1 AND 20
    AND char_length(COALESCE(category, '')) <= 40
    AND char_length(COALESCE(message, '')) <= 500
    AND (
      user_id IS NULL
      OR user_id LIKE 'u-%'
      OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
    )
    AND COALESCE(is_hidden, FALSE) = FALSE
  );

CREATE POLICY "live_status update authenticated owner or admin"
  ON public.live_status
  FOR UPDATE
  USING (
    public.is_admin_user()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  )
  WITH CHECK (
    public.is_admin_user()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  );

DROP POLICY IF EXISTS "모두에게 읽기 허용" ON public.post_comments;
DROP POLICY IF EXISTS "모두에게 쓰기 허용" ON public.post_comments;
DROP POLICY IF EXISTS "본인 댓글 수정 허용" ON public.post_comments;

CREATE POLICY "post_comments public read"
  ON public.post_comments
  FOR SELECT
  USING (TRUE);

CREATE POLICY "post_comments public insert bounded"
  ON public.post_comments
  FOR INSERT
  WITH CHECK (
    char_length(COALESCE(content, '')) BETWEEN 1 AND 500
    AND (
      user_id IS NULL
      OR user_id LIKE 'u-%'
      OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
    )
  );

CREATE POLICY "post_comments update authenticated owner or admin"
  ON public.post_comments
  FOR UPDATE
  USING (
    public.is_admin_user()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  )
  WITH CHECK (
    public.is_admin_user()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  );

DROP POLICY IF EXISTS "알림 읽기 허용" ON public.notifications;
DROP POLICY IF EXISTS "알림 읽음 처리 허용" ON public.notifications;
DROP POLICY IF EXISTS "알림 생성 허용" ON public.notifications;

CREATE POLICY "notifications select authenticated recipient or admin"
  ON public.notifications
  FOR SELECT
  USING (
    public.is_admin_user()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  );

CREATE POLICY "notifications update authenticated recipient or admin"
  ON public.notifications
  FOR UPDATE
  USING (
    public.is_admin_user()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  )
  WITH CHECK (
    public.is_admin_user()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  );

CREATE POLICY "notifications insert authenticated bounded"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND char_length(COALESCE(title, '')) BETWEEN 1 AND 80
    AND char_length(COALESCE(content, '')) <= 240
    AND char_length(COALESCE(link_url, '/')) <= 240
    AND link_url LIKE '/%'
    AND link_url NOT LIKE '//%'
  );
