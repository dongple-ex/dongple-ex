-- 동플(Dongple) 통합 데이터베이스 스키마 정의
-- Supabase SQL Editor에서 실행해주시고, 이미 존재하는 테이블의 경우 필요한 컬럼만 ALTER TABLE로 추가해주세요.

-- 1. 실시간 동네 상황 테이블
CREATE TABLE IF NOT EXISTS public.live_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT, -- TourAPI/events 기준 행사 연결 ID
    place_name TEXT NOT NULL,
    category TEXT NOT NULL,
    user_id TEXT,
    status TEXT NOT NULL, -- 여유, 보통, 혼잡
    status_color TEXT,
    is_request BOOLEAN DEFAULT FALSE,
    verified_count INTEGER DEFAULT 0,
    is_hidden BOOLEAN DEFAULT FALSE, -- 신고 누적으로 인한 숨김 처리
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 hours')
);

ALTER TABLE public.live_status ADD COLUMN IF NOT EXISTS event_id TEXT;
ALTER TABLE public.live_status ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_live_status_event_id ON public.live_status USING btree (event_id);
CREATE INDEX IF NOT EXISTS idx_live_status_user_id ON public.live_status USING btree (user_id);

-- 2. 상황 인증 내역 테이블
CREATE TABLE IF NOT EXISTS public.status_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_id UUID REFERENCES public.live_status(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- 또는 UUID (auth.users 가입 시)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (status_id, user_id)
);

-- 3. 동네 소식 (게시글) 테이블
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    content TEXT NOT NULL,
    post_type TEXT NOT NULL DEFAULT '정보공유',
    category TEXT NOT NULL,
    user_id TEXT, -- UUID에서 TEXT로 변경 (익명 ID u-... 대응용)
    public_id TEXT,
    is_anonymous BOOLEAN DEFAULT TRUE,
    is_hidden BOOLEAN DEFAULT FALSE, -- 신고 누적으로 인한 숨김 처리
    score DECIMAL(3, 2) DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    place_name TEXT,
    address TEXT
);

-- 4. 사용자 프로필 및 평판 테이블
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id TEXT PRIMARY KEY, -- 'u-...' 형식 또는 auth.users의 UUID
    nickname TEXT NOT NULL,
    public_id TEXT UNIQUE,
    email TEXT,
    avatar_url TEXT,
    provider TEXT,
    trust_score NUMERIC(4, 2) NOT NULL DEFAULT 0.50,
    verified_count INTEGER NOT NULL DEFAULT 0,
    posts_count INTEGER NOT NULL DEFAULT 0,
    status_count INTEGER NOT NULL DEFAULT 0,
    badge_level TEXT NOT NULL DEFAULT 'starter',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_public_id ON public.profiles (public_id);
CREATE INDEX IF NOT EXISTS idx_profiles_trust_score ON public.profiles (trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON public.profiles (last_active_at DESC);

-- 5. 신고 내역 테이블
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id TEXT NOT NULL, -- 신고자 ID
    target_id UUID NOT NULL,   -- 신고 대상 소식/상황 ID
    target_type TEXT NOT NULL, -- POST, STATUS
    reason TEXT NOT NULL,      -- 허위 정보, 홍보 등
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (reporter_id, target_id) -- 중복 신고 방지
);

-- 6. RLS(Row Level Security) 설정 및 정책
ALTER TABLE public.live_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 공통 읽기 정책
CREATE POLICY "모두에게 읽기 허용" ON public.live_status FOR SELECT USING (true);
CREATE POLICY "모두에게 읽기 허용" ON public.status_verifications FOR SELECT USING (true);
CREATE POLICY "모두에게 읽기 허용" ON public.posts FOR SELECT USING (true);
CREATE POLICY "모두에게 읽기 허용" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "모두에게 읽기 허용" ON public.reports FOR SELECT USING (true);

-- 공통 쓰기 정책
CREATE POLICY "모두에게 쓰기 허용" ON public.live_status FOR INSERT WITH CHECK (true);
CREATE POLICY "모두에게 쓰기 허용" ON public.status_verifications FOR INSERT WITH CHECK (true);
CREATE POLICY "모두에게 쓰기 허용" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "프로필 최초 생성 허용" ON public.profiles FOR INSERT WITH CHECK (
  user_id LIKE 'u-%'
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
);
CREATE POLICY "프로필 본인 수정 허용" ON public.profiles FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT);
CREATE POLICY "모두에게 쓰기 허용" ON public.reports FOR INSERT WITH CHECK (true);

-- 7. Helper Functions
CREATE OR REPLACE FUNCTION increment_verified_count(status_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.live_status
  SET verified_count = verified_count + 1
  WHERE id = status_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION verify_status_once(p_status_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  inserted_id UUID;
BEGIN
  INSERT INTO public.status_verifications (status_id, user_id)
  VALUES (p_status_id, p_user_id)
  ON CONFLICT (status_id, user_id) DO NOTHING
  RETURNING id INTO inserted_id;

  IF inserted_id IS NOT NULL THEN
    UPDATE public.live_status
    SET verified_count = verified_count + 1
    WHERE id = p_status_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 8. Moderation RPC: 신고 제출 및 자동 블라인드
CREATE OR REPLACE FUNCTION submit_report(
  p_reporter_id TEXT,
  p_target_id UUID,
  p_target_type TEXT,
  p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  v_report_count INTEGER;
  v_author_id TEXT;
  v_already_hidden BOOLEAN;
BEGIN
  -- 1. 신고 삽입
  INSERT INTO public.reports (reporter_id, target_id, target_type, reason)
  VALUES (p_reporter_id, p_target_id, p_target_type, p_reason)
  ON CONFLICT DO NOTHING;

  -- 2. 현재 신고 횟수 확인
  SELECT COUNT(*) INTO v_report_count
  FROM public.reports
  WHERE target_id = p_target_id;

  -- 3. 임계치(5회) 초과 시 처리
  IF v_report_count >= 5 THEN
    IF p_target_type = 'POST' THEN
      SELECT user_id, is_hidden INTO v_author_id, v_already_hidden FROM public.posts WHERE id = p_target_id;
      UPDATE public.posts SET is_hidden = TRUE WHERE id = p_target_id;
    ELSIF p_target_type = 'STATUS' THEN
      SELECT is_hidden INTO v_already_hidden FROM public.live_status WHERE id = p_target_id;
      UPDATE public.live_status SET is_hidden = TRUE WHERE id = p_target_id;
    END IF;

    -- 4. 신뢰 점수 차감
    IF v_already_hidden = FALSE AND v_author_id IS NOT NULL THEN
      UPDATE public.profiles
      SET trust_score = GREATEST(0, trust_score - 0.2)
      WHERE user_id = v_author_id;
    END IF;

    RETURN json_build_object('status', 'hidden', 'count', v_report_count);
  END IF;

  RETURN json_build_object('status', 'reported', 'count', v_report_count);
END;
$$ LANGUAGE plpgsql;

-- 9. TourAPI 관련 테이블
CREATE TABLE IF NOT EXISTS public.events (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    title CHARACTER VARYING(255) NOT NULL,
    content TEXT NULL,
    lat NUMERIC(10, 8) NULL,
    lng NUMERIC(11, 8) NULL,
    trust_score NUMERIC(3, 2) NULL DEFAULT 0.50,
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
    category_code TEXT NULL,
    thumbnail_url TEXT NULL,
    description TEXT NULL,
    address TEXT NULL,
    event_start_date TEXT NULL,
    event_end_date TEXT NULL,
    CONSTRAINT events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_events_lat_lng ON public.events USING btree (lat, lng);

CREATE TABLE IF NOT EXISTS public.events_ext (
    event_id BIGINT REFERENCES public.events(id) ON DELETE CASCADE PRIMARY KEY,
    source TEXT DEFAULT 'TOURAPI',
    ext_id TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.raw_items (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    source TEXT NOT NULL,
    raw_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events_ext ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "모두에게 읽기 허용" ON public.events FOR SELECT USING (true);
CREATE POLICY "모두에게 읽기 허용" ON public.events_ext FOR SELECT USING (true);
CREATE POLICY "모두에게 읽기 허용" ON public.raw_items FOR SELECT USING (true);
-- 7. 소식(게시글) 인터랙션 테이블
-- 댓글 테이블
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id TEXT,
    public_id TEXT, -- 익명 식별자
    content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 좋아요 테이블 (중복 방지)
CREATE TABLE IF NOT EXISTS public.post_likes (
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- 또는 UUID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- RLS 활성화
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "모두에게 읽기 허용" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "모두에게 읽기 허용" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "모두에게 쓰기 허용" ON public.post_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "모두에게 쓰기 허용" ON public.post_likes FOR INSERT WITH CHECK (true);

CREATE POLICY "본인 글 수정 허용" ON public.posts FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  OR user_id LIKE 'u-%'
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  OR user_id LIKE 'u-%'
);

CREATE POLICY "본인 상황 수정 허용" ON public.live_status FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  OR user_id LIKE 'u-%'
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  OR user_id LIKE 'u-%'
);

CREATE POLICY "본인 댓글 수정 허용" ON public.post_comments FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  OR user_id LIKE 'u-%'
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT)
  OR user_id LIKE 'u-%'
);

-- 8. 인터랙션 카운트 증가 RPC
CREATE OR REPLACE FUNCTION increment_like_count(p_post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts
  SET likes_count = likes_count + 1
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_comment_count(p_post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = comments_count + 1
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- 9. 사용자 알림 테이블
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('reply', 'status_response', 'trust', 'place_update', 'system')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  link_url TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- 10. 콘텐츠 모니터링 및 평판 시스템
-- 신고 내역 테이블
CREATE TABLE IF NOT EXISTS public.post_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- 또는 UUID
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

-- RLS 활성화
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "모두에게 읽기 허용" ON public.post_reports FOR SELECT USING (true);
CREATE POLICY "모두에게 쓰기 허용" ON public.post_reports FOR INSERT WITH CHECK (true);

-- 신고 처리 및 신뢰도 자동 감점 RPC
CREATE OR REPLACE FUNCTION report_post(p_post_id UUID, p_user_id TEXT, p_reason TEXT DEFAULT '부적절한 정보')
RETURNS BOOLEAN AS $$
DECLARE
  inserted_id UUID;
BEGIN
  -- 1. 신고 내역 삽입 시도
  INSERT INTO public.post_reports (post_id, user_id, reason)
  VALUES (p_post_id, p_user_id, p_reason)
  ON CONFLICT (post_id, user_id) DO NOTHING
  RETURNING id INTO inserted_id;

  -- 2. 새롭게 신고된 경우에만 score 감점
  IF inserted_id IS NOT NULL THEN
    UPDATE public.posts
    SET score = GREATEST(0.0, score - 0.1)
    WHERE id = p_post_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE; -- 이미 신고함
END;
$$ LANGUAGE plpgsql;
