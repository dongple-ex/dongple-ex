-- 내발문자 사용자 프로필/평판 테이블
-- 실행 위치: Supabase SQL Editor
-- 목적:
-- - public.users 대신 public.profiles를 사용한다.
-- - user_id는 현재 익명 로컬 ID(u-...)와 향후 auth.users UUID를 모두 담을 수 있게 TEXT로 둔다.
-- - 영향력 점수, 신뢰도, 배지, 기여 횟수, 나의 내발문자 확장에 필요한 사용자 축을 제공한다.
-- 주의:
-- - 익명 로컬 ID(u-...)는 서버가 소유권을 검증할 수 없으므로 보안 신원으로 쓰지 않는다.
-- - 클라이언트가 직접 trust_score, count류 필드를 수정하지 못하도록 UPDATE 정책은 auth 사용자 본인에게만 연다.
-- - 익명 사용자는 최초 INSERT만 허용하고, 평판/카운트 갱신은 별도 서버/관리자 흐름으로 옮기는 것을 기본값으로 한다.

CREATE TABLE IF NOT EXISTS public.profiles (
    user_id TEXT PRIMARY KEY,
    nickname TEXT NOT NULL,
    public_id TEXT UNIQUE,
    trust_score NUMERIC(4, 2) NOT NULL DEFAULT 0.50,
    verified_count INTEGER NOT NULL DEFAULT 0,
    posts_count INTEGER NOT NULL DEFAULT 0,
    status_count INTEGER NOT NULL DEFAULT 0,
    badge_level TEXT NOT NULL DEFAULT 'starter',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_public_id ON public.profiles (public_id);
CREATE INDEX IF NOT EXISTS idx_profiles_trust_score ON public.profiles (trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON public.profiles (last_active_at DESC);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public"
ON public.profiles
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "profiles_insert_public" ON public.profiles;
CREATE POLICY "profiles_insert_public"
ON public.profiles
FOR INSERT
WITH CHECK (
  user_id LIKE 'u-%'
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
);

DROP POLICY IF EXISTS "profiles_update_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_owner" ON public.profiles;
CREATE POLICY "profiles_update_owner"
ON public.profiles
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT);

CREATE OR REPLACE FUNCTION public.touch_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.touch_profile_updated_at();

CREATE OR REPLACE FUNCTION public.upsert_profile(
  p_user_id TEXT,
  p_nickname TEXT,
  p_public_id TEXT DEFAULT NULL
)
RETURNS public.profiles AS $$
DECLARE
  v_profile public.profiles;
BEGIN
  IF p_user_id IS NULL OR length(trim(p_user_id)) = 0 THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_nickname IS NULL OR length(trim(p_nickname)) = 0 THEN
    RAISE EXCEPTION 'p_nickname is required';
  END IF;

  INSERT INTO public.profiles (user_id, nickname, public_id, last_active_at)
  VALUES (trim(p_user_id), trim(p_nickname), nullif(trim(p_public_id), ''), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE user_id = trim(p_user_id);

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.increment_profile_status_count(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    status_count = status_count + 1,
    last_active_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.increment_profile_posts_count(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    posts_count = posts_count + 1,
    last_active_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.increment_profile_verified_count(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    verified_count = verified_count + 1,
    trust_score = LEAST(2.00, trust_score + 0.03),
    last_active_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.increment_profile_status_count(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_profile_posts_count(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_profile_verified_count(TEXT) FROM PUBLIC, anon, authenticated;
