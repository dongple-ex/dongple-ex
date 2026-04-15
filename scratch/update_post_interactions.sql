-- 1. 댓글 저장 테이블
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID,
    public_id TEXT, -- 익명 식별자
    is_anonymous BOOLEAN DEFAULT TRUE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS 설정
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "모두에게 읽기 허용" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "모두에게 쓰기 허용" ON public.post_comments FOR INSERT WITH CHECK (true);

-- 3. 좋아요 카운트 증가 함수
CREATE OR REPLACE FUNCTION increment_like_count(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts
  SET likes_count = likes_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- 4. 댓글 카운트 증가 함수
CREATE OR REPLACE FUNCTION increment_comment_count(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = comments_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;
