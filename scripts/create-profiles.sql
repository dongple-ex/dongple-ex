-- 내발문자 사용자 프로필/평판 테이블
-- 실행 위치: Supabase SQL Editor
-- 목적:
-- - public.users 대신 public.profiles를 사용한다.
-- - user_id는 현재 익명 로컬 ID(u-...)와 향후 auth.users UUID를 모두 담을 수 있게 TEXT로 둔다.
-- - 영향력 점수, 신뢰도, 배지, 기여 횟수, 나의 내발문자 확장에 필요한 사용자 축을 제공한다.

CREATE TABLE IF NOT EXISTS public.profiles (
    user_id TEXT PRIMARY KEY,
    id UUID, -- Supabase Auth의 원본 UUID (로그인 시)
    nickname TEXT NOT NULL,
    public_id TEXT UNIQUE,
    email TEXT,
    avatar_url TEXT,
    provider TEXT,
    legacy_anonymous_id TEXT, -- 로그인 전 사용하던 익명 ID 백업
    anonymous_id TEXT, -- 현재 세션의 익명 ID (필요시)
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

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_public_id ON public.profiles (public_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_provider ON public.profiles (provider);
CREATE INDEX IF NOT EXISTS idx_profiles_trust_score ON public.profiles (trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON public.profiles (last_active_at DESC);

-- RLS 설정
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

DROP POLICY IF EXISTS "profiles_update_owner" ON public.profiles;
CREATE POLICY "profiles_update_owner"
ON public.profiles
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT);

-- 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION public.touch_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.touch_profile_updated_at();
